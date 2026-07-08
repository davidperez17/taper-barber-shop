-- 0026_admin_editar_cliente
-- Panel (solo dueño/admin): anular venta, editar venta y ajuste manual de sellos.
--
-- Estrategia de mínimo riesgo:
--  • Anular = archiva la venta y la BORRA (cascade venta_items). Como toda la
--    lealtad/reportes/caja se derivan de `ventas`, se recalculan solos sin tocar
--    ninguna otra función. El archivo `ventas_anuladas` conserva la auditoría.
--  • Editar = UPDATE directo de total/método/barbero en `ventas`.
--  • Ajustar sellos = tabla `ajustes_lealtad` (delta +/-) sumada ÚNICAMENTE en la
--    vista `cliente_loyalty`.
-- Toda escritura pasa por RPC security definer con guardia is_owner_admin().

-- ── Archivo de ventas anuladas (auditoría) ──────────────────────
create table if not exists ventas_anuladas (
  id          uuid primary key,
  cliente_id  uuid not null,
  sucursal_id uuid,
  total       numeric(10, 2),
  motivo      text,
  snapshot    jsonb not null,   -- { venta: fila, items: [...] } al momento de anular
  anulada_por uuid references staff (id) on delete set null,
  anulada_at  timestamptz not null default now()
);
alter table ventas_anuladas enable row level security;
create policy ventas_anuladas_read on ventas_anuladas for select using (is_owner_admin());

-- ── Ajustes manuales de sellos (delta +/-) por cliente+sucursal ─
create table if not exists ajustes_lealtad (
  id          uuid primary key default extensions.gen_random_uuid(),
  cliente_id  uuid not null references clientes (id) on delete cascade,
  sucursal_id uuid not null references sucursales (id) on delete cascade,
  delta       int  not null check (delta <> 0),
  motivo      text,
  creado_por  uuid references staff (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists ajustes_lealtad_idx on ajustes_lealtad (cliente_id, sucursal_id);
alter table ajustes_lealtad enable row level security;
create policy ajustes_lealtad_read on ajustes_lealtad for select using (is_active_staff());
-- Escritura solo vía RPC (abajo); sin policy de insert directa.

-- ── Vista de lealtad: cortes derivados de ventas + ajustes manuales ─
-- (idéntica a 0023 salvo la suma de `ajustes_lealtad` en cortes_total y las
--  claves cliente/sucursal que también incluyen clientes con solo ajustes.)
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

-- ── RPC: anular venta (archiva + borra) ─────────────────────────
create or replace function public.venta_anular(p_venta_id uuid, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff uuid;
  v_row   ventas;
begin
  if not is_owner_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select id into v_staff from staff where user_id = auth.uid();
  select * into v_row from ventas where id = p_venta_id;
  if not found then
    raise exception 'Venta no encontrada';
  end if;

  insert into ventas_anuladas (id, cliente_id, sucursal_id, total, motivo, snapshot, anulada_por)
  values (
    v_row.id, v_row.cliente_id, v_row.sucursal_id, v_row.total, p_motivo,
    jsonb_build_object(
      'venta', to_jsonb(v_row),
      'items', (select coalesce(jsonb_agg(to_jsonb(vi)), '[]'::jsonb) from venta_items vi where vi.venta_id = v_row.id)
    ),
    v_staff
  );

  delete from ventas where id = p_venta_id;  -- cascade borra venta_items
end;
$$;
grant execute on function public.venta_anular(uuid, text) to authenticated;

-- ── RPC: editar venta (total / método / barbero) ────────────────
create or replace function public.venta_editar(
  p_venta_id   uuid,
  p_total      numeric,
  p_metodo     metodo_pago,
  p_barbero_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_owner_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_total < 0 then
    raise exception 'Total inválido';
  end if;
  update ventas
     set total = p_total, metodo_pago = p_metodo, barbero_id = p_barbero_id
   where id = p_venta_id;
  if not found then
    raise exception 'Venta no encontrada';
  end if;
end;
$$;
grant execute on function public.venta_editar(uuid, numeric, metodo_pago, uuid) to authenticated;

-- ── RPC: ajuste manual de sellos ────────────────────────────────
create or replace function public.ajuste_lealtad_crear(
  p_cliente_id  uuid,
  p_sucursal_id uuid,
  p_delta       int,
  p_motivo      text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff uuid;
begin
  if not is_owner_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_delta = 0 then
    raise exception 'El ajuste no puede ser 0';
  end if;
  select id into v_staff from staff where user_id = auth.uid();
  insert into ajustes_lealtad (cliente_id, sucursal_id, delta, motivo, creado_por)
  values (p_cliente_id, p_sucursal_id, p_delta, p_motivo, v_staff);
end;
$$;
grant execute on function public.ajuste_lealtad_crear(uuid, uuid, int, text) to authenticated;
