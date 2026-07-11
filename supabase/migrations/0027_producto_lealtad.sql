-- 0027_producto_lealtad
-- Permite que un producto específico también sume sello de lealtad, no solo los
-- servicios. Se conserva el modelo "1 venta = 1 sello": una venta otorga un sello
-- si incluye AL MENOS un ítem que cuenta lealtad (servicio o producto marcado).
-- No multiplica por cantidad ni por cantidad de ítems.

-- ── Bandera en productos (por defecto NO suma, a diferencia de servicios) ──
alter table productos
  add column if not exists cuenta_lealtad boolean not null default false;

-- ── Vista de lealtad: "corte" = venta con servicio O producto que cuenta ──
-- (idéntica a 0026 salvo el EXISTS ampliado a productos.)
drop view if exists cliente_loyalty;
create view cliente_loyalty as
with cortes as (
  select
    v.cliente_id,
    v.sucursal_id,
    v.id          as venta_id,
    v.created_at,
    v.recompensa_canjeada
  from ventas v
  where exists (
    select 1
    from venta_items vi
    left join servicios s on s.id = vi.servicio_id
    left join productos p on p.id = vi.producto_id
    where vi.venta_id = v.id
      and (
        (vi.tipo = 'servicio' and s.cuenta_lealtad)
        or (vi.tipo = 'producto' and p.cuenta_lealtad)
      )
  )
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
  greatest(count(co.venta_id) + coalesce(max(a.delta), 0), 0)   as cortes_total,
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

grant select on cliente_loyalty to authenticated;
