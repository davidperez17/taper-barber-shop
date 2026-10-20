-- ════════════════════════════════════════════════════════════════
-- Migración: 0034_record_venta_seguro.sql  (auditoría QA 2026-10-19: C3, C4, A6, M2, A14)
-- record_venta deja de confiar en el payload del navegador.
--
-- Antes (0032): subtotal = Σ precio × cantidad tal como llegaban del POS.
-- Con DevTools un cajero podía mandar precio 0 × cantidad 12 de "Corte"
-- = venta de Q0 y 12 sellos; cantidad negativa = totales negativos; y
-- p_sucursal_id no se validaba contra la sucursal fija del cajero.
--
-- Ahora:
--   · Precio SIEMPRE del catálogo de la sucursal de la venta (servicio o
--     producto de esa sucursal; si no existe ahí, se rechaza).
--   · Cantidad entera 1..50.
--   · Línea de recompensa (corte gratis): solo con p_canjear, un servicio,
--     cantidad 1, máximo una por venta. Es la única que vale Q0.
--   · Cajero/barbero: la sucursal es SIEMPRE la suya (se ignora el payload).
--     Dueño/admin: la que mande el POS. La sucursal debe estar activa.
--   · Canje serializado por (cliente, sucursal) con advisory lock: dos
--     dispositivos ya no canjean la misma recompensa a la vez.
--   · Idempotencia: p_client_id (UUID que genera el POS por venta). Si ya
--     existe una venta con ese id, se devuelve esa en vez de crear otra
--     (reintentos por red caída, cola offline en dos pestañas).
--   · p_creado_en: hora real del cobro para ventas offline sincronizadas
--     tarde (acotada a las últimas 72 h; fuera de eso se usa now()).
--
-- Firma nueva (+p_client_id, +p_creado_en, ambos default null): se borra la
-- de 0032 para no dejar un overload que PostgREST no sepa elegir. El código
-- (app/admin/actions.ts recordVenta) manda los params nuevos y, si la base
-- aún no tiene esta migración, reintenta sin ellos.
-- ════════════════════════════════════════════════════════════════

alter table ventas add column if not exists client_id uuid;
create unique index if not exists ventas_client_id_key on ventas (client_id) where client_id is not null;

drop function if exists public.record_venta(uuid, uuid, metodo_pago, boolean, jsonb, uuid, uuid);

create or replace function public.record_venta(
  p_cliente_id  uuid,
  p_barbero_id  uuid,
  p_metodo      metodo_pago,
  p_canjear     boolean,
  p_items       jsonb,
  p_cupon_id    uuid default null,
  p_sucursal_id uuid default '00000000-0000-0000-0000-000000000001',
  p_client_id   uuid default null,
  p_creado_en   timestamptz default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_venta       ventas;
  v_subtotal    numeric(10, 2);
  v_descuento   numeric(10, 2) := 0;
  v_cupon       cupones;
  v_staff       staff;
  v_sucursal    uuid := p_sucursal_id;
  v_canjear     boolean := coalesce(p_canjear, false);
  v_disp        int;
  v_creado      timestamptz := now();
  v_recompensas int;
  v_invalidos   int;
begin
  -- Guarda explícita: al ser definer, la RLS ya no autoriza por nosotros.
  select * into v_staff from staff where user_id = auth.uid() and activo;
  if v_staff.id is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  -- Idempotencia: el mismo cobro reintentado devuelve la venta ya guardada.
  if p_client_id is not null then
    perform pg_advisory_xact_lock(hashtext('venta:' || p_client_id::text));
    select * into v_venta from ventas where client_id = p_client_id;
    if v_venta.id is not null then
      return json_build_object('id', v_venta.id, 'total', v_venta.total, 'descuento', v_venta.descuento,
                               'created_at', v_venta.created_at, 'repetida', true);
    end if;
  end if;

  -- Trabajadores operan solo en su sucursal; el payload no manda.
  if v_staff.rol in ('cajero', 'barbero') then
    v_sucursal := v_staff.sucursal_id;
  end if;
  if v_sucursal is null or not exists (select 1 from sucursales where id = v_sucursal and activo) then
    raise exception 'Sucursal inválida o desactivada' using errcode = '22023';
  end if;

  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'La venta no tiene items' using errcode = '23514';
  end if;

  if p_creado_en is not null and p_creado_en between now() - interval '72 hours' and now() + interval '5 minutes' then
    v_creado := least(p_creado_en, now());
  end if;

  -- Ítems normalizados con precio y puntos del catálogo de la sucursal.
  -- (drop previo: dos ventas en la misma transacción no chocan.)
  drop table if exists _items;
  create temp table _items on commit drop as
  select
    it.tipo,
    it.servicio_id,
    it.producto_id,
    coalesce(sv.nombre, pr.nombre)  as nombre,
    it.cantidad,
    it.es_recompensa,
    case when it.es_recompensa then 0 else coalesce(sv.precio, pr.precio) end as precio,
    case
      when it.es_recompensa then 0
      when it.tipo = 'servicio' then coalesce(sv.puntos, 0) * it.cantidad
      else coalesce(pr.puntos, 0) * it.cantidad
    end as puntos,
    (sv.id is null and pr.id is null) as invalido
  from (
    select
      (i->>'tipo')::item_tipo             as tipo,
      nullif(i->>'servicio_id', '')::uuid as servicio_id,
      nullif(i->>'producto_id', '')::uuid as producto_id,
      coalesce((i->>'cantidad')::int, 1)  as cantidad,
      -- Recompensa: flag del POS, o (ventas offline viejas sin flag) un
      -- servicio a precio 0 dentro de un canje.
      (v_canjear and (i->>'tipo') = 'servicio' and (
         coalesce((i->>'es_recompensa')::boolean, false)
         or coalesce((i->>'precio')::numeric, -1) = 0
      )) as es_recompensa
    from jsonb_array_elements(p_items) i
  ) it
  left join servicios sv on it.tipo = 'servicio' and sv.id = it.servicio_id and sv.sucursal_id = v_sucursal
  left join productos pr on it.tipo = 'producto' and pr.id = it.producto_id and pr.sucursal_id = v_sucursal;

  select count(*) filter (where invalido), count(*) filter (where es_recompensa)
    into v_invalidos, v_recompensas
  from _items;

  if v_invalidos > 0 then
    raise exception 'Hay ítems que no pertenecen al catálogo de esta sucursal' using errcode = '22023';
  end if;
  if exists (select 1 from _items where cantidad < 1 or cantidad > 50) then
    raise exception 'Cantidad inválida' using errcode = '22023';
  end if;
  if v_recompensas > 1 or exists (select 1 from _items where es_recompensa and cantidad <> 1) then
    raise exception 'Solo se puede canjear un corte gratis por venta' using errcode = '22023';
  end if;
  if v_canjear and v_recompensas = 0 then
    raise exception 'El canje necesita el servicio del corte gratis en la venta' using errcode = '22023';
  end if;

  if v_canjear then
    -- Candado de horario (0032): la venta sí puede registrarse fuera de la
    -- ventana, el canje no. El cajero debe reintentar sin canjear.
    if not canje_abierto() then
      raise exception 'Canje fuera de horario: solo lunes a viernes de 10:30 a 19:30'
        using errcode = 'P0001';
    end if;

    -- Serializa canjes del mismo cliente en la misma sucursal: sin esto dos
    -- llamadas concurrentes leían la vista a la vez y canjeaban dos veces.
    perform pg_advisory_xact_lock(hashtext('canje:' || p_cliente_id::text || ':' || v_sucursal::text));

    select coalesce(floor(cortes_total::numeric / greatest(cortes_objetivo, 1)) - recompensas_canjeadas, 0)
      into v_disp
    from cliente_loyalty
    where cliente_id = p_cliente_id and sucursal_id = v_sucursal;

    if coalesce(v_disp, 0) <= 0 then
      raise exception 'El cliente no tiene recompensa disponible en esta sucursal' using errcode = 'P0001';
    end if;
  end if;

  select coalesce(sum(precio * cantidad), 0) into v_subtotal from _items;

  if p_cupon_id is not null then
    select * into v_cupon from cupones where id = p_cupon_id for update;
    if v_cupon.id is null then
      raise exception 'Cupón no encontrado' using errcode = '22023';
    end if;
    v_descuento := cupon_descuento(v_cupon, v_subtotal);
    update cupones set usos = usos + 1 where id = v_cupon.id;
  end if;

  insert into ventas (cliente_id, barbero_id, registrado_por, sucursal_id, total, descuento, cupon_id,
                      metodo_pago, recompensa_canjeada, client_id, created_at)
  values (p_cliente_id, p_barbero_id, v_staff.id, v_sucursal, v_subtotal - v_descuento, v_descuento, p_cupon_id,
          p_metodo, v_canjear, p_client_id, v_creado)
  returning * into v_venta;

  insert into venta_items (venta_id, tipo, servicio_id, producto_id, nombre, precio, cantidad, puntos)
  select v_venta.id, tipo, servicio_id, producto_id, nombre, precio, cantidad, puntos
  from _items;

  return json_build_object('id', v_venta.id, 'total', v_venta.total, 'descuento', v_venta.descuento, 'created_at', v_venta.created_at);
end;
$$;
grant execute on function public.record_venta(uuid, uuid, metodo_pago, boolean, jsonb, uuid, uuid, uuid, timestamptz) to authenticated;

-- Verificación tras aplicar: debe devolver UNA sola fila (sin overloads zombis).
-- select oid::regprocedure from pg_proc where proname = 'record_venta';
