-- ════════════════════════════════════════════════════════════════
-- Migración: 0037_telefono_y_login.sql  (auditoría QA 2026-10-19: A5, A17)
--
-- 1. Teléfono normalizado. Se comparaba `trim(texto)`: "5555 1234",
--    "55551234", "5555-1234" y "+502 5555 1234" eran cuentas distintas
--    (duplicados, logins fallidos, wa.me roto). Ahora se guarda solo el
--    número local de 8 dígitos (sin espacios ni +502) vía trigger, y todas
--    las RPC comparan contra el mismo formato.
--    ⚠ Si dos clientes existentes colisionan al normalizar, la migración
--      ABORTA y lista los teléfonos: hay que fusionarlos/corregirlos a mano
--      y volver a correrla. No se pierde nada.
-- 2. login_cliente: la fila se lee con FOR UPDATE (una ráfaga en paralelo
--    ya no se salta el límite de 5 intentos) y el bloqueo escala: 5 min,
--    luego 15, 60 y máx. 24 h por cada tanda de 5 fallos seguidos. Antes
--    eran 5 intentos cada 5 min para siempre (~1440/día).
-- 3. register_cliente: nombre máx. 60 caracteres (spam al staff vía push).
-- Mismas firmas: no requiere cambios de código.
-- ════════════════════════════════════════════════════════════════

create or replace function public.tel_norm(p text)
returns text
language sql
immutable
as $$
  select case
    when length(d) = 11 and left(d, 3) = '502' then substr(d, 4)
    else d
  end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) x;
$$;

-- ── Datos existentes: abortar si normalizar crea duplicados ──────
do $$
declare
  v_dups text;
begin
  select string_agg(n || ' (' || cnt || ')', ', ') into v_dups
  from (
    select tel_norm(telefono) as n, count(*) as cnt
    from clientes group by 1 having count(*) > 1
  ) d;
  if v_dups is not null then
    raise exception 'Teléfonos duplicados al normalizar: %. Corrígelos y vuelve a aplicar 0037.', v_dups;
  end if;
end;
$$;

update clientes set telefono = tel_norm(telefono) where telefono <> tel_norm(telefono);

create or replace function public.clientes_tel_norm()
returns trigger
language plpgsql
as $$
begin
  new.telefono := tel_norm(new.telefono);
  if length(new.telefono) < 8 then
    raise exception 'Teléfono inválido' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists clientes_tel_norm on clientes;
create trigger clientes_tel_norm
  before insert or update of telefono on clientes
  for each row execute function public.clientes_tel_norm();

-- ── RPCs que buscan por teléfono ─────────────────────────────────
create or replace function public.cliente_login_estado(p_telefono text)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select case
    when c.id is null      then 'no_existe'
    when c.pin_hash is null then 'necesita_pin'
    else 'con_pin'
  end
  from (select 1) x
  left join clientes c on c.telefono = tel_norm(p_telefono);
$$;
grant execute on function public.cliente_login_estado(text) to anon, authenticated;

create or replace function public.register_cliente(
  p_nombre   text,
  p_telefono text,
  p_correo   text default null,
  p_pin      text default null
)
returns clientes
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_cliente clientes;
begin
  if coalesce(trim(p_nombre), '') = '' then
    raise exception 'nombre requerido' using errcode = '23514';
  end if;
  if length(trim(p_nombre)) > 60 then
    raise exception 'nombre demasiado largo' using errcode = '23514';
  end if;
  if length(tel_norm(p_telefono)) < 8 then
    raise exception 'telefono requerido' using errcode = '23514';
  end if;
  if p_pin is not null and p_pin !~ '^\d{6}$' then
    raise exception 'El PIN debe tener 6 dígitos' using errcode = '23514';
  end if;

  insert into clientes (nombre, telefono, correo, pin_hash)
  values (
    trim(p_nombre),
    tel_norm(p_telefono),
    nullif(trim(p_correo), ''),
    case when p_pin is null then null else crypt(p_pin, gen_salt('bf')) end
  )
  returning * into v_cliente;

  return v_cliente;
exception
  when unique_violation then
    raise exception 'Ya existe un cliente con ese teléfono' using errcode = 'P0001';
end;
$$;
grant execute on function public.register_cliente(text, text, text, text) to anon, authenticated;

create or replace function public.login_cliente(p_telefono text, p_pin text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_cliente   clientes;
  v_restantes int;
  v_fallos    int;
  v_bloqueo   interval;
begin
  -- FOR UPDATE: intentos en paralelo se serializan y cuentan todos.
  select * into v_cliente from clientes where telefono = tel_norm(p_telefono) for update;

  if v_cliente.id is null then
    return json_build_object('ok', false, 'error', 'no_encontrado');
  end if;
  if v_cliente.pin_hash is null then
    return json_build_object('ok', false, 'error', 'necesita_pin');
  end if;
  if v_cliente.pin_bloqueado_hasta is not null and v_cliente.pin_bloqueado_hasta > now() then
    return json_build_object('ok', false, 'error', 'bloqueado',
      'segundos', ceil(extract(epoch from (v_cliente.pin_bloqueado_hasta - now()))));
  end if;

  if crypt(p_pin, v_cliente.pin_hash) = v_cliente.pin_hash then
    update clientes set pin_intentos = 0, pin_bloqueado_hasta = null where id = v_cliente.id;
    return json_build_object('ok', true, 'qr_token', v_cliente.qr_token);
  end if;

  -- pin_intentos ya no se reinicia al bloquear: acumula fallos seguidos
  -- hasta un acierto, y cada tanda de 5 alarga el bloqueo.
  v_fallos := v_cliente.pin_intentos + 1;
  if v_fallos % 5 = 0 then
    v_bloqueo := case v_fallos / 5
      when 1 then interval '5 minutes'
      when 2 then interval '15 minutes'
      when 3 then interval '1 hour'
      else interval '24 hours'
    end;
    update clientes
      set pin_intentos = v_fallos, pin_bloqueado_hasta = now() + v_bloqueo
      where id = v_cliente.id;
    return json_build_object('ok', false, 'error', 'bloqueado', 'segundos', extract(epoch from v_bloqueo)::int);
  end if;

  update clientes set pin_intentos = v_fallos where id = v_cliente.id;
  v_restantes := 5 - (v_fallos % 5);
  return json_build_object('ok', false, 'error', 'pin_incorrecto', 'restantes', v_restantes);
end;
$$;
grant execute on function public.login_cliente(text, text) to anon, authenticated;
