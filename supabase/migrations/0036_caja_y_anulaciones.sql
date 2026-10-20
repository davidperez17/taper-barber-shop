-- ════════════════════════════════════════════════════════════════
-- Migración: 0036_caja_y_anulaciones.sql  (auditoría QA 2026-10-19: A4, A8, A13)
--
-- 1. Caja por sucursal de verdad. Los RPC de caja (0016) aceptaban
--    cualquier p_sucursal_id y cualquier fecha: un cajero de A podía leer
--    la facturación histórica de B, cerrar su caja o cerrar días futuros
--    (bloqueando los movimientos de mañana), con montos negativos.
--    Ahora: cajero/barbero → siempre su sucursal; caja_resumen de otro día
--    solo admin/dueño; caja_cerrar solo hasta hoy (GT) y montos ≥ 0;
--    borrar movimiento solo de la propia sucursal.
--    Se borran los overloads viejos de 0008 (sin sucursal) que seguían vivos.
-- 2. venta_anular deshace sus efectos: repone el stock de los productos
--    (movimiento 'ajuste' con el inverso de lo que descontó la venta) y
--    devuelve el uso del cupón. venta_anular/venta_editar se rechazan si la
--    caja de ese día y sucursal ya está cerrada (el arqueo dejaría de cuadrar).
-- 3. inventario_movimiento_crear: con stock negativo (el POS permite vender
--    sin stock) no se podía registrar una entrada parcial. El "no alcanza"
--    solo aplica a salidas.
-- Mismas firmas: no requiere cambios de código.
-- ════════════════════════════════════════════════════════════════

-- ── Helper: sucursal efectiva para operaciones de caja ───────────
-- Trabajadores: la suya, ignorando el parámetro. Dueño/admin: la pedida.
create or replace function public.caja_sucursal_efectiva(p_sucursal_id uuid)
returns uuid
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_staff staff;
begin
  select * into v_staff from staff where user_id = auth.uid() and activo;
  if v_staff.id is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if v_staff.rol in ('cajero', 'barbero') then
    return v_staff.sucursal_id;
  end if;
  return p_sucursal_id;
end;
$$;
revoke all on function public.caja_sucursal_efectiva(uuid) from public, anon;
grant execute on function public.caja_sucursal_efectiva(uuid) to authenticated;

-- ── Overloads viejos de 0008 ─────────────────────────────────────
drop function if exists public.caja_resumen(date);
drop function if exists public.caja_movimiento_crear(text, numeric, text);
drop function if exists public.caja_cerrar(date, numeric, numeric, text);

create or replace function public.caja_resumen(p_fecha date, p_sucursal_id uuid default '00000000-0000-0000-0000-000000000001')
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_suc uuid := caja_sucursal_efectiva(p_sucursal_id);
begin
  -- Días anteriores = histórico de facturación: solo admin/dueño (0014).
  if p_fecha <> (now() at time zone 'America/Guatemala')::date and not is_owner_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  return json_build_object(
    'fecha', p_fecha,
    'ventas', (
      select json_build_object(
        'efectivo', coalesce(sum(total) filter (where metodo_pago = 'efectivo'), 0),
        'tarjeta',  coalesce(sum(total) filter (where metodo_pago = 'tarjeta'), 0),
        'transferencia', coalesce(sum(total) filter (where metodo_pago = 'transferencia'), 0),
        'num', count(*)
      )
      from ventas
      where (created_at at time zone 'America/Guatemala')::date = p_fecha
        and sucursal_id = v_suc
    ),
    'egresos', (select coalesce(sum(monto), 0) from caja_movimientos where fecha = p_fecha and tipo = 'egreso' and sucursal_id = v_suc),
    'ingresos_extra', (select coalesce(sum(monto), 0) from caja_movimientos where fecha = p_fecha and tipo = 'ingreso' and sucursal_id = v_suc),
    'movimientos', (
      select coalesce(json_agg(json_build_object(
        'id', id, 'tipo', tipo, 'monto', monto, 'motivo', motivo, 'created_at', created_at
      ) order by created_at desc), '[]'::json)
      from caja_movimientos where fecha = p_fecha and sucursal_id = v_suc
    ),
    'cierre', (select row_to_json(c) from cierres_caja c where c.fecha = p_fecha and c.sucursal_id = v_suc)
  );
end;
$$;
grant execute on function public.caja_resumen(date, uuid) to authenticated;

create or replace function public.caja_movimiento_crear(
  p_tipo text, p_monto numeric, p_motivo text,
  p_sucursal_id uuid default '00000000-0000-0000-0000-000000000001'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_suc   uuid := caja_sucursal_efectiva(p_sucursal_id);
  v_staff uuid;
  v_hoy   date := (now() at time zone 'America/Guatemala')::date;
  v_id    uuid;
begin
  select id into v_staff from staff where user_id = auth.uid() and activo;
  if p_tipo not in ('egreso', 'ingreso') then raise exception 'Tipo inválido' using errcode = '23514'; end if;
  if p_monto is null or p_monto <= 0 then raise exception 'Monto inválido' using errcode = '23514'; end if;
  if exists (select 1 from cierres_caja where fecha = v_hoy and sucursal_id = v_suc) then
    raise exception 'La caja del día ya está cerrada' using errcode = 'P0001';
  end if;

  insert into caja_movimientos (tipo, monto, motivo, registrado_por, sucursal_id)
  values (p_tipo, p_monto, nullif(trim(p_motivo), ''), v_staff, v_suc)
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.caja_movimiento_crear(text, numeric, text, uuid) to authenticated;

create or replace function public.caja_movimiento_borrar(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fecha date;
  v_suc   uuid;
  v_staff staff;
begin
  select * into v_staff from staff where user_id = auth.uid() and activo;
  if v_staff.id is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select fecha, sucursal_id into v_fecha, v_suc from caja_movimientos where id = p_id;
  if v_fecha is null then
    return;
  end if;
  if v_staff.rol in ('cajero', 'barbero') and v_suc is distinct from v_staff.sucursal_id then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if exists (select 1 from cierres_caja where fecha = v_fecha and sucursal_id = v_suc) then
    raise exception 'La caja de ese día ya está cerrada' using errcode = 'P0001';
  end if;
  delete from caja_movimientos where id = p_id;
end;
$$;
grant execute on function public.caja_movimiento_borrar(uuid) to authenticated;

create or replace function public.caja_cerrar(
  p_fecha date, p_fondo_inicial numeric, p_efectivo_contado numeric, p_notas text,
  p_sucursal_id uuid default '00000000-0000-0000-0000-000000000001'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_suc       uuid := caja_sucursal_efectiva(p_sucursal_id);
  v_staff     uuid;
  v_efectivo  numeric := 0;
  v_tarjeta   numeric := 0;
  v_transfer  numeric := 0;
  v_egresos   numeric := 0;
  v_ingresos  numeric := 0;
  v_esperado  numeric;
  v_cierre    cierres_caja;
begin
  select id into v_staff from staff where user_id = auth.uid() and activo;
  if p_fecha > (now() at time zone 'America/Guatemala')::date then
    raise exception 'No se puede cerrar la caja de un día futuro' using errcode = '22023';
  end if;
  if coalesce(p_fondo_inicial, 0) < 0 or coalesce(p_efectivo_contado, 0) < 0 then
    raise exception 'Montos inválidos' using errcode = '22023';
  end if;
  if exists (select 1 from cierres_caja where fecha = p_fecha and sucursal_id = v_suc) then
    raise exception 'La caja de ese día ya está cerrada' using errcode = 'P0001';
  end if;

  select
    coalesce(sum(total) filter (where metodo_pago = 'efectivo'), 0),
    coalesce(sum(total) filter (where metodo_pago = 'tarjeta'), 0),
    coalesce(sum(total) filter (where metodo_pago = 'transferencia'), 0)
    into v_efectivo, v_tarjeta, v_transfer
  from ventas
  where (created_at at time zone 'America/Guatemala')::date = p_fecha
    and sucursal_id = v_suc;

  select coalesce(sum(monto) filter (where tipo = 'egreso'), 0),
         coalesce(sum(monto) filter (where tipo = 'ingreso'), 0)
    into v_egresos, v_ingresos
  from caja_movimientos where fecha = p_fecha and sucursal_id = v_suc;

  v_esperado := coalesce(p_fondo_inicial, 0) + v_efectivo + v_ingresos - v_egresos;

  insert into cierres_caja (
    fecha, sucursal_id, fondo_inicial, efectivo_ventas, tarjeta_total, transfer_total,
    ingresos_extra, egresos, efectivo_esperado, efectivo_contado, diferencia, notas, cerrado_por
  ) values (
    p_fecha, v_suc, coalesce(p_fondo_inicial, 0), v_efectivo, v_tarjeta, v_transfer,
    v_ingresos, v_egresos, v_esperado, coalesce(p_efectivo_contado, 0),
    coalesce(p_efectivo_contado, 0) - v_esperado, nullif(trim(p_notas), ''), v_staff
  ) returning * into v_cierre;

  return row_to_json(v_cierre);
end;
$$;
grant execute on function public.caja_cerrar(date, numeric, numeric, text, uuid) to authenticated;

-- ── Anular / editar venta ────────────────────────────────────────
create or replace function public.venta_caja_cerrada(p_venta ventas)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from cierres_caja
    where sucursal_id = p_venta.sucursal_id
      and fecha = (p_venta.created_at at time zone 'America/Guatemala')::date
  );
$$;

create or replace function public.venta_anular(p_venta_id uuid, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff uuid;
  v_row   ventas;
  m       record;
begin
  if not is_owner_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select id into v_staff from staff where user_id = auth.uid();
  select * into v_row from ventas where id = p_venta_id for update;
  if not found then
    raise exception 'Venta no encontrada';
  end if;
  if venta_caja_cerrada(v_row) then
    raise exception 'La caja de ese día ya está cerrada: no se puede anular la venta' using errcode = 'P0001';
  end if;

  insert into ventas_anuladas (id, cliente_id, sucursal_id, total, motivo, snapshot, anulada_por)
  values (
    v_row.id, v_row.cliente_id, v_row.sucursal_id, v_row.total, p_motivo,
    jsonb_build_object(
      'venta', to_jsonb(v_row),
      'items', (select coalesce(jsonb_agg(to_jsonb(vi)), '[]'::jsonb) from venta_items vi where vi.venta_id = v_row.id)
    ),
    v_staff
  );

  -- Reponer stock: el inverso exacto de lo que la venta descontó.
  for m in
    select producto_id, sucursal_id, sum(cantidad) as cantidad
    from inventario_movimientos
    where venta_id = v_row.id and tipo = 'venta'
    group by producto_id, sucursal_id
  loop
    update productos set stock = stock - m.cantidad where id = m.producto_id;
    insert into inventario_movimientos (producto_id, sucursal_id, tipo, cantidad, motivo, registrado_por)
    values (m.producto_id, m.sucursal_id, 'ajuste', -m.cantidad, 'Anulación de venta', v_staff);
  end loop;

  -- Devolver el uso del cupón.
  if v_row.cupon_id is not null then
    update cupones set usos = greatest(usos - 1, 0) where id = v_row.cupon_id;
  end if;

  delete from ventas where id = p_venta_id;  -- cascade borra venta_items
end;
$$;
grant execute on function public.venta_anular(uuid, text) to authenticated;

create or replace function public.venta_editar(
  p_venta_id   uuid,
  p_total      numeric,
  p_metodo     metodo_pago,
  p_barbero_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row ventas;
begin
  if not is_owner_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_total < 0 then
    raise exception 'Total inválido';
  end if;
  select * into v_row from ventas where id = p_venta_id for update;
  if not found then
    raise exception 'Venta no encontrada';
  end if;
  if venta_caja_cerrada(v_row) then
    raise exception 'La caja de ese día ya está cerrada: no se puede editar la venta' using errcode = 'P0001';
  end if;
  update ventas
     set total = p_total, metodo_pago = p_metodo, barbero_id = p_barbero_id
   where id = p_venta_id;
end;
$$;
grant execute on function public.venta_editar(uuid, numeric, metodo_pago, uuid) to authenticated;

-- ── Inventario: entrada con stock negativo ───────────────────────
create or replace function public.inventario_movimiento_crear(
  p_producto_id uuid,
  p_tipo        text,
  p_cantidad    int,
  p_motivo      text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff uuid;
  v_prod  productos;
  v_delta int;
  v_nuevo int;
begin
  if not is_owner_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select id into v_staff from staff where user_id = auth.uid();

  select * into v_prod from productos where id = p_producto_id for update;
  if v_prod.id is null then
    raise exception 'Producto no encontrado' using errcode = '22023';
  end if;
  if not v_prod.controla_stock then
    raise exception 'Este producto no controla stock' using errcode = '22023';
  end if;

  if p_tipo = 'entrada' then
    if p_cantidad <= 0 then raise exception 'Cantidad inválida' using errcode = '22023'; end if;
    v_delta := p_cantidad;
  elsif p_tipo = 'salida' then
    if p_cantidad <= 0 then raise exception 'Cantidad inválida' using errcode = '22023'; end if;
    v_delta := -p_cantidad;
  elsif p_tipo = 'ajuste' then
    if p_cantidad < 0 then raise exception 'Cantidad inválida' using errcode = '22023'; end if;
    v_delta := p_cantidad - v_prod.stock;
  else
    raise exception 'Tipo de movimiento inválido' using errcode = '22023';
  end if;

  v_nuevo := v_prod.stock + v_delta;
  -- Solo una salida puede dejar el stock en negativo; una entrada que no
  -- alcanza a cubrir lo vendido sin stock sí debe registrarse.
  if p_tipo = 'salida' and v_nuevo < 0 then
    raise exception 'No hay stock suficiente' using errcode = '22023';
  end if;

  if v_delta <> 0 then
    update productos set stock = v_nuevo where id = p_producto_id;
    insert into inventario_movimientos (producto_id, sucursal_id, tipo, cantidad, motivo, registrado_por)
    values (p_producto_id, v_prod.sucursal_id, p_tipo, v_delta, p_motivo, v_staff);
  end if;

  return json_build_object('ok', true, 'stock', v_nuevo);
end;
$$;
grant execute on function public.inventario_movimiento_crear(uuid, text, int, text) to authenticated;
