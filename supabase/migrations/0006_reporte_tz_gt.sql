-- ════════════════════════════════════════════════════════════════
-- Migración: 0006_reporte_tz_gt.sql
-- Normaliza reporte_ventas a hora local de Guatemala (America/Guatemala),
-- igual que ventas_heatmap_horario (0005). Antes agrupaba por created_at::date
-- en UTC, desfasando las ventas de la noche (≥18:00 GT) al día siguiente y
-- generando inconsistencia entre las tarjetas de reporte y el heatmap.
-- p_desde / p_hasta se interpretan como fechas del calendario de Guatemala.
-- ════════════════════════════════════════════════════════════════

create or replace function public.reporte_ventas(p_desde date, p_hasta date)
returns json
language sql
security invoker
stable
set search_path = public
as $$
  with v as (
    select *, (created_at at time zone 'America/Guatemala')::date as dia_gt
    from ventas
    where (created_at at time zone 'America/Guatemala')::date between p_desde and p_hasta
  )
  select json_build_object(
    'total',  (select coalesce(sum(total), 0) from v),
    'num',    (select count(*) from v),
    'ticket', (select coalesce(round(avg(total), 2), 0) from v),
    'por_dia', (select coalesce(json_agg(d order by d.dia), '[]'::json) from (
        select dia_gt as dia, sum(total) as total, count(*) as num
        from v group by dia_gt) d),
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
  );
$$;
grant execute on function public.reporte_ventas(date, date) to authenticated;
