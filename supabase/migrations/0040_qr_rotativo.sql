-- ════════════════════════════════════════════════════════════════
-- Migración: 0040_qr_rotativo.sql  (rama seguridad, 2026-10-20)
--
-- Problema: el QR de la tarjeta codificaba `qr_token`, que ES la sesión de
-- la PWA (cookie taper_qr). Una foto o captura del QR daba acceso a la
-- cuenta del cliente para siempre.
--
-- 1. QR rotativo: la tarjeta muestra `TP1.<numero>.<ventana>.<firma>`,
--    firmado con HMAC-SHA256 y un secreto que solo vive en la base. La
--    ventana dura 30 s; el escáner acepta hasta ~2.5 min de antigüedad
--    (señal lenta en el mostrador). El código solo identifica al cliente
--    ante el staff: no abre sesión.
--      cliente_qr_codigo(token)        → código vigente (anon, sesión propia)
--      get_cliente_by_codigo(codigo)   → ficha del cliente (solo staff)
-- 2. qr_token pasa a ser solo secreto de sesión y no se vuelve a mostrar.
--    Los tokens que ya salieron en QRs viejos se rotan la primera vez que
--    el cliente abre la app (renovar_sesion_cliente, lo llama proxy.ts).
--    El token anterior sigue valiendo 5 min para que las peticiones en
--    vuelo de ese momento no cierren la sesión.
-- 3. regenerar_qr_cliente (panel) = cerrar la sesión del cliente en todos
--    sus teléfonos; también limpia el token anterior.
--
-- Aplicar ANTES de desplegar el código de la rama seguridad (solo agrega:
-- el código actual sigue funcionando con esta migración aplicada).
-- ════════════════════════════════════════════════════════════════

-- ── Secreto de firma (nadie lo lee salvo funciones definer) ──────
create table if not exists public.qr_secreto (
  id      int primary key default 1 check (id = 1),
  secreto bytea not null
);
alter table public.qr_secreto enable row level security;
revoke all on public.qr_secreto from public, anon, authenticated;
insert into public.qr_secreto (id, secreto)
values (1, extensions.gen_random_bytes(32))
on conflict (id) do nothing;

-- ── Columnas de sesión ───────────────────────────────────────────
alter table public.clientes
  add column if not exists sesion_rotada          boolean not null default false,
  add column if not exists qr_token_anterior       text,
  add column if not exists qr_token_anterior_hasta timestamptz;

create index if not exists clientes_qr_token_anterior_idx
  on public.clientes (qr_token_anterior)
  where qr_token_anterior is not null;

-- Nadie del staff necesita leer estas columnas (0035 ya limita clientes por columna).

-- ── Sesión → cliente (token vigente, o el anterior en su gracia) ──
create or replace function public.cliente_id_por_sesion(p_token text)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from clientes
  where coalesce(p_token, '') <> ''
    and (qr_token = p_token
         or (qr_token_anterior = p_token and qr_token_anterior_hasta > now()))
  order by (qr_token = p_token) desc
  limit 1;
$$;
revoke all on function public.cliente_id_por_sesion(text) from public, anon, authenticated;

-- ── Rotación perezosa del token de sesión ────────────────────────
-- Devuelve el token que el teléfono debe guardar en su cookie, o null si
-- el token no es válido. Idempotente: con un token ya rotado devuelve el
-- mismo; con el anterior (dentro de la gracia) devuelve el vigente.
create or replace function public.renovar_sesion_cliente(p_token text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_cliente clientes;
  v_nuevo   text;
begin
  if coalesce(p_token, '') = '' then
    return null;
  end if;

  select * into v_cliente from clientes where qr_token = p_token for update;
  if found then
    if v_cliente.sesion_rotada then
      return v_cliente.qr_token;
    end if;
    v_nuevo := encode(extensions.gen_random_bytes(24), 'hex');
    update clientes
      set qr_token = v_nuevo,
          sesion_rotada = true,
          qr_token_anterior = p_token,
          qr_token_anterior_hasta = now() + interval '5 minutes'
      where id = v_cliente.id;
    return v_nuevo;
  end if;

  select qr_token into v_nuevo from clientes
  where qr_token_anterior = p_token and qr_token_anterior_hasta > now();
  return v_nuevo;
end;
$$;
grant execute on function public.renovar_sesion_cliente(text) to anon, authenticated;

-- ── Firma del código rotativo ────────────────────────────────────
create or replace function public.qr_firma(p_numero bigint, p_ventana bigint)
returns text
language sql
security definer
stable
set search_path = public, extensions
as $$
  select left(encode(extensions.hmac(
    convert_to('TP1.' || p_numero || '.' || p_ventana, 'UTF8'),
    (select secreto from qr_secreto where id = 1),
    'sha256'), 'hex'), 16);
$$;
revoke all on function public.qr_firma(bigint, bigint) from public, anon, authenticated;

-- Código vigente para la sesión del cliente. Devuelve también cuántos
-- segundos le quedan a la ventana para que la tarjeta pida el siguiente.
create or replace function public.cliente_qr_codigo(p_qr_token text)
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_numero  bigint;
  v_epoch   bigint := floor(extract(epoch from now()));
  v_ventana bigint := floor(extract(epoch from now()) / 30);
begin
  select numero into v_numero from clientes
  where id = cliente_id_por_sesion(p_qr_token) and activo;
  if v_numero is null then
    return null;
  end if;
  return json_build_object(
    'codigo', 'TP1.' || v_numero || '.' || v_ventana || '.' || qr_firma(v_numero, v_ventana),
    'vence_en', 30 - (v_epoch % 30));
end;
$$;
grant execute on function public.cliente_qr_codigo(text) to anon, authenticated;

-- Staff: valida el código escaneado y devuelve la ficha (sin qr_token).
-- {error: 'formato'|'vencido'|'firma'|'no_existe'} si no sirve.
create or replace function public.get_cliente_by_codigo(
  p_codigo      text,
  p_sucursal_id uuid default null
)
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_partes  text[];
  v_numero  bigint;
  v_ventana bigint;
  v_actual  bigint := floor(extract(epoch from now()) / 30);
  v_id      uuid;
begin
  if not is_active_staff() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  v_partes := string_to_array(coalesce(p_codigo, ''), '.');
  if array_length(v_partes, 1) <> 4 or v_partes[1] <> 'TP1'
     or v_partes[2] !~ '^\d{1,12}$' or v_partes[3] !~ '^\d{1,12}$'
     or v_partes[4] !~ '^[0-9a-f]{16}$' then
    return json_build_object('error', 'formato');
  end if;
  v_numero  := v_partes[2]::bigint;
  v_ventana := v_partes[3]::bigint;

  -- 5 ventanas atrás (~2.5 min) y 1 adelante por relojes.
  if v_ventana < v_actual - 5 or v_ventana > v_actual + 1 then
    return json_build_object('error', 'vencido');
  end if;
  if qr_firma(v_numero, v_ventana) <> v_partes[4] then
    return json_build_object('error', 'firma');
  end if;

  select id into v_id from clientes where numero = v_numero and activo;
  if v_id is null then
    return json_build_object('error', 'no_existe');
  end if;
  return get_cliente_by_id(v_id, p_sucursal_id);
end;
$$;
revoke all on function public.get_cliente_by_codigo(text, uuid) from public, anon;
grant execute on function public.get_cliente_by_codigo(text, uuid) to authenticated;

-- ── Dashboard del cliente: acepta el token anterior en su gracia ──
-- Misma firma que 0024; solo cambia cómo se encuentra al cliente.
do $$
declare
  v_def text;
begin
  select pg_get_functiondef('public.get_cliente_by_qr(text, uuid)'::regprocedure) into v_def;
  v_def := replace(v_def,
    'select * into v_cliente from clientes where qr_token = p_qr_token;',
    'select * into v_cliente from clientes where id = cliente_id_por_sesion(p_qr_token);');
  if position('cliente_id_por_sesion' in v_def) = 0 then
    raise exception 'get_cliente_by_qr cambió: revisar 0040 a mano';
  end if;
  execute v_def;
end;
$$;

-- ── Panel: "cerrar sesiones" del cliente ─────────────────────────
create or replace function public.regenerar_qr_cliente(p_cliente_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
begin
  if not is_owner_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  update clientes
    set qr_token = encode(extensions.gen_random_bytes(24), 'hex'),
        sesion_rotada = true,
        qr_token_anterior = null,
        qr_token_anterior_hasta = null
    where id = p_cliente_id
    returning qr_token into v_token;

  if v_token is null then
    raise exception 'Cliente no encontrado' using errcode = 'P0001';
  end if;

  return v_token;
end;
$$;
grant execute on function public.regenerar_qr_cliente(uuid) to authenticated;
