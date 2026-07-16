-- ════════════════════════════════════════════════════════════════
-- Migración: 0029_fix_record_venta_permisos.sql
-- FIX CRÍTICO: cajero y barbero NO podían registrar ventas.
--   ERROR: new row violates row-level security policy for table "ventas"
--
-- Causa (regresión de 0014, no de 0028). `record_venta` es `security
-- invoker` y hace:
--     insert into ventas (...) values (...) returning * into v_venta;
-- En Postgres, un INSERT ... RETURNING **aplica la policy de SELECT** a la
-- fila devuelta (docs 5.9: "if read access is required to the new row, e.g.
-- a RETURNING clause"). La 0014 restringió `ventas_read` a is_owner_admin()
-- para que un cajero no pudiera leer facturación por API — pero con eso el
-- RETURNING de record_venta pasó a fallar para todo el que no sea
-- admin/dueño. El comentario de 0014 ("nadie lee esas tablas bajo la RLS
-- del que llama") pasó por alto que `returning *` ES una lectura.
--
-- Pasó desapercibido porque hasta ahora todo el staff era admin/dueño.
-- Reproducido en Postgres 18 (PGlite): dueño/admin OK; cajero/barbero
-- fallan; sin el `returning` el cajero pasa → aísla la causa.
--
-- Segundo fallo que el primero ENMASCARABA (mismo origen, otra tabla):
--     select * into v_cupon from cupones where id = p_cupon_id for update;
--     update cupones set usos = usos + 1 where id = v_cupon.id;
-- `cupones_write` (0010) es `for all using (is_owner_admin())`. Un SELECT
-- FOR UPDATE aplica también la USING de UPDATE → el cupón "no existe" para
-- un cajero; y el UPDATE afectaría 0 filas EN SILENCIO (usos nunca sube,
-- el límite de usos deja de valer). Nunca se vio porque el insert de
-- `ventas` reventaba antes de llegar aquí.
--
-- Fix: `record_venta` pasa a **security definer + guarda is_active_staff()
-- explícita**, que es la convención ya establecida en este repo para
-- escrituras que cruzan RLS de varias tablas:
--   · trigger `venta_item_descuenta_stock` (0011) → definer, con el mismo
--     motivo textual: "salta la RLS de productos (un cajero puede vender)".
--   · reportes/dashboard (0014) → definer + guarda is_owner_admin().
-- La autorización no se pierde, se hace explícita: staff inactivo o
-- usuario sin fila en `staff` → "No autorizado" (42501). Verificado.
--
-- `ventas_read`/`venta_items_read` NO se tocan: siguen admin/dueño, que es
-- justo lo que 0014 quería. Cuerpo idéntico a 0028 salvo la guarda.
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
  -- Cubre lo mismo que cubrían ventas_insert / venta_items_insert
  -- (`with check (is_active_staff())`): staff activo, cualquier rol.
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

  -- puntos = puntos_del_catalogo × cantidad (0028). Alias `sv`/`pr` (no
  -- `s`/`p`) para no coquetear con la resolución de identificadores de plpgsql.
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
