-- ════════════════════════════════════════════════════════════════
-- Migración: 0030_canje_no_otorga_sello.sql
-- FIX: al canjear el corte gratis, el conteo NO se reiniciaba a 0/objetivo:
--   quedaba en 1 (o N) residual.
--
-- Causa: la línea del corte gratis llega con precio=0 pero CONSERVA su
-- servicio_id, y record_venta (0028/0029:118-122) deriva los puntos del
-- catálogo por servicio_id, ignorando precio y p_canjear. Así la recompensa
-- se auto-otorgaba un sello: tras canjear, cortes_total = objetivo + 1 y
-- cortes_total % objetivo = 1. La recompensa NO debe volver a sumar sello.
--
-- Fix: la línea marcada `es_recompensa` (o, como red de seguridad para
-- ventas offline encoladas antes de este deploy, una línea de servicio con
-- precio=0 dentro de un canje) otorga 0 puntos. El resto del cuerpo es
-- idéntico a 0029 (security definer + guarda is_active_staff()).
-- ════════════════════════════════════════════════════════════════

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
security definer
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
  -- Guarda explícita: al ser definer, la RLS ya no autoriza por nosotros.
  if not is_active_staff() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

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

  -- puntos = puntos_del_catalogo × cantidad (0028), PERO la línea del corte
  -- gratis canjeado otorga 0 (0030): es la recompensa, no un corte nuevo.
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
      -- Recompensa canjeada: no suma sello. `es_recompensa` desde el POS; el
      -- precio=0 dentro de un canje cubre ventas offline sin el flag.
      when it.es_recompensa or (coalesce(p_canjear, false) and it.tipo = 'servicio' and it.precio = 0) then 0
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
      coalesce((i->>'cantidad')::int, 1)  as cantidad,
      coalesce((i->>'es_recompensa')::boolean, false) as es_recompensa
    from jsonb_array_elements(p_items) i
  ) it
  left join servicios sv on sv.id = it.servicio_id and it.tipo = 'servicio'
  left join productos pr on pr.id = it.producto_id and it.tipo = 'producto';

  return json_build_object('id', v_venta.id, 'total', v_venta.total, 'descuento', v_venta.descuento, 'created_at', v_venta.created_at);
end;
$$;
grant execute on function public.record_venta(uuid, uuid, metodo_pago, boolean, jsonb, uuid, uuid) to authenticated;

-- Backfill: los canjes anteriores a este fix ya sumaron su sello residual a
-- cortes_total (que solo crece). Se pone en 0 el punto de esas líneas gratis
-- históricas — servicio con precio=0 dentro de una venta con recompensa
-- canjeada — para que el conteo de los clientes afectados quede correcto.
update venta_items vi
set puntos = 0
from ventas v
where vi.venta_id = v.id
  and v.recompensa_canjeada = true
  and vi.tipo = 'servicio'
  and vi.precio = 0
  and vi.puntos <> 0;
