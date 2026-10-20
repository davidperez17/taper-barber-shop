-- ════════════════════════════════════════════════════════════════
-- Migración: 0038_pin_activacion.sql  (auditoría QA 2026-10-19: C2)
-- Requiere 0037 (tel_norm).
--
-- Hueco: una cuenta sin PIN (alta en mostrador antes del cambio, o PIN
-- reseteado) la reclamaba cualquiera que supiera el teléfono:
-- set_cliente_pin era anónimo y solo pedía teléfono + PIN nuevo → obtenía
-- la sesión (qr_token), veía los datos del cliente y podía canjear su corte
-- gratis; el dueño real quedaba fuera.
--
-- Ahora configurar el PIN exige un CÓDIGO DE ACTIVACIÓN de 6 dígitos que el
-- staff genera en la ficha del cliente (prueba de que la persona está en
-- el mostrador o habló con la barbería). Vence a los 30 minutos y es de un
-- solo uso; 5 códigos erróneos lo invalidan.
--   · Cliente sin PIN: cualquier staff activo puede generar el código.
--   · Cliente con PIN: generar código = resetear su PIN → solo admin/dueño
--     (mismo criterio que reset_cliente_pin).
-- La alta en mostrador ya exige PIN (registrarClienteAdmin), así que el
-- código solo hace falta para cuentas viejas y resets.
--
-- set_cliente_pin cambia de firma (+p_codigo) y devuelve null si el código
-- es incorrecto (qr_token si todo bien; errores de estado lanzan P0001). El código (crearPin) manda
-- p_codigo y, si la base aún no tiene esta migración, cae a la firma vieja.
-- ════════════════════════════════════════════════════════════════

alter table clientes
  add column if not exists pin_codigo_hash   text,
  add column if not exists pin_codigo_expira timestamptz,
  add column if not exists pin_codigo_fallos int not null default 0;
-- (sin grants de columna: el staff no las lee; ver 0035)

create or replace function public.generar_codigo_pin(p_cliente_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_cliente clientes;
  v_codigo  text;
  v_bytes   bytea;
begin
  if not is_active_staff() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select * into v_cliente from clientes where id = p_cliente_id for update;
  if v_cliente.id is null then
    raise exception 'Cliente no encontrado' using errcode = 'P0001';
  end if;
  if v_cliente.pin_hash is not null and not is_owner_admin() then
    raise exception 'Solo un admin puede restablecer el PIN de una cuenta que ya tiene' using errcode = '42501';
  end if;

  -- Aleatorio criptográfico (random() es predecible).
  v_bytes  := gen_random_bytes(3);
  v_codigo := lpad(((get_byte(v_bytes, 0) * 65536 + get_byte(v_bytes, 1) * 256 + get_byte(v_bytes, 2)) % 1000000)::text, 6, '0');
  update clientes
     set pin_hash = null,
         pin_intentos = 0,
         pin_bloqueado_hasta = null,
         pin_codigo_hash = crypt(v_codigo, gen_salt('bf')),
         pin_codigo_expira = now() + interval '30 minutes',
         pin_codigo_fallos = 0
   where id = p_cliente_id;
  return v_codigo;
end;
$$;
revoke all on function public.generar_codigo_pin(uuid) from public, anon;
grant execute on function public.generar_codigo_pin(uuid) to authenticated;

drop function if exists public.set_cliente_pin(text, text);

create or replace function public.set_cliente_pin(p_telefono text, p_pin text, p_codigo text)
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

  select * into v_cliente from clientes where telefono = tel_norm(p_telefono) for update;
  if v_cliente.id is null then
    raise exception 'Cuenta no encontrada' using errcode = 'P0001';
  end if;
  if v_cliente.pin_hash is not null then
    raise exception 'La cuenta ya tiene PIN' using errcode = 'P0001';
  end if;
  if v_cliente.pin_codigo_hash is null or v_cliente.pin_codigo_expira < now() then
    raise exception 'Código de activación vencido o inexistente' using errcode = 'P0001';
  end if;
  if crypt(coalesce(p_codigo, ''), v_cliente.pin_codigo_hash) <> v_cliente.pin_codigo_hash then
    -- 5 códigos erróneos invalidan el código (hay que pedir otro).
    -- Se devuelve null en vez de lanzar: un raise desharía este update.
    update clientes
       set pin_codigo_fallos = pin_codigo_fallos + 1,
           pin_codigo_hash = case when pin_codigo_fallos + 1 >= 5 then null else pin_codigo_hash end
     where id = v_cliente.id;
    return null;
  end if;

  update clientes
    set pin_hash = crypt(p_pin, gen_salt('bf')),
        pin_intentos = 0,
        pin_bloqueado_hasta = null,
        pin_codigo_hash = null,
        pin_codigo_expira = null,
        pin_codigo_fallos = 0
    where id = v_cliente.id;

  return v_cliente.qr_token;
end;
$$;
grant execute on function public.set_cliente_pin(text, text, text) to anon, authenticated;
