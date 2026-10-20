-- ════════════════════════════════════════════════════════════════
-- Migración: 0035_seguridad_rls.sql  (auditoría QA 2026-10-19: A1, A2, A3, M14, M17)
-- Cierra huecos de RLS/grants encontrados en la auditoría de seguridad.
--
-- ORDEN DE DEPLOY: aplicar DESPUÉS de desplegar el código de la rama qa
-- (ficha y POS ya no leen clientes.qr_token; usan get_cliente_by_id).
-- Con el código viejo la ficha del cliente fallaría tras el revoke.
--
-- 1. ventas / venta_items: las policies de escritura de 0001 seguían
--    vivas → un cajero podía insertar ventas e ítems directo por PostgREST
--    (sellos falsos sin pasar por record_venta). Toda escritura va por RPC
--    definer (record_venta, venta_anular, venta_editar), así que se borran.
-- 2. clientes: el staff leía y editaba qr_token / pin_hash → podía
--    suplantar a cualquier cliente en la PWA o resetearle el PIN. Ahora
--    grants por columna: sin acceso a credenciales. get_cliente_by_id
--    (definer) reemplaza el camino "leer qr_token → get_cliente_by_qr".
-- 3. cliente_loyalty: vista sin security_invoker (corre como owner y salta
--    RLS) con privilegios por defecto para anon → cualquiera con la anon
--    key listaba clientes/sellos. Se revoca a anon/public; el staff la
--    sigue leyendo (POS/lista dependen de que salte la RLS de ventas).
-- 4. sucursales / cuenta: el dueño (o una sesión robada) podía hacer DELETE
--    por API y borrar en cascada toda la facturación de una sucursal, o
--    subir max_sucursales. Sin delete, cuenta solo lectura, FKs de
--    historial en RESTRICT y el límite de sucursales activas en la DB.
-- 5. reset_cliente_pin / regenerar_qr_cliente: chequeaban rol pero no
--    `activo` → un admin desactivado con sesión viva seguía operando.
-- ════════════════════════════════════════════════════════════════

-- ── 1. Escritura directa de ventas ───────────────────────────────
drop policy if exists ventas_insert      on ventas;
drop policy if exists ventas_update      on ventas;
drop policy if exists venta_items_insert on venta_items;

-- ── 2. Credenciales de clientes fuera del alcance del staff ──────
revoke select, update on clientes from anon, authenticated;
grant select (id, numero, nombre, telefono, correo, created_at, activo) on clientes to authenticated;
grant update (nombre, telefono, correo, activo) on clientes to authenticated;

-- Dashboard de un cliente por id para el staff (ficha y POS): mismo JSON
-- que get_cliente_by_qr pero sin qr_token, + total invertido histórico
-- (el historial viene limitado a 50 ventas) + si ya tiene PIN.
create or replace function public.get_cliente_by_id(
  p_cliente_id  uuid,
  p_sucursal_id uuid default null
)
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_token text;
  v_dash  jsonb;
begin
  if not is_active_staff() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select qr_token into v_token from clientes where id = p_cliente_id;
  if v_token is null then
    return null;
  end if;
  v_dash := get_cliente_by_qr(v_token, p_sucursal_id)::jsonb;
  return (
    (v_dash #- '{cliente,qr_token}')
    || jsonb_build_object(
         'total_invertido', (select coalesce(sum(total), 0) from ventas where cliente_id = p_cliente_id),
         -- La ficha decide si ofrece "código de activación" (sin PIN) o "reiniciar PIN".
         'tiene_pin', (select pin_hash is not null from clientes where id = p_cliente_id))
  )::json;
end;
$$;
revoke all on function public.get_cliente_by_id(uuid, uuid) from public, anon;
grant execute on function public.get_cliente_by_id(uuid, uuid) to authenticated;

-- ── 3. Vista de lealtad: nada para anon ──────────────────────────
revoke all on cliente_loyalty from anon, public;
grant select on cliente_loyalty to authenticated;

-- ── 4. Sucursales y cuenta ───────────────────────────────────────
drop policy if exists sucursales_write on sucursales;
create policy sucursales_insert on sucursales for insert with check (is_owner());
create policy sucursales_update on sucursales for update using (is_owner()) with check (is_owner());
-- (sin policy de delete: desactivar, nunca borrar)

drop policy if exists cuenta_write on cuenta;
-- (cuenta: solo lectura para el staff; el plan se cambia con service-role)

-- Historial de dinero nunca se borra en cascada con la sucursal.
do $$
declare
  r record;
begin
  for r in
    select c.conname, c.conrelid::regclass as tabla
    from pg_constraint c
    where c.contype = 'f'
      and c.confrelid = 'public.sucursales'::regclass
      and c.conrelid in ('public.ventas'::regclass, 'public.caja_movimientos'::regclass,
                         'public.cierres_caja'::regclass, 'public.inventario_movimientos'::regclass)
  loop
    execute format('alter table %s drop constraint %I', r.tabla, r.conname);
    execute format(
      'alter table %s add constraint %I foreign key (sucursal_id) references sucursales (id) on delete restrict',
      r.tabla, r.conname);
  end loop;
end;
$$;

-- Límite de sucursales activas del plan, en la DB (antes solo en la app).
create or replace function public.sucursales_guard_limite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max int;
begin
  if new.activo then
    select max_sucursales into v_max from cuenta where id = 1;
    if v_max is not null and (select count(*) from sucursales where activo and id <> new.id) >= v_max then
      raise exception 'Tu plan permite % sucursales activas', v_max using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists sucursales_limite on sucursales;
create trigger sucursales_limite
  before insert or update of activo on sucursales
  for each row execute function public.sucursales_guard_limite();

-- ── 5. Acciones de admin exigen staff activo ─────────────────────
create or replace function public.reset_cliente_pin(p_cliente_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_owner_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  update clientes
    set pin_hash = null, pin_intentos = 0, pin_bloqueado_hasta = null
    where id = p_cliente_id;
end;
$$;
grant execute on function public.reset_cliente_pin(uuid) to authenticated;

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
    set qr_token = encode(extensions.gen_random_bytes(12), 'hex')
    where id = p_cliente_id
    returning qr_token into v_token;

  if v_token is null then
    raise exception 'Cliente no encontrado' using errcode = 'P0001';
  end if;

  return v_token;
end;
$$;
grant execute on function public.regenerar_qr_cliente(uuid) to authenticated;
