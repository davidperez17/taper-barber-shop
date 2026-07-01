-- ════════════════════════════════════════════════════════════════
-- Migración: 0017_reportes_sucursal.sql  (Fase D — reportes por sucursal)
-- Los RPC de reporte/métricas aceptan p_sucursal_id (null = todas las
-- sucursales / consolidado). Nueva RPC ventas_por_sucursal para comparar
-- cuánto genera cada sucursal. Todos definer + solo admin/dueño (0014).
-- ════════════════════════════════════════════════════════════════

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
      select * from ventas
      where created_at::date between p_desde and p_hasta
        and (p_sucursal_id is null or sucursal_id = p_sucursal_id)
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
grant execute on function public.reporte_ventas(date, date, uuid) to authenticated;

create or replace function public.reporte_clientes(p_desde date, p_hasta date, p_sucursal_id uuid default null)
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
        and (p_sucursal_id is null or v.sucursal_id = p_sucursal_id)
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
            and (p_sucursal_id is null or v2.sucursal_id = p_sucursal_id)
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
grant execute on function public.reporte_clientes(date, date, uuid) to authenticated;

create or replace function public.ventas_heatmap_horario(p_desde date, p_hasta date, p_sucursal_id uuid default null)
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
      and (p_sucursal_id is null or sucursal_id = p_sucursal_id)
    group by 1, 2;
end;
$$;
grant execute on function public.ventas_heatmap_horario(date, date, uuid) to authenticated;

create or replace function public.dashboard_metrics(p_sucursal_id uuid default null)
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
      'ventas_hoy',         (select coalesce(sum(total), 0) from ventas where created_at::date = current_date and (p_sucursal_id is null or sucursal_id = p_sucursal_id)),
      'num_ventas_hoy',     (select count(*) from ventas where created_at::date = current_date and (p_sucursal_id is null or sucursal_id = p_sucursal_id)),
      'ventas_mes',         (select coalesce(sum(total), 0) from ventas where date_trunc('month', created_at) = date_trunc('month', now()) and (p_sucursal_id is null or sucursal_id = p_sucursal_id)),
      'ticket_promedio',    (select coalesce(round(avg(total), 2), 0) from ventas where date_trunc('month', created_at) = date_trunc('month', now()) and (p_sucursal_id is null or sucursal_id = p_sucursal_id)),
      'clientes_total',     (select count(*) from clientes),
      'clientes_activos',   (select count(distinct cliente_id) from ventas where created_at >= now() - interval '30 days' and (p_sucursal_id is null or sucursal_id = p_sucursal_id)),
      'clientes_inactivos', (select count(*) from clientes c where not exists (
                               select 1 from ventas v where v.cliente_id = c.id and v.created_at >= now() - interval '30 days')),
      'productos_bajo_stock', (select count(*) from productos where activo and controla_stock and stock <= stock_min and (p_sucursal_id is null or sucursal_id = p_sucursal_id)),
      'top_servicios',      (select coalesce(json_agg(t), '[]'::json) from (
                               select vi.nombre, count(*) as n from venta_items vi join ventas v on v.id = vi.venta_id
                               where vi.tipo = 'servicio' and (p_sucursal_id is null or v.sucursal_id = p_sucursal_id)
                               group by vi.nombre order by n desc limit 5) t),
      'top_productos',      (select coalesce(json_agg(t), '[]'::json) from (
                               select vi.nombre, count(*) as n from venta_items vi join ventas v on v.id = vi.venta_id
                               where vi.tipo = 'producto' and (p_sucursal_id is null or v.sucursal_id = p_sucursal_id)
                               group by vi.nombre order by n desc limit 5) t),
      'top_barbero',        (select b.nombre from ventas v join barberos b on b.id = v.barbero_id
                               where v.created_at >= now() - interval '30 days' and (p_sucursal_id is null or v.sucursal_id = p_sucursal_id)
                               group by b.nombre order by count(*) desc limit 1)
    )
  );
end;
$$;
grant execute on function public.dashboard_metrics(uuid) to authenticated;

-- ── Comparativa: cuánto genera cada sucursal en el rango ────────
create or replace function public.ventas_por_sucursal(p_desde date, p_hasta date)
returns table (sucursal_id uuid, nombre text, total numeric, num int)
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
    select s.id, s.nombre,
      coalesce(sum(v.total), 0)::numeric as total,
      count(v.id)::int as num
    from sucursales s
    left join ventas v
      on v.sucursal_id = s.id
     and (v.created_at at time zone 'America/Guatemala')::date between p_desde and p_hasta
    where s.activo
    group by s.id, s.nombre, s.orden
    order by total desc, s.orden;
end;
$$;
grant execute on function public.ventas_por_sucursal(date, date) to authenticated;
