-- ════════════════════════════════════════════════════════════════
-- Migración: 0003_crm.sql
-- CRM completo: notas y etiquetas de cliente, soft-archive,
-- RPCs de recuperación y reportes, RLS por rol (owner/admin).
-- ════════════════════════════════════════════════════════════════

-- ── Soft-archive de clientes ────────────────────────────────────
alter table clientes add column if not exists activo boolean not null default true;

-- ── Notas internas por cliente ──────────────────────────────────
create table if not exists cliente_notas (
  id         uuid primary key default extensions.gen_random_uuid(),
  cliente_id uuid not null references clientes (id) on delete cascade,
  autor_id   uuid references staff (id) on delete set null,
  texto      text not null check (length(trim(texto)) > 0),
  created_at timestamptz not null default now()
);
create index if not exists cliente_notas_cliente_idx on cliente_notas (cliente_id, created_at desc);

-- ── Etiquetas por cliente ───────────────────────────────────────
create table if not exists cliente_etiquetas (
  cliente_id uuid not null references clientes (id) on delete cascade,
  etiqueta   text not null,
  created_at timestamptz not null default now(),
  primary key (cliente_id, etiqueta)
);

-- ════════════════════════════════════════════════════════════════
-- Helper de rol: ¿admin o dueño?
-- ════════════════════════════════════════════════════════════════
create or replace function public.is_owner_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from staff
    where user_id = auth.uid() and activo and rol in ('admin', 'dueno')
  );
$$;

-- ════════════════════════════════════════════════════════════════
-- RPC: clientes inactivos (recuperación) — sin visita en N días
-- ════════════════════════════════════════════════════════════════
create or replace function public.clientes_inactivos(p_dias int)
returns table (
  id uuid,
  numero bigint,
  nombre text,
  telefono text,
  ultima_visita timestamptz,
  dias_inactivo int
)
language sql
security invoker
stable
set search_path = public
as $$
  select
    c.id, c.numero, c.nombre, c.telefono,
    cl.ultima_visita,
    case when cl.ultima_visita is null then null
         else floor(extract(epoch from (now() - cl.ultima_visita)) / 86400)::int
    end as dias_inactivo
  from clientes c
  join cliente_loyalty cl on cl.cliente_id = c.id
  where c.activo
    and (cl.ultima_visita is null or cl.ultima_visita < now() - (p_dias || ' days')::interval)
  order by cl.ultima_visita asc nulls last;
$$;
grant execute on function public.clientes_inactivos(int) to authenticated;

-- ════════════════════════════════════════════════════════════════
-- RPC: reporte de ventas por rango de fechas
-- ════════════════════════════════════════════════════════════════
create or replace function public.reporte_ventas(p_desde date, p_hasta date)
returns json
language sql
security invoker
stable
set search_path = public
as $$
  with v as (
    select * from ventas where created_at::date between p_desde and p_hasta
  )
  select json_build_object(
    'total',  (select coalesce(sum(total), 0) from v),
    'num',    (select count(*) from v),
    'ticket', (select coalesce(round(avg(total), 2), 0) from v),
    'por_dia', (select coalesce(json_agg(d order by d.dia), '[]'::json) from (
        select created_at::date as dia, sum(total) as total, count(*) as num
        from v group by created_at::date) d),
    'top_servicios', (select coalesce(json_agg(t), '[]'::json) from (
        select vi.nombre, count(*) as n, sum(vi.precio * vi.cantidad) as monto
        from venta_items vi join v on v.id = vi.venta_id
        where vi.tipo = 'servicio' group by vi.nombre order by n desc limit 8) t),
    'top_productos', (select coalesce(json_agg(t), '[]'::json) from (
        select vi.nombre, count(*) as n, sum(vi.precio * vi.cantidad) as monto
        from venta_items vi join v on v.id = vi.venta_id
        where vi.tipo = 'producto' group by vi.nombre order by n desc limit 8) t),
    'top_barberos', (select coalesce(json_agg(t), '[]'::json) from (
        select b.nombre, count(*) as n, sum(v.total) as monto
        from v join barberos b on b.id = v.barbero_id
        group by b.nombre order by n desc limit 8) t)
  );
$$;
grant execute on function public.reporte_ventas(date, date) to authenticated;

-- ════════════════════════════════════════════════════════════════
-- RLS de las tablas nuevas (cualquier staff activo)
-- ════════════════════════════════════════════════════════════════
alter table cliente_notas     enable row level security;
alter table cliente_etiquetas enable row level security;

create policy cliente_notas_rw on cliente_notas
  for all using (is_active_staff()) with check (is_active_staff());
create policy cliente_etiquetas_rw on cliente_etiquetas
  for all using (is_active_staff()) with check (is_active_staff());

-- Lectura de la view de lealtad para staff (listas/fichas del CRM).
grant select on cliente_loyalty to authenticated;

-- ════════════════════════════════════════════════════════════════
-- RLS por rol: escritura de catálogo y config solo admin/dueño
-- (la lectura sigue disponible para todo staff vía las policies *_read)
-- ════════════════════════════════════════════════════════════════
alter policy servicios_write on servicios using (is_owner_admin()) with check (is_owner_admin());
alter policy productos_write on productos using (is_owner_admin()) with check (is_owner_admin());
alter policy barberos_write  on barberos  using (is_owner_admin()) with check (is_owner_admin());

-- Config de lealtad: actualizar solo admin/dueño.
create policy config_update on config_lealtad
  for update using (is_owner_admin()) with check (is_owner_admin());
