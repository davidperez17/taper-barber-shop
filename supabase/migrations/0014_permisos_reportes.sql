-- ════════════════════════════════════════════════════════════════
-- Migración: 0014_permisos_reportes.sql
-- Cierra un hueco de permisos: reportes/dashboard/heatmap eran
-- `security invoker` y `ventas`/`venta_items` eran legibles por todo staff
-- activo. Es decir, un cajero/barbero podía leer facturación por API aunque
-- la UI le oculte esas páginas (solo admin/dueño).
--
-- Fix:
-- 1) Los RPC de reporte/métricas pasan a `security definer` con guarda
--    is_owner_admin() → solo admin/dueño, y "No autorizado" explícito.
-- 2) Lectura directa de ventas/venta_items se restringe a admin/dueño.
--    Seguro: el único flujo de todo-staff que toca ventas es la vista
--    `cliente_loyalty` (corre como owner → salta RLS) y los RPC definer
--    (get_cliente_by_qr, caja_resumen). Nadie lee esas tablas directo bajo
--    la RLS del que llama (verificado en el código).
-- ════════════════════════════════════════════════════════════════

-- ── 1) Reportes y métricas: definer + solo admin/dueño ──────────
create or replace function public.reporte_ventas(p_desde date, p_hasta date)
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not is_owner_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return (
    with v as (
      select * from ventas where created_at::date between p_desde and p_hasta
    )
    select json_build_object(
      'total',  (select coalesce(sum(total), 0) from v),
      'num',    (select count(*) from v),
      'ticket', (select coalesce(round(avg(total), 2), 0) from v),
      'por_dia', (select coalesce(json_agg(d order by d.dia), '[]'::json) from (
          select created_at::date as dia, sum(total) as total, count(*) as num
          from v group by created_at::date) d),
      'top_servicios', (select coalesce(json_agg(t), '[]'::json) from (
          select vi.nombre, count(*) as n, sum(vi.precio * vi.cantidad) as monto
          from venta_items vi join v on v.id = vi.venta_id
          where vi.tipo = 'servicio' group by vi.nombre order by n desc limit 8) t),
      'top_productos', (select coalesce(json_agg(t), '[]'::json) from (
          select vi.nombre, count(*) as n, sum(vi.precio * vi.cantidad) as monto
          from venta_items vi join v on v.id = vi.venta_id
          where vi.tipo = 'producto' group by vi.nombre order by n desc limit 8) t),
      'top_barberos', (select coalesce(json_agg(t), '[]'::json) from (
          select b.nombre, count(*) as n, sum(v.total) as monto
          from v join barberos b on b.id = v.barbero_id
          group by b.nombre order by n desc limit 8) t)
    )
  );
end;
$$;

create or replace function public.reporte_clientes(p_desde date, p_hasta date)
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not is_owner_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return (
    with rango as (
      select v.cliente_id, v.total
      from ventas v
      where (v.created_at at time zone 'America/Guatemala')::date between p_desde and p_hasta
    ),
    por_cliente as (
      select cliente_id, sum(total) as total, count(*) as visitas
      from rango group by cliente_id
    ),
    clasificado as (
      select
        pc.cliente_id, pc.total, pc.visitas,
        exists (
          select 1 from ventas v2
          where v2.cliente_id = pc.cliente_id
            and (v2.created_at at time zone 'America/Guatemala')::date < p_desde
        ) as tenia_antes
      from por_cliente pc
    )
    select json_build_object(
      'nuevos', (
        select count(*) from clientes
        where (created_at at time zone 'America/Guatemala')::date between p_desde and p_hasta
      ),
      'activos',      (select count(*) from clasificado),
      'recurrentes',  (select count(*) from clasificado where tenia_antes),
      'ticket_cliente', (select coalesce(round(avg(total), 2), 0) from clasificado),
      'gasto_nuevos',      (select coalesce(sum(total), 0) from clasificado where not tenia_antes),
      'gasto_recurrentes', (select coalesce(sum(total), 0) from clasificado where tenia_antes),
      'top_clientes', (
        select coalesce(json_agg(t), '[]'::json) from (
          select c.nombre, c.numero, cl.visitas, cl.total
          from clasificado cl
          join clientes c on c.id = cl.cliente_id
          order by cl.total desc
          limit 10
        ) t
      )
    )
  );
end;
$$;

create or replace function public.ventas_heatmap_horario(p_desde date, p_hasta date)
returns table (dow int, hora int, n int, monto numeric)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not is_owner_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return query
    select
      extract(dow  from (created_at at time zone 'America/Guatemala'))::int as dow,
      extract(hour from (created_at at time zone 'America/Guatemala'))::int as hora,
      count(*)::int as n,
      sum(total)    as monto
    from ventas
    where (created_at at time zone 'America/Guatemala')::date between p_desde and p_hasta
    group by 1, 2;
end;
$$;

create or replace function public.dashboard_metrics()
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not is_owner_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return (
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
    )
  );
end;
$$;

-- ── 2) Lectura directa de ventas/venta_items: solo admin/dueño ──
-- (POS, caja, ficha y lealtad no leen estas tablas bajo la RLS del que
--  llama: usan RPC definer o la vista cliente_loyalty.)
alter policy ventas_read      on ventas      using (is_owner_admin());
alter policy venta_items_read on venta_items using (is_owner_admin());
