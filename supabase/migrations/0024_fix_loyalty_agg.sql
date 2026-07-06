-- 0024_fix_loyalty_agg
-- Fix: get_cliente_by_qr lanzaba `missing FROM-clause entry for table "t"`
-- (digest 635741703) al validar/cargar un cliente. En 0023 el json_agg de
-- loyalty_sucursales ordenaba por `t.orden`, pero `t` es solo la COLUMNA json
-- del subquery (cuyo alias es `s`), no una tabla → Postgres lo leía como
-- tabla.columna. Se corrige a `s.t` / `s.orden`. Misma firma (text, uuid),
-- solo cambia esa línea; el resto es idéntico a 0023.

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
