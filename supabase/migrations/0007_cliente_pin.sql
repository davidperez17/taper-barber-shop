-- ════════════════════════════════════════════════════════════════
-- Migración: 0007_cliente_pin.sql
-- Login de cliente con PIN de 6 dígitos (2º factor sobre el teléfono).
-- - pin_hash: bcrypt vía pgcrypto (nunca texto plano).
-- - Lockout: 5 intentos fallidos → bloqueo 5 min.
-- - Clientes existentes (pin_hash null) configuran su PIN al próximo ingreso.
-- - Recuperación: staff (dueño/admin) resetea el PIN desde el CRM.
-- ════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

alter table clientes
  add column if not exists pin_hash text,
  add column if not exists pin_intentos int not null default 0,
  add column if not exists pin_bloqueado_hasta timestamptz;

-- ── Estado de login (paso 1): decide si pedir PIN o configurarlo ──
-- Devuelve: 'no_existe' | 'necesita_pin' | 'con_pin'.
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
  left join clientes c on c.telefono = trim(p_telefono);
$$;
grant execute on function public.cliente_login_estado(text) to anon, authenticated;

-- ── Registro nuevo con PIN ───────────────────────────────────────
-- p_pin opcional: null cuando lo registra el staff (el cliente lo pone luego).
drop function if exists public.register_cliente(text, text, text);
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
  if coalesce(trim(p_telefono), '') = '' then
    raise exception 'telefono requerido' using errcode = '23514';
  end if;
  if p_pin is not null and p_pin !~ '^\d{6}$' then
    raise exception 'El PIN debe tener 6 dígitos' using errcode = '23514';
  end if;

  insert into clientes (nombre, telefono, correo, pin_hash)
  values (
    trim(p_nombre),
    trim(p_telefono),
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

-- ── Configurar PIN en cuenta sin PIN (migración de existentes) ────
-- Solo funciona si aún no tiene PIN (no puede sobrescribir uno existente).
-- Devuelve el qr_token para abrir sesión tras configurarlo.
create or replace function public.set_cliente_pin(p_telefono text, p_pin text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_cliente clientes;
begin
  if p_pin !~ '^\d{6}$' then
    raise exception 'El PIN debe tener 6 dígitos' using errcode = '23514';
  end if;

  select * into v_cliente from clientes where telefono = trim(p_telefono);
  if v_cliente.id is null then
    raise exception 'Cuenta no encontrada' using errcode = 'P0001';
  end if;
  if v_cliente.pin_hash is not null then
    raise exception 'La cuenta ya tiene PIN' using errcode = 'P0001';
  end if;

  update clientes
    set pin_hash = crypt(p_pin, gen_salt('bf')),
        pin_intentos = 0,
        pin_bloqueado_hasta = null
    where id = v_cliente.id;

  return v_cliente.qr_token;
end;
$$;
grant execute on function public.set_cliente_pin(text, text) to anon, authenticated;

-- ── Login con teléfono + PIN (paso 2), con lockout ───────────────
drop function if exists public.login_cliente(text);
create or replace function public.login_cliente(p_telefono text, p_pin text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_cliente clientes;
  v_restantes int;
begin
  select * into v_cliente from clientes where telefono = trim(p_telefono);

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

  -- Fallo: incrementar intentos; bloquear a los 5.
  if v_cliente.pin_intentos + 1 >= 5 then
    update clientes
      set pin_intentos = 0, pin_bloqueado_hasta = now() + interval '5 minutes'
      where id = v_cliente.id;
    return json_build_object('ok', false, 'error', 'bloqueado', 'segundos', 300);
  end if;

  update clientes set pin_intentos = pin_intentos + 1 where id = v_cliente.id;
  v_restantes := 5 - (v_cliente.pin_intentos + 1);
  return json_build_object('ok', false, 'error', 'pin_incorrecto', 'restantes', v_restantes);
end;
$$;
grant execute on function public.login_cliente(text, text) to anon, authenticated;

-- ── Reset de PIN por staff (dueño/admin) ─────────────────────────
create or replace function public.reset_cliente_pin(p_cliente_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from staff where user_id = auth.uid() and rol in ('dueno', 'admin')
  ) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  update clientes
    set pin_hash = null, pin_intentos = 0, pin_bloqueado_hasta = null
    where id = p_cliente_id;
end;
$$;
grant execute on function public.reset_cliente_pin(uuid) to authenticated;
