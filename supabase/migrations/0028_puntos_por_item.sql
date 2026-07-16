-- ════════════════════════════════════════════════════════════════
-- Migración: 0028_puntos_por_item.sql
-- Cada servicio/producto define CUÁNTOS puntos otorga. Antes: 1 venta =
-- 1 sello sin importar cuántos ítems (el "+1" vivía en el count() de la
-- vista). Ahora: corte(1) + barba(1) = 2 puntos; VIP(3) × 2 = 6.
--   · `servicios.puntos` / `productos.puntos` reemplazan a `cuenta_lealtad`
--     como fuente de verdad. puntos = 0 → no suma.
--   · `cuenta_lealtad` NO se dropea aquí: queda huérfana a propósito para
--     conservar el rollback (revertir la vista a 0027 la necesita viva).
--     La dropea 0029 una vez verificado esto en producción.
--   · Multiplica por cantidad.
--   · NO retroactivo: los puntos se MATERIALIZAN en venta_items.puntos.
--     El histórico se backfillea con el modelo viejo (1 punto en UNA sola
--     línea por venta) → ningún saldo se mueve.
--   · Efecto lateral buscado: al congelar el punto en la línea, cambiar el
--     catálogo ya NO reescribe el pasado (antes la vista lo derivaba en
--     vivo desde las banderas ACTUALES). Los sellos quedan congelados como
--     ya lo están `nombre` y `precio`.
-- ════════════════════════════════════════════════════════════════

-- ── 0) Snapshot de auditoría (pre-cambio) ───────────────────────
-- Contra la vista VIEJA, para demostrar que el backfill no movió saldos.
-- RLS sin policy → invisible vía PostgREST (Supabase concede privilegios
-- por defecto a anon/authenticated sobre tablas nuevas en `public`).
-- La borra 0029.
create table if not exists _bk_loyalty_0028 as
  select cliente_id, sucursal_id, cortes_total, visitas_12m,
         recompensas_canjeadas, ultima_visita
  from cliente_loyalty;
alter table _bk_loyalty_0028 enable row level security;

-- ── 1) Puntos en el catálogo ────────────────────────────────────
-- Defaults que preservan la semántica vieja para filas nuevas:
-- servicios cuenta_lealtad default true  → puntos default 1
-- productos cuenta_lealtad default false → puntos default 0
alter table servicios
  add column if not exists puntos int not null default 1 check (puntos >= 0);
alter table productos
  add column if not exists puntos int not null default 0 check (puntos >= 0);

-- Migra el flag al número: marcado → 1, desmarcado → 0.
update servicios set puntos = case when cuenta_lealtad then 1 else 0 end;
update productos set puntos = case when cuenta_lealtad then 1 else 0 end;

-- ── 2) Puntos materializados por línea de venta ─────────────────
-- default 0 = fail-safe: un escritor futuro que olvide la columna
-- sub-otorga (visible, corregible) en vez de sobre-otorgar.
alter table venta_items
  add column if not exists puntos int not null default 0 check (puntos >= 0);

-- ── 3) Backfill del histórico con el MODELO VIEJO ───────────────
-- Usa `cuenta_lealtad` a propósito (no `puntos`): es la expresión literal
-- de la regla vieja que se está congelando.
-- `distinct on (venta_id) ... order by venta_id, id` → exactamente 1 línea
-- por venta. Cuál la recibe da igual: la vista suma por venta.
-- Guardia de idempotencia: solo ventas con 0 puntos hoy. Si esta migración
-- se re-ejecutara a mano tras vender, NO pisaría con 1 una venta nueva que
-- legítimamente valga 2.
with ventas_sin_puntos as (
  select vi.venta_id
  from venta_items vi
  group by vi.venta_id
  having coalesce(sum(vi.puntos), 0) = 0
),
primera_linea as (
  select distinct on (vi.venta_id) vi.id
  from venta_items vi
  join ventas_sin_puntos vsp on vsp.venta_id = vi.venta_id
  left join servicios s on s.id = vi.servicio_id
  left join productos p on p.id = vi.producto_id
  where (vi.tipo = 'servicio' and s.cuenta_lealtad)
     or (vi.tipo = 'producto' and p.cuenta_lealtad)
  order by vi.venta_id, vi.id
)
update venta_items vi
   set puntos = 1
  from primera_linea pl
 where pl.id = vi.id;

-- ── 4) Vista: cortes_total = SUMA DE PUNTOS ─────────────────────
-- Único cambio vs 0027: cortes_total pasa de contar VENTAS a sumar PUNTOS.
-- visitas_12m / recompensas_canjeadas / ultima_visita SIGUEN contando
-- VENTAS a propósito:
--   · visitas_12m alimenta los tiers, calibrados en VISITAS FÍSICAS. Sumar
--     puntos ahí rebajaría de facto todos los umbrales VIP a la mitad.
--   · recompensas_canjeadas DEBE contar ventas: `recompensa_canjeada` es
--     boolean (máx 1 canje/venta). Sumar puntos contaría 2 canjes en una
--     venta que canjeó 1 y le quemaría un premio al cliente.
-- Asimetría intencional: cortes_total = economía de sellos; visitas_12m =
-- afluencia.
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
  having sum(vi.puntos) > 0     -- "corte" = venta que otorgó >=1 punto.
),                              -- Para el histórico este HAVING selecciona
                                -- el MISMO conjunto que el EXISTS de 0027.
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
  -- manuales no tiene filas en `cortes` → sum() daría NULL (count() daba 0
  -- solito). Sin esto su tarjeta se rompe. Ese cliente existe: es justo el
  -- caso que el `keys ... union` de 0026 cubre.
  -- max(a.delta) (no sum): `adj` tiene 1 fila por clave y el join la repite
  -- en cada venta → max() deshace el fan-out. Igual que 0026/0027.
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

-- Los grants se pierden con el drop → re-otorgar (como 0023/0026/0027).
grant select on cliente_loyalty to authenticated;

-- ── 5) record_venta: puntos por línea desde el catálogo ─────────
-- Idéntico a 0023 salvo el INSERT final. El lookup de `puntos` se hace AQUÍ
-- contra el catálogo, nunca se confía en el cliente: el POS solo manda
-- tipo/id/nombre/precio/cantidad, así que un payload manipulado no puede
-- inventar puntos. Firma sin cambios → la cola offline (lib/offline.ts)
-- reintenta payloads viejos sin migración.
create or replace function public.record_venta(
  p_cliente_id  uuid,
  p_barbero_id  uuid,
  p_metodo      metodo_pago,
  p_canjear     boolean,
  p_items       jsonb,
  p_cupon_id    uuid default null,
  p_sucursal_id uuid default '00000000-0000-0000-0000-000000000001'
)
returns json
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_venta     ventas;
  v_subtotal  numeric(10, 2);
  v_descuento numeric(10, 2) := 0;
  v_cupon     cupones;
  v_staff     uuid;
  v_disp      int;
begin
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'La venta no tiene items' using errcode = '23514';
  end if;

  -- Candado: no se puede canjear una recompensa que no se ganó AQUÍ.
  if coalesce(p_canjear, false) then
    select coalesce(floor(cortes_total::numeric / greatest(cortes_objetivo, 1)) - recompensas_canjeadas, 0)
      into v_disp
    from cliente_loyalty
    where cliente_id = p_cliente_id and sucursal_id = p_sucursal_id;

    if coalesce(v_disp, 0) <= 0 then
      raise exception 'El cliente no tiene recompensa disponible en esta sucursal' using errcode = 'P0001';
    end if;
  end if;

  select id into v_staff from staff where user_id = auth.uid();

  select coalesce(sum((i->>'precio')::numeric * coalesce((i->>'cantidad')::int, 1)), 0)
    into v_subtotal
  from jsonb_array_elements(p_items) i;

  if p_cupon_id is not null then
    select * into v_cupon from cupones where id = p_cupon_id for update;
    if v_cupon.id is null then
      raise exception 'Cupón no encontrado' using errcode = '22023';
    end if;
    v_descuento := cupon_descuento(v_cupon, v_subtotal);
    update cupones set usos = usos + 1 where id = v_cupon.id;
  end if;

  insert into ventas (cliente_id, barbero_id, registrado_por, sucursal_id, total, descuento, cupon_id, metodo_pago, recompensa_canjeada)
  values (p_cliente_id, p_barbero_id, v_staff, p_sucursal_id, v_subtotal - v_descuento, v_descuento, p_cupon_id, p_metodo, coalesce(p_canjear, false))
  returning * into v_venta;

  -- puntos = puntos_del_catalogo × cantidad. Alias `sv`/`pr` (no `s`/`p`)
  -- para no coquetear con la resolución de identificadores de plpgsql.
  insert into venta_items (venta_id, tipo, servicio_id, producto_id, nombre, precio, cantidad, puntos)
  select
    v_venta.id,
    it.tipo,
    it.servicio_id,
    it.producto_id,
    it.nombre,
    it.precio,
    it.cantidad,
    case
      when it.tipo = 'servicio' then coalesce(sv.puntos, 0) * it.cantidad
      when it.tipo = 'producto' then coalesce(pr.puntos, 0) * it.cantidad
      else 0
    end
  from (
    select
      (i->>'tipo')::item_tipo             as tipo,
      nullif(i->>'servicio_id', '')::uuid as servicio_id,
      nullif(i->>'producto_id', '')::uuid as producto_id,
      i->>'nombre'                        as nombre,
      (i->>'precio')::numeric             as precio,
      coalesce((i->>'cantidad')::int, 1)  as cantidad
    from jsonb_array_elements(p_items) i
  ) it
  left join servicios sv on sv.id = it.servicio_id and it.tipo = 'servicio'
  left join productos pr on pr.id = it.producto_id and it.tipo = 'producto';

  return json_build_object('id', v_venta.id, 'total', v_venta.total, 'descuento', v_venta.descuento, 'created_at', v_venta.created_at);
end;
$$;
grant execute on function public.record_venta(uuid, uuid, metodo_pago, boolean, jsonb, uuid, uuid) to authenticated;
