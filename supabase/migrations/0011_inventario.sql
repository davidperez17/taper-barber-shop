-- ════════════════════════════════════════════════════════════════
-- Migración: 0011_inventario.sql
-- Inventario de productos (los servicios no llevan stock).
-- - productos: stock actual, umbral de alerta y flag de control.
-- - inventario_movimientos: bitácora de entradas/salidas/ajustes/ventas.
-- - Trigger en venta_items: descuenta stock al vender un producto (definer,
--   así funciona aunque venda un cajero sin permiso de escritura en productos).
-- - inventario_movimiento_crear: entradas/salidas/ajustes manuales (admin/dueño).
-- - dashboard_metrics: se añade el conteo de productos bajo stock.
-- ════════════════════════════════════════════════════════════════

alter table productos add column if not exists stock          int     not null default 0;
alter table productos add column if not exists stock_min      int     not null default 0 check (stock_min >= 0);
alter table productos add column if not exists controla_stock boolean not null default true;

create table if not exists inventario_movimientos (
  id             uuid primary key default extensions.gen_random_uuid(),
  producto_id    uuid not null references productos (id) on delete cascade,
  tipo           text not null check (tipo in ('entrada', 'salida', 'ajuste', 'venta')),
  cantidad       int  not null check (cantidad <> 0),  -- delta con signo aplicado al stock (+ entrada, − salida/venta)
  motivo         text,
  venta_id       uuid references ventas (id) on delete set null,
  registrado_por uuid references staff (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists inv_mov_producto_idx on inventario_movimientos (producto_id, created_at desc);

-- ── RLS: lectura para staff activo; escritura solo vía RPC/trigger definer ──
alter table inventario_movimientos enable row level security;

create policy inv_mov_read on inventario_movimientos for select to authenticated
  using (exists (select 1 from staff s where s.user_id = auth.uid() and s.activo));

-- ════════════════════════════════════════════════════════════════
-- Trigger: descontar stock al insertar un ítem de venta tipo producto.
-- security definer → salta la RLS de productos (un cajero puede vender).
-- ════════════════════════════════════════════════════════════════
create or replace function public.venta_item_descuenta_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock int;
  v_staff uuid;
begin
  if new.tipo <> 'producto' or new.producto_id is null then
    return new;
  end if;

  update productos
     set stock = stock - new.cantidad
   where id = new.producto_id and controla_stock
   returning stock into v_stock;

  if found then
    select registrado_por into v_staff from ventas where id = new.venta_id;
    insert into inventario_movimientos (producto_id, tipo, cantidad, venta_id, registrado_por)
    values (new.producto_id, 'venta', -new.cantidad, new.venta_id, v_staff);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_venta_item_stock on venta_items;
create trigger trg_venta_item_stock
  after insert on venta_items
  for each row execute function public.venta_item_descuenta_stock();

-- ════════════════════════════════════════════════════════════════
-- RPC: movimiento manual de inventario (admin/dueño).
-- entrada/salida → p_cantidad es magnitud positiva.
-- ajuste        → p_cantidad es el stock físico contado (absoluto).
-- ════════════════════════════════════════════════════════════════
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
    insert into inventario_movimientos (producto_id, tipo, cantidad, motivo, registrado_por)
    values (p_producto_id, p_tipo, v_delta, p_motivo, v_staff);
  end if;

  return json_build_object('ok', true, 'stock', v_nuevo);
end;
$$;
grant execute on function public.inventario_movimiento_crear(uuid, text, int, text) to authenticated;

-- ════════════════════════════════════════════════════════════════
-- dashboard_metrics: se recrea añadiendo productos_bajo_stock.
-- ════════════════════════════════════════════════════════════════
create or replace function public.dashboard_metrics()
returns json
language sql
security invoker
stable
set search_path = public
as $$
  select json_build_object(
    'ventas_hoy',         (select coalesce(sum(total), 0) from ventas where created_at::date = current_date),
    'num_ventas_hoy',     (select count(*) from ventas where created_at::date = current_date),
    'ventas_mes',         (select coalesce(sum(total), 0) from ventas where date_trunc('month', created_at) = date_trunc('month', now())),
    'ticket_promedio',    (select coalesce(round(avg(total), 2), 0) from ventas where date_trunc('month', created_at) = date_trunc('month', now())),
    'clientes_total',     (select count(*) from clientes),
    'clientes_activos',   (select count(distinct cliente_id) from ventas where created_at >= now() - interval '30 days'),
    'clientes_inactivos', (select count(*) from clientes c where not exists (
                             select 1 from ventas v where v.cliente_id = c.id and v.created_at >= now() - interval '30 days')),
    'productos_bajo_stock', (select count(*) from productos where activo and controla_stock and stock <= stock_min),
    'top_servicios',      (select coalesce(json_agg(t), '[]'::json) from (
                             select nombre, count(*) as n from venta_items where tipo = 'servicio'
                             group by nombre order by n desc limit 5) t),
    'top_productos',      (select coalesce(json_agg(t), '[]'::json) from (
                             select nombre, count(*) as n from venta_items where tipo = 'producto'
                             group by nombre order by n desc limit 5) t),
    'top_barbero',        (select b.nombre from ventas v join barberos b on b.id = v.barbero_id
                             where v.created_at >= now() - interval '30 days'
                             group by b.nombre order by count(*) desc limit 1)
  );
$$;
grant execute on function public.dashboard_metrics() to authenticated;
