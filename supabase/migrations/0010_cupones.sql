-- ════════════════════════════════════════════════════════════════
-- Migración: 0010_cupones.sql
-- Cupones y descuentos aplicables en el POS.
-- - cupones: código único, tipo porcentaje|monto, vigencia y límite de usos.
-- - ventas: se añade cupon_id y descuento (monto descontado del subtotal).
-- - record_venta: recibe p_cupon_id y calcula el descuento EN EL SERVIDOR
--   (nunca se confía en el total que manda el cliente).
-- - cupon_validar: preview del descuento para el POS antes de confirmar.
-- Fechas de vigencia en hora local de Guatemala.
-- ════════════════════════════════════════════════════════════════

create table if not exists cupones (
  id             uuid primary key default extensions.gen_random_uuid(),
  codigo         text not null unique,
  tipo           text not null check (tipo in ('porcentaje', 'monto')),
  valor          numeric(10, 2) not null check (valor > 0),
  min_compra     numeric(10, 2) not null default 0 check (min_compra >= 0),
  vigencia_desde date,
  vigencia_hasta date,
  usos_max       int check (usos_max is null or usos_max > 0),  -- null = ilimitado
  usos           int not null default 0,
  activo         boolean not null default true,
  created_at     timestamptz not null default now()
);
-- El código se guarda siempre en mayúsculas (normalizado por la app y las RPC).

alter table ventas add column if not exists cupon_id uuid references cupones (id) on delete set null;
alter table ventas add column if not exists descuento numeric(10, 2) not null default 0 check (descuento >= 0);

-- ── RLS: lectura para staff activo; escritura solo admin/dueño ────
alter table cupones enable row level security;

create policy cupones_read on cupones for select to authenticated
  using (exists (select 1 from staff s where s.user_id = auth.uid() and s.activo));
create policy cupones_write on cupones for all to authenticated
  using (is_owner_admin()) with check (is_owner_admin());

-- ════════════════════════════════════════════════════════════════
-- Cálculo de descuento (compartido por cupon_validar y record_venta).
-- Devuelve el monto a descontar; lanza excepción si el cupón no aplica.
-- ════════════════════════════════════════════════════════════════
create or replace function public.cupon_descuento(p_cupon cupones, p_subtotal numeric)
returns numeric
language plpgsql
immutable
set search_path = public
as $$
declare
  v_hoy date := (now() at time zone 'America/Guatemala')::date;
  v_desc numeric(10, 2);
begin
  if not p_cupon.activo then
    raise exception 'Cupón inactivo' using errcode = '22023';
  end if;
  if p_cupon.vigencia_desde is not null and v_hoy < p_cupon.vigencia_desde then
    raise exception 'El cupón aún no está vigente' using errcode = '22023';
  end if;
  if p_cupon.vigencia_hasta is not null and v_hoy > p_cupon.vigencia_hasta then
    raise exception 'El cupón ya venció' using errcode = '22023';
  end if;
  if p_cupon.usos_max is not null and p_cupon.usos >= p_cupon.usos_max then
    raise exception 'El cupón agotó sus usos' using errcode = '22023';
  end if;
  if p_subtotal < p_cupon.min_compra then
    raise exception 'La compra no alcanza el mínimo del cupón' using errcode = '22023';
  end if;

  if p_cupon.tipo = 'porcentaje' then
    v_desc := round(p_subtotal * p_cupon.valor / 100, 2);
  else
    v_desc := p_cupon.valor;
  end if;
  -- El descuento nunca supera el subtotal.
  return least(v_desc, p_subtotal);
end;
$$;

-- ── Preview del cupón para el POS (staff autenticado) ────────────
create or replace function public.cupon_validar(p_codigo text, p_subtotal numeric)
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_cupon cupones;
  v_desc  numeric(10, 2);
begin
  if not exists (select 1 from staff where user_id = auth.uid() and activo) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select * into v_cupon from cupones where codigo = upper(trim(p_codigo));
  if v_cupon.id is null then
    return json_build_object('ok', false, 'error', 'Cupón no encontrado');
  end if;

  begin
    v_desc := cupon_descuento(v_cupon, coalesce(p_subtotal, 0));
  exception when others then
    return json_build_object('ok', false, 'error', sqlerrm);
  end;

  return json_build_object(
    'ok', true,
    'cupon_id', v_cupon.id,
    'codigo', v_cupon.codigo,
    'tipo', v_cupon.tipo,
    'valor', v_cupon.valor,
    'descuento', v_desc
  );
end;
$$;
grant execute on function public.cupon_validar(text, numeric) to authenticated;

-- ════════════════════════════════════════════════════════════════
-- record_venta: se reemplaza para aceptar cupón. Se descarta la
-- firma anterior (uuid,uuid,metodo_pago,boolean,jsonb).
-- ════════════════════════════════════════════════════════════════
drop function if exists public.record_venta(uuid, uuid, metodo_pago, boolean, jsonb);

create or replace function public.record_venta(
  p_cliente_id uuid,
  p_barbero_id uuid,
  p_metodo     metodo_pago,
  p_canjear    boolean,
  p_items      jsonb,
  p_cupon_id   uuid default null
)
returns json
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_venta    ventas;
  v_subtotal numeric(10, 2);
  v_descuento numeric(10, 2) := 0;
  v_cupon    cupones;
  v_staff    uuid;
begin
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'La venta no tiene items' using errcode = '23514';
  end if;

  select id into v_staff from staff where user_id = auth.uid();

  select coalesce(sum((i->>'precio')::numeric * coalesce((i->>'cantidad')::int, 1)), 0)
    into v_subtotal
  from jsonb_array_elements(p_items) i;

  -- Cupón: se revalida y se calcula el descuento en el servidor.
  if p_cupon_id is not null then
    select * into v_cupon from cupones where id = p_cupon_id for update;
    if v_cupon.id is null then
      raise exception 'Cupón no encontrado' using errcode = '22023';
    end if;
    v_descuento := cupon_descuento(v_cupon, v_subtotal);
    update cupones set usos = usos + 1 where id = v_cupon.id;
  end if;

  insert into ventas (cliente_id, barbero_id, registrado_por, total, descuento, cupon_id, metodo_pago, recompensa_canjeada)
  values (p_cliente_id, p_barbero_id, v_staff, v_subtotal - v_descuento, v_descuento, p_cupon_id, p_metodo, coalesce(p_canjear, false))
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
grant execute on function public.record_venta(uuid, uuid, metodo_pago, boolean, jsonb, uuid) to authenticated;
