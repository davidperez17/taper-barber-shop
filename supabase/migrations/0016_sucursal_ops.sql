-- ════════════════════════════════════════════════════════════════
-- Migración: 0016_sucursal_ops.sql  (Fase B — operaciones por sucursal)
-- record_venta, caja e inventario pasan a operar por sucursal.
-- El default de p_sucursal_id = principal mantiene compatibilidad con
-- llamadas viejas y con la cola offline previa a esta fase.
-- ════════════════════════════════════════════════════════════════

-- ── record_venta: +p_sucursal_id ───────────────────────────────
drop function if exists public.record_venta(uuid, uuid, metodo_pago, boolean, jsonb, uuid);

create or replace function public.record_venta(
  p_cliente_id  uuid,
  p_barbero_id  uuid,
  p_metodo      metodo_pago,
  p_canjear     boolean,
  p_items       jsonb,
  p_cupon_id    uuid default null,
  p_sucursal_id uuid default '00000000-0000-0000-0000-000000000001'
)
returns json
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_venta     ventas;
  v_subtotal  numeric(10, 2);
  v_descuento numeric(10, 2) := 0;
  v_cupon     cupones;
  v_staff     uuid;
begin
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'La venta no tiene items' using errcode = '23514';
  end if;

  select id into v_staff from staff where user_id = auth.uid();

  select coalesce(sum((i->>'precio')::numeric * coalesce((i->>'cantidad')::int, 1)), 0)
    into v_subtotal
  from jsonb_array_elements(p_items) i;

  if p_cupon_id is not null then
    select * into v_cupon from cupones where id = p_cupon_id for update;
    if v_cupon.id is null then
      raise exception 'Cupón no encontrado' using errcode = '22023';
    end if;
    v_descuento := cupon_descuento(v_cupon, v_subtotal);
    update cupones set usos = usos + 1 where id = v_cupon.id;
  end if;

  insert into ventas (cliente_id, barbero_id, registrado_por, sucursal_id, total, descuento, cupon_id, metodo_pago, recompensa_canjeada)
  values (p_cliente_id, p_barbero_id, v_staff, p_sucursal_id, v_subtotal - v_descuento, v_descuento, p_cupon_id, p_metodo, coalesce(p_canjear, false))
  returning * into v_venta;

  insert into venta_items (venta_id, tipo, servicio_id, producto_id, nombre, precio, cantidad)
  select
    v_venta.id,
    (i->>'tipo')::item_tipo,
    nullif(i->>'servicio_id', '')::uuid,
    nullif(i->>'producto_id', '')::uuid,
    i->>'nombre',
    (i->>'precio')::numeric,
    coalesce((i->>'cantidad')::int, 1)
  from jsonb_array_elements(p_items) i;

  return json_build_object('id', v_venta.id, 'total', v_venta.total, 'descuento', v_venta.descuento, 'created_at', v_venta.created_at);
end;
$$;
grant execute on function public.record_venta(uuid, uuid, metodo_pago, boolean, jsonb, uuid, uuid) to authenticated;

-- ── Inventario: el movimiento por venta hereda la sucursal del producto ──
create or replace function public.venta_item_descuenta_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock    int;
  v_staff    uuid;
  v_sucursal uuid;
begin
  if new.tipo <> 'producto' or new.producto_id is null then
    return new;
  end if;

  update productos
     set stock = stock - new.cantidad
   where id = new.producto_id and controla_stock
   returning stock, sucursal_id into v_stock, v_sucursal;

  if found then
    select registrado_por into v_staff from ventas where id = new.venta_id;
    insert into inventario_movimientos (producto_id, sucursal_id, tipo, cantidad, venta_id, registrado_por)
    values (new.producto_id, v_sucursal, 'venta', -new.cantidad, new.venta_id, v_staff);
  end if;

  return new;
end;
$$;

-- ── Inventario: movimiento manual guarda la sucursal del producto ──
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
  if v_nuevo < 0 then
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

-- ════════════════════════════════════════════════════════════════
-- Caja por sucursal: resumen, movimientos y cierre filtran por sucursal.
-- ════════════════════════════════════════════════════════════════
create or replace function public.caja_resumen(p_fecha date, p_sucursal_id uuid default '00000000-0000-0000-0000-000000000001')
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not exists (select 1 from staff where user_id = auth.uid() and activo) then
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
        and sucursal_id = p_sucursal_id
    ),
    'egresos', (select coalesce(sum(monto), 0) from caja_movimientos where fecha = p_fecha and tipo = 'egreso' and sucursal_id = p_sucursal_id),
    'ingresos_extra', (select coalesce(sum(monto), 0) from caja_movimientos where fecha = p_fecha and tipo = 'ingreso' and sucursal_id = p_sucursal_id),
    'movimientos', (
      select coalesce(json_agg(json_build_object(
        'id', id, 'tipo', tipo, 'monto', monto, 'motivo', motivo, 'created_at', created_at
      ) order by created_at desc), '[]'::json)
      from caja_movimientos where fecha = p_fecha and sucursal_id = p_sucursal_id
    ),
    'cierre', (select row_to_json(c) from cierres_caja c where c.fecha = p_fecha and c.sucursal_id = p_sucursal_id)
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
  v_staff uuid;
  v_hoy   date := (now() at time zone 'America/Guatemala')::date;
  v_id    uuid;
begin
  select id into v_staff from staff where user_id = auth.uid() and activo;
  if v_staff is null then raise exception 'No autorizado' using errcode = '42501'; end if;
  if p_tipo not in ('egreso', 'ingreso') then raise exception 'Tipo inválido' using errcode = '23514'; end if;
  if p_monto is null or p_monto <= 0 then raise exception 'Monto inválido' using errcode = '23514'; end if;
  if exists (select 1 from cierres_caja where fecha = v_hoy and sucursal_id = p_sucursal_id) then
    raise exception 'La caja del día ya está cerrada' using errcode = 'P0001';
  end if;

  insert into caja_movimientos (tipo, monto, motivo, registrado_por, sucursal_id)
  values (p_tipo, p_monto, nullif(trim(p_motivo), ''), v_staff, p_sucursal_id)
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.caja_movimiento_crear(text, numeric, text, uuid) to authenticated;

-- borrar: la fecha+sucursal salen del propio movimiento.
create or replace function public.caja_movimiento_borrar(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_fecha date; v_sucursal uuid;
begin
  if not exists (select 1 from staff where user_id = auth.uid() and activo) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select fecha, sucursal_id into v_fecha, v_sucursal from caja_movimientos where id = p_id;
  if v_fecha is not null and exists (select 1 from cierres_caja where fecha = v_fecha and sucursal_id = v_sucursal) then
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
  if v_staff is null then raise exception 'No autorizado' using errcode = '42501'; end if;
  if exists (select 1 from cierres_caja where fecha = p_fecha and sucursal_id = p_sucursal_id) then
    raise exception 'La caja de ese día ya está cerrada' using errcode = 'P0001';
  end if;

  select
    coalesce(sum(total) filter (where metodo_pago = 'efectivo'), 0),
    coalesce(sum(total) filter (where metodo_pago = 'tarjeta'), 0),
    coalesce(sum(total) filter (where metodo_pago = 'transferencia'), 0)
    into v_efectivo, v_tarjeta, v_transfer
  from ventas
  where (created_at at time zone 'America/Guatemala')::date = p_fecha
    and sucursal_id = p_sucursal_id;

  select coalesce(sum(monto) filter (where tipo = 'egreso'), 0),
         coalesce(sum(monto) filter (where tipo = 'ingreso'), 0)
    into v_egresos, v_ingresos
  from caja_movimientos where fecha = p_fecha and sucursal_id = p_sucursal_id;

  v_esperado := coalesce(p_fondo_inicial, 0) + v_efectivo + v_ingresos - v_egresos;

  insert into cierres_caja (
    fecha, sucursal_id, fondo_inicial, efectivo_ventas, tarjeta_total, transfer_total,
    ingresos_extra, egresos, efectivo_esperado, efectivo_contado, diferencia, notas, cerrado_por
  ) values (
    p_fecha, p_sucursal_id, coalesce(p_fondo_inicial, 0), v_efectivo, v_tarjeta, v_transfer,
    v_ingresos, v_egresos, v_esperado, coalesce(p_efectivo_contado, 0),
    coalesce(p_efectivo_contado, 0) - v_esperado, nullif(trim(p_notas), ''), v_staff
  ) returning * into v_cierre;

  return row_to_json(v_cierre);
end;
$$;
grant execute on function public.caja_cerrar(date, numeric, numeric, text, uuid) to authenticated;
