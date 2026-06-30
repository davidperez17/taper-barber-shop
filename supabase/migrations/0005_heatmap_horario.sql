-- ════════════════════════════════════════════════════════════════
-- Migración: 0005_heatmap_horario.sql
-- Heatmap "Busy Periods": ventas agrupadas por día de semana × hora,
-- en hora local de Guatemala (para saber a qué hora llegan los clientes).
-- dow: 0=domingo … 6=sábado.
-- ════════════════════════════════════════════════════════════════

create or replace function public.ventas_heatmap_horario(p_desde date, p_hasta date)
returns table (dow int, hora int, n int, monto numeric)
language sql
security invoker
stable
set search_path = public
as $$
  select
    extract(dow  from (created_at at time zone 'America/Guatemala'))::int as dow,
    extract(hour from (created_at at time zone 'America/Guatemala'))::int as hora,
    count(*)::int as n,
    sum(total)    as monto
  from ventas
  where (created_at at time zone 'America/Guatemala')::date between p_desde and p_hasta
  group by 1, 2;
$$;
grant execute on function public.ventas_heatmap_horario(date, date) to authenticated;
