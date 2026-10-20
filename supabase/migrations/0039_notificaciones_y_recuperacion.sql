-- ════════════════════════════════════════════════════════════════
-- Migración: 0039_notificaciones_y_recuperacion.sql  (auditoría QA 2026-10-19)
--
-- 1. Avisos globales una sola vez: pushAvisosHalloween hace select → insert
--    en notificaciones_log sin índice único; si dos corridas del cron se
--    solapan, ambas pasan el select y el aviso sale doble. Índice único
--    parcial para los avisos globales (owner_id nil): el segundo insert
--    falla y esa corrida se lo salta (el código ya hace `if (error) continue`).
--    (Si ya hubiera duplicados, se conservan los más viejos.)
-- 2. clientes_inactivos: el `join` con la lealtad dejaba fuera a quien se
--    registró y nunca volvió (no tiene fila en cliente_loyalty), justo el
--    segmento a recuperar. Ahora `left join`: aparecen con ultima_visita
--    null. El cron de reactivación ya los ignora (solo reactiva a quien
--    visitó alguna vez).
-- Sin cambios de código.
-- ════════════════════════════════════════════════════════════════

delete from notificaciones_log a
using notificaciones_log b
where a.owner_id = '00000000-0000-0000-0000-000000000000'
  and b.owner_id = a.owner_id
  and b.tipo = a.tipo
  and b.created_at < a.created_at;

create unique index if not exists notificaciones_log_global_unico
  on notificaciones_log (tipo)
  where owner_id = '00000000-0000-0000-0000-000000000000';

create or replace function public.clientes_inactivos(p_dias int)
returns table (id uuid, numero bigint, nombre text, telefono text, ultima_visita timestamptz, dias_inactivo int)
language sql
security invoker
stable
set search_path = public
as $$
  with lealtad as (
    select cliente_id, max(ultima_visita) as ultima_visita
    from cliente_loyalty
    group by cliente_id
  )
  select
    c.id, c.numero, c.nombre, c.telefono,
    cl.ultima_visita,
    case when cl.ultima_visita is null then null
         else floor(extract(epoch from (now() - cl.ultima_visita)) / 86400)::int
    end as dias_inactivo
  from clientes c
  left join lealtad cl on cl.cliente_id = c.id
  where c.activo
    and (cl.ultima_visita is null or cl.ultima_visita < now() - (p_dias || ' days')::interval)
  order by cl.ultima_visita asc nulls last;
$$;
grant execute on function public.clientes_inactivos(int) to authenticated;
