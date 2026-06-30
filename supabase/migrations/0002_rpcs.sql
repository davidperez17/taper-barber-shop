-- ════════════════════════════════════════════════════════════════
-- Migración: 0002_rpcs.sql
-- RPCs adicionales: login cliente (PWA), registro de venta (admin),
-- métricas de dashboard (dueño).
-- ════════════════════════════════════════════════════════════════

-- ── Login cliente por teléfono → devuelve qr_token (anon) ───────
create or replace function public.login_cliente(p_telefono text)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select qr_token
  from clientes
  where telefono = trim(p_telefono)
  limit 1;
$$;
grant execute on function public.login_cliente(text) to anon, authenticated;

-- ── Registro de venta atómico (staff autenticado, bajo RLS) ─────
-- p_items: jsonb array de { tipo, servicio_id?, producto_id?, nombre, precio, cantidad? }
create or replace function public.record_venta(
  p_cliente_id uuid,
  p_barbero_id uuid,
  p_metodo     metodo_pago,
  p_canjear    boolean,
  p_items      jsonb
)
returns json
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_venta ventas;
  v_total numeric(10, 2);
  v_staff uuid;
begin
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'La venta no tiene items' using errcode = '23514';
  end if;

  select id into v_staff from staff where user_id = auth.uid();

  select coalesce(sum((i->>'precio')::numeric * coalesce((i->>'cantidad')::int, 1)), 0)
    into v_total
  from jsonb_array_elements(p_items) i;

  insert into ventas (cliente_id, barbero_id, registrado_por, total, metodo_pago, recompensa_canjeada)
  values (p_cliente_id, p_barbero_id, v_staff, v_total, p_metodo, coalesce(p_canjear, false))
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

  return json_build_object('id', v_venta.id, 'total', v_venta.total, 'created_at', v_venta.created_at);
end;
$$;
grant execute on function public.record_venta(uuid, uuid, metodo_pago, boolean, jsonb) to authenticated;

-- ── Métricas del dashboard del dueño (staff autenticado) ────────
create or replace function public.dashboard_metrics()
returns json
language sql
security invoker
stable
set search_path = public
as $$
  select json_build_object(
    'ventas_hoy',         (select coalesce(sum(total), 0) from ventas where created_at::date = current_date),
    'num_ventas_hoy',     (select count(*) from ventas where created_at::date = current_date),
    'ventas_mes',         (select coalesce(sum(total), 0) from ventas where date_trunc('month', created_at) = date_trunc('month', now())),
    'ticket_promedio',    (select coalesce(round(avg(total), 2), 0) from ventas where date_trunc('month', created_at) = date_trunc('month', now())),
    'clientes_total',     (select count(*) from clientes),
    'clientes_activos',   (select count(distinct cliente_id) from ventas where created_at >= now() - interval '30 days'),
    'clientes_inactivos', (select count(*) from clientes c where not exists (
                             select 1 from ventas v where v.cliente_id = c.id and v.created_at >= now() - interval '30 days')),
    'top_servicios',      (select coalesce(json_agg(t), '[]'::json) from (
                             select nombre, count(*) as n from venta_items where tipo = 'servicio'
                             group by nombre order by n desc limit 5) t),
    'top_productos',      (select coalesce(json_agg(t), '[]'::json) from (
                             select nombre, count(*) as n from venta_items where tipo = 'producto'
                             group by nombre order by n desc limit 5) t),
    'top_barbero',        (select b.nombre from ventas v join barberos b on b.id = v.barbero_id
                             where v.created_at >= now() - interval '30 days'
                             group by b.nombre order by count(*) desc limit 1)
  );
$$;
grant execute on function public.dashboard_metrics() to authenticated;
