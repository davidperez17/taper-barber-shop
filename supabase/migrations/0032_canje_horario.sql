-- ════════════════════════════════════════════════════════════════
-- Migración: 0032_canje_horario.sql
-- FEATURE: el canje del corte gratis solo aplica de lunes a viernes,
-- de 10:30 a 19:30 (hora de Guatemala).
--
-- Motivo: la recompensa se regala en horas de baja demanda, no en el pico
-- del fin de semana. Fuera de esa ventana NO se bloquea nada más: el cliente
-- escanea igual, la venta se registra igual y SÍ suma su sello. Solo se
-- rechaza `p_canjear = true`; la recompensa ganada queda pendiente hasta
-- que el cliente vuelva en horario válido.
--
-- Zona: la DB corre en UTC, así que la ventana se evalúa siempre con
-- `at time zone 'America/Guatemala'` (patrón del repo desde 0006). Comparar
-- contra `now()` crudo daría un desfase de 6 h.
--
-- El cuerpo de record_venta es idéntico al de 0030 (security definer +
-- guarda is_active_staff() + la recompensa no otorga sello); el único
-- cambio es la guarda de horario dentro del bloque `if p_canjear`, antes
-- del candado de recompensa disponible (0030:48-59).
--
-- El POS espeja esta misma regla en JS (lib/horario.ts) para ocultar el
-- checkbox, pero la verdad la fija esta función: la UI puede quedar abierta
-- cruzando las 19:30 y las ventas offline se sincronizan tarde.
-- ════════════════════════════════════════════════════════════════

-- ── Ventana de canje ──────────────────────────────────────────────
-- Límites inclusivos: 10:30 y 19:30 en punto son válidos.
create or replace function public.canje_abierto(p_at timestamptz default now())
returns boolean
language sql
stable
as $$
  with l as (select (p_at at time zone 'America/Guatemala') as t)
  select extract(isodow from t) between 1 and 5
     and t::time >= time '10:30'
     and t::time <= time '19:30'
  from l;
$$;
grant execute on function public.canje_abierto(timestamptz) to authenticated;

-- ── record_venta: 0030 + guarda de horario ────────────────────────
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

  if coalesce(p_canjear, false) then
    -- Candado de horario (0032): la venta sí puede registrarse fuera de la
    -- ventana, el canje no. El cajero debe reintentar sin canjear.
    if not canje_abierto() then
      raise exception 'Canje fuera de horario: solo lunes a viernes de 10:30 a 19:30'
        using errcode = 'P0001';
    end if;

    -- Candado: no se puede canjear una recompensa que no se ganó AQUÍ.
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

-- Sin backfill: la regla no es retroactiva. Los canjes ya hechos fuera de
-- este horario quedan como están.
