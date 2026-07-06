-- ════════════════════════════════════════════════════════════════
-- Migración: 0023_lealtad_por_sucursal.sql
-- Lealtad atada a la sucursal: cada cliente tiene una TARJETA POR
-- SUCURSAL. Acumula y canjea por separado en cada una — nunca cruza.
-- Motivo: los precios difieren entre sucursales (p.ej. Q65 vs Q85) y
-- no queremos que se acumule barato en una para canjear caro en otra.
--
-- Las ventas ya guardan sucursal_id y recompensa_canjeada vive en la
-- venta, así que acumulación y canjes quedan por sucursal "solos" al
-- reindexar la vista. Solo falta el candado en record_venta.
-- ════════════════════════════════════════════════════════════════

-- ── Vista cliente_loyalty → por (cliente_id, sucursal_id) ───────
-- "Corte" = venta con >=1 servicio que cuenta_lealtad. Antes agrupaba
-- solo por cliente (cross-branch). Ahora suma la sucursal a la clave.
-- Se reordena la lista de columnas → drop + create (create or replace
-- no permite reordenar columnas de una vista existente).
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
    select 1 from venta_items vi
    join servicios s on s.id = vi.servicio_id
    where vi.venta_id = v.id
      and vi.tipo = 'servicio'
      and s.cuenta_lealtad
  )
)
select
  co.cliente_id,
  co.sucursal_id,
  count(co.venta_id)                                          as cortes_total,
  count(co.venta_id) filter (
    where co.created_at >= now() - (cfg.ventana_meses || ' months')::interval
  )                                                           as visitas_12m,
  count(co.venta_id) filter (where co.recompensa_canjeada)    as recompensas_canjeadas,
  max(co.created_at)                                          as ultima_visita,
  cfg.cortes_objetivo
from cortes co
cross join config_lealtad cfg
group by co.cliente_id, co.sucursal_id, cfg.cortes_objetivo;

grant select on cliente_loyalty to authenticated;

-- ── record_venta: candado de canje por sucursal (anti-arbitraje) ─
-- Si p_canjear = true, el cliente DEBE tener una recompensa disponible
-- en ESTA sucursal; si no, se rechaza. Misma firma que 0016.
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

  insert into venta_items (venta_id, tipo, servicio_id, producto_id, nombre, precio, cantidad)
  select
    v_venta.id,
    (i->>'tipo')::item_tipo,
    nullif(i->>'servicio_id', '')::uuid,
    nullif(i->>'producto_id', '')::uuid,
    i->>'nombre',
    (i->>'precio')::numeric,
    coalesce((i->>'cantidad')::int, 1)
  from jsonb_array_elements(p_items) i;

  return json_build_object('id', v_venta.id, 'total', v_venta.total, 'descuento', v_venta.descuento, 'created_at', v_venta.created_at);
end;
$$;
grant execute on function public.record_venta(uuid, uuid, metodo_pago, boolean, jsonb, uuid, uuid) to authenticated;

-- ── get_cliente_by_qr: lealtad por sucursal ─────────────────────
-- Devuelve:
--   · loyalty            → tarjeta de UNA sucursal (compat con el panel).
--                          p_sucursal_id si se pasa; si no, la de actividad
--                          más reciente; si no hay, la 1ª activa en cero.
--   · loyalty_sucursales → arreglo de tarjetas, una por sucursal ACTIVA
--                          (así un cliente nuevo ve ambas en 0/6). App cliente.
--   · historial          → igual que antes (global del cliente).
drop function if exists public.get_cliente_by_qr(text);

create or replace function public.get_cliente_by_qr(
  p_qr_token   text,
  p_sucursal_id uuid default null
)
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_cliente            clientes;
  v_target             uuid;
  v_objetivo           int;
  v_loyalty            json;
  v_loyalty_sucursales json;
  v_historial          json;
begin
  select * into v_cliente from clientes where qr_token = p_qr_token;
  if not found then
    return null;
  end if;

  select cortes_objetivo into v_objetivo from config_lealtad where id = 1;

  -- Tarjeta por cada sucursal activa (0/6 si el cliente aún no la tiene).
  select coalesce(json_agg(s.t order by s.orden), '[]'::json) into v_loyalty_sucursales
  from (
    select
      su.orden,
      json_build_object(
        'sucursal_id', su.id,
        'sucursal_nombre', su.nombre,
        'cortes_total', coalesce(cl.cortes_total, 0),
        'visitas_12m', coalesce(cl.visitas_12m, 0),
        'recompensas_canjeadas', coalesce(cl.recompensas_canjeadas, 0),
        'cortes_objetivo', coalesce(cl.cortes_objetivo, v_objetivo),
        'ultima_visita', cl.ultima_visita
      ) as t
    from sucursales su
    left join cliente_loyalty cl on cl.cliente_id = v_cliente.id and cl.sucursal_id = su.id
    where su.activo
  ) s;

  -- Sucursal "primaria" para el objeto compat: la pedida, o la de última
  -- visita, o la 1ª activa.
  if p_sucursal_id is not null then
    v_target := p_sucursal_id;
  else
    select sucursal_id into v_target
    from cliente_loyalty
    where cliente_id = v_cliente.id
    order by ultima_visita desc nulls last
    limit 1;
    if v_target is null then
      select id into v_target from sucursales where activo order by orden limit 1;
    end if;
  end if;

  select json_build_object(
    'sucursal_id', v_target,
    'sucursal_nombre', (select nombre from sucursales where id = v_target),
    'cortes_total', coalesce(cl.cortes_total, 0),
    'visitas_12m', coalesce(cl.visitas_12m, 0),
    'recompensas_canjeadas', coalesce(cl.recompensas_canjeadas, 0),
    'cortes_objetivo', coalesce(cl.cortes_objetivo, v_objetivo),
    'ultima_visita', cl.ultima_visita
  ) into v_loyalty
  from (select 1) dummy
  left join cliente_loyalty cl
    on cl.cliente_id = v_cliente.id and cl.sucursal_id = v_target;

  select coalesce(json_agg(h order by h.created_at desc), '[]'::json) into v_historial
  from (
    select
      v.id, v.total, v.created_at, v.recompensa_canjeada,
      b.nombre as barbero,
      coalesce(json_agg(
        json_build_object('nombre', vi.nombre, 'precio', vi.precio, 'tipo', vi.tipo, 'cantidad', vi.cantidad)
      ) filter (where vi.id is not null), '[]'::json) as items
    from ventas v
    left join barberos b on b.id = v.barbero_id
    left join venta_items vi on vi.venta_id = v.id
    where v.cliente_id = v_cliente.id
    group by v.id, b.nombre
    order by v.created_at desc
    limit 50
  ) h;

  return json_build_object(
    'cliente', json_build_object(
      'id', v_cliente.id,
      'numero', v_cliente.numero,
      'nombre', v_cliente.nombre,
      'telefono', v_cliente.telefono,
      'qr_token', v_cliente.qr_token,
      'created_at', v_cliente.created_at
    ),
    'loyalty', v_loyalty,
    'loyalty_sucursales', v_loyalty_sucursales,
    'historial', v_historial
  );
end;
$$;
grant execute on function public.get_cliente_by_qr(text, uuid) to anon, authenticated;

-- ── clientes_inactivos: última visita GLOBAL del cliente ────────
-- La vista ahora tiene una fila por sucursal → agregamos con max()
-- para que "recuperación" siga siendo por cliente y no lo duplique.
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
  join lealtad cl on cl.cliente_id = c.id
  where c.activo
    and (cl.ultima_visita is null or cl.ultima_visita < now() - (p_dias || ' days')::interval)
  order by cl.ultima_visita asc nulls last;
$$;
grant execute on function public.clientes_inactivos(int) to authenticated;
