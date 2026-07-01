-- ════════════════════════════════════════════════════════════════
-- Migración: 0009_reporte_clientes.sql
-- Reporte de clientes: retención, nuevos vs recurrentes, top por gasto.
-- Fechas en hora local de Guatemala (consistente con reporte_ventas 0006).
-- ════════════════════════════════════════════════════════════════

create or replace function public.reporte_clientes(p_desde date, p_hasta date)
returns json
language sql
security invoker
stable
set search_path = public
as $$
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
  );
$$;
grant execute on function public.reporte_clientes(date, date) to authenticated;
