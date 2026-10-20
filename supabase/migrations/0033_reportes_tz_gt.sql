-- ════════════════════════════════════════════════════════════════
-- Migración: 0033_reportes_tz_gt.sql  (auditoría QA 2026-10-19, C5)
-- reporte_ventas y dashboard_metrics agrupaban/filtraban por fecha UTC
-- (`created_at::date`, `current_date`, `date_trunc` sobre timestamptz):
-- las ventas de 18:00–24:00 hora de Guatemala caían en el día siguiente,
-- "Ventas hoy" se reiniciaba a las 18:00 y nada cuadraba con Caja ni con
-- reporte_clientes / heatmap / ventas_por_sucursal (que ya usaban GT, 0006).
--
-- Cambios (mismas firmas, solo cuerpo):
--   · Todas las fechas en `at time zone 'America/Guatemala'`.
--   · Tops cuentan unidades (sum(cantidad)) y montos netos de la línea.
--   · clientes_inactivos del dashboard respeta p_sucursal_id, igual que
--     clientes_activos (antes activos + inactivos ≠ total con sucursal).
--   · Se borran los overloads viejos sin p_sucursal_id (0003/0011/0014).
--     Con "Todas las sucursales" el front llama SIN p_sucursal_id y
--     PostgREST elegía esa firma exacta → el consolidado salía con la
--     lógica vieja. Sin ellos, resuelve a la versión con default null.
-- Sin cambios de código: el front ya manda fechas GT.
-- ════════════════════════════════════════════════════════════════

drop function if exists public.dashboard_metrics();
drop function if exists public.reporte_ventas(date, date);
drop function if exists public.reporte_clientes(date, date);
drop function if exists public.ventas_heatmap_horario(date, date);

create or replace function public.reporte_ventas(p_desde date, p_hasta date, p_sucursal_id uuid default null)
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
      select *, (created_at at time zone 'America/Guatemala')::date as dia_gt
      from ventas
      where (created_at at time zone 'America/Guatemala')::date between p_desde and p_hasta
        and (p_sucursal_id is null or sucursal_id = p_sucursal_id)
    )
    select json_build_object(
      'total',  (select coalesce(sum(total), 0) from v),
      'num',    (select count(*) from v),
      'ticket', (select coalesce(round(avg(total), 2), 0) from v),
      'por_dia', (select coalesce(json_agg(d order by d.dia), '[]'::json) from (
          select dia_gt as dia, sum(total) as total, count(*) as num
          from v group by dia_gt) d),
      'top_servicios', (select coalesce(json_agg(t), '[]'::json) from (
          select vi.nombre, sum(vi.cantidad) as n, sum(vi.precio * vi.cantidad) as monto
          from venta_items vi join v on v.id = vi.venta_id
          where vi.tipo = 'servicio' group by vi.nombre order by n desc limit 8) t),
      'top_productos', (select coalesce(json_agg(t), '[]'::json) from (
          select vi.nombre, sum(vi.cantidad) as n, sum(vi.precio * vi.cantidad) as monto
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
grant execute on function public.reporte_ventas(date, date, uuid) to authenticated;

create or replace function public.dashboard_metrics(p_sucursal_id uuid default null)
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_hoy date := (now() at time zone 'America/Guatemala')::date;
  v_mes date := date_trunc('month', v_hoy)::date;
begin
  if not is_owner_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return (
    with vs as (
      select *, (created_at at time zone 'America/Guatemala')::date as dia_gt
      from ventas
      where (p_sucursal_id is null or sucursal_id = p_sucursal_id)
    )
    select json_build_object(
      'ventas_hoy',         (select coalesce(sum(total), 0) from vs where dia_gt = v_hoy),
      'num_ventas_hoy',     (select count(*) from vs where dia_gt = v_hoy),
      'ventas_mes',         (select coalesce(sum(total), 0) from vs where dia_gt >= v_mes),
      'ticket_promedio',    (select coalesce(round(avg(total), 2), 0) from vs where dia_gt >= v_mes),
      'clientes_total',     (select count(*) from clientes),
      'clientes_activos',   (select count(distinct cliente_id) from vs where created_at >= now() - interval '30 days'),
      'clientes_inactivos', (select count(*) from clientes c where not exists (
                               select 1 from vs where vs.cliente_id = c.id and vs.created_at >= now() - interval '30 days')),
      'productos_bajo_stock', (select count(*) from productos where activo and controla_stock and stock <= stock_min and (p_sucursal_id is null or sucursal_id = p_sucursal_id)),
      'top_servicios',      (select coalesce(json_agg(t), '[]'::json) from (
                               select vi.nombre, sum(vi.cantidad) as n from venta_items vi join vs on vs.id = vi.venta_id
                               where vi.tipo = 'servicio'
                               group by vi.nombre order by n desc limit 5) t),
      'top_productos',      (select coalesce(json_agg(t), '[]'::json) from (
                               select vi.nombre, sum(vi.cantidad) as n from venta_items vi join vs on vs.id = vi.venta_id
                               where vi.tipo = 'producto'
                               group by vi.nombre order by n desc limit 5) t),
      'top_barbero',        (select b.nombre from vs join barberos b on b.id = vs.barbero_id
                               where vs.created_at >= now() - interval '30 days'
                               group by b.nombre order by count(*) desc limit 1)
    )
  );
end;
$$;
grant execute on function public.dashboard_metrics(uuid) to authenticated;

-- cupon_descuento usa now() (vigencia): no es immutable. Declararla así
-- permitía al planner cachear su resultado entre llamadas.
alter function public.cupon_descuento(cupones, numeric) stable;
