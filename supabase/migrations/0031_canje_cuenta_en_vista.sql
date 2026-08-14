-- ════════════════════════════════════════════════════════════════
-- Migración: 0031_canje_cuenta_en_vista.sql
-- FIX (regresión de 0030): tras canjear el corte gratis la tarjeta NO
-- volvía a 0/6 — se quedaba llena en "¡Reclama tu corte gratis!" para
-- siempre, y el cliente podía canjear infinitas veces.
--
-- Causa: el CTE `cortes` de la vista (0028:105) filtra con
--   having sum(vi.puntos) > 0
-- y de ESE mismo CTE salen `recompensas_canjeadas`, `visitas_12m` y
-- `ultima_visita`. 0030 puso la línea del corte gratis en puntos = 0 y el
-- canje típico del POS manda UNA sola línea (precio 0, es_recompensa) →
-- sum(puntos) = 0 → la venta se cae del CTE → el canje nunca se cuenta.
-- Consecuencias: recompensas_canjeadas se queda en 0 (anillo lleno
-- perpetuo), el candado de record_venta lee esa vista y deja recanjear sin
-- límite, y la visita no suma para tier ni actualiza ultima_visita. El
-- backfill de 0030 arrastró también a los canjes históricos.
--
-- Fix: una venta entra al CTE si otorgó puntos O si es un canje. Suma 0 a
-- cortes_total (la recompensa sigue sin dar sello, que es lo que 0030
-- buscaba), pero vuelve a contar como canje y como visita física.
-- Único cambio vs la vista de 0028: la línea del `having`.
-- ════════════════════════════════════════════════════════════════

drop view if exists cliente_loyalty;

create view cliente_loyalty as
with cortes as (
  select
    v.cliente_id,
    v.sucursal_id,
    v.id           as venta_id,
    v.created_at,
    v.recompensa_canjeada,
    sum(vi.puntos) as puntos
  from ventas v
  join venta_items vi on vi.venta_id = v.id
  group by v.id                 -- v.id es PK → el resto es dependiente
  -- "corte" = venta que otorgó >=1 punto… O un canje: tras 0030 la venta
  -- del corte gratis vale 0 puntos, pero sigue siendo un canje y una
  -- visita. bool_or() (no la columna cruda) para no depender de la
  -- detección de dependencia funcional dentro del HAVING.
  having sum(vi.puntos) > 0 or bool_or(v.recompensa_canjeada)
),
adj as (
  select cliente_id, sucursal_id, sum(delta) as delta
  from ajustes_lealtad
  group by cliente_id, sucursal_id
),
keys as (
  select cliente_id, sucursal_id from cortes
  union
  select cliente_id, sucursal_id from adj
)
select
  k.cliente_id,
  k.sucursal_id,
  -- coalesce OBLIGATORIO: con left join, un cliente con solo ajustes
  -- manuales no tiene filas en `cortes` → sum() daría NULL.
  -- max(a.delta) (no sum): `adj` tiene 1 fila por clave y el join la repite
  -- en cada venta → max() deshace el fan-out. Igual que 0026/0027/0028.
  greatest(coalesce(sum(co.puntos), 0) + coalesce(max(a.delta), 0), 0)  as cortes_total,
  count(co.venta_id) filter (
    where co.created_at >= now() - (cfg.ventana_meses || ' months')::interval
  )                                                             as visitas_12m,
  count(co.venta_id) filter (where co.recompensa_canjeada)      as recompensas_canjeadas,
  max(co.created_at)                                            as ultima_visita,
  cfg.cortes_objetivo
from keys k
left join cortes co on co.cliente_id = k.cliente_id and co.sucursal_id = k.sucursal_id
left join adj    a  on a.cliente_id  = k.cliente_id and a.sucursal_id  = k.sucursal_id
cross join config_lealtad cfg
group by k.cliente_id, k.sucursal_id, cfg.cortes_objetivo;

-- Los grants se pierden con el drop → re-otorgar (como 0023/0026/0027/0028).
grant select on cliente_loyalty to authenticated;
