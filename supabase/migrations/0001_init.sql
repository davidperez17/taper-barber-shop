-- ════════════════════════════════════════════════════════════════
-- Migración: 0001_init.sql
-- Taper Barbershop — Schema inicial (Fase 1 MVP)
-- Postgres / Supabase
-- ════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

-- ── Enums ───────────────────────────────────────────────────────
create type rol_staff   as enum ('cajero', 'barbero', 'admin', 'dueno');
create type item_tipo   as enum ('servicio', 'producto');
create type metodo_pago as enum ('efectivo', 'tarjeta', 'transferencia');

-- ── Config del programa de lealtad (single row) ─────────────────
create table config_lealtad (
  id              smallint primary key default 1,
  cortes_objetivo int  not null default 6,
  ventana_meses   int  not null default 12,
  constraint solo_una_fila check (id = 1)
);
insert into config_lealtad (id) values (1);

-- ── Staff (usuarios del panel admin, ligados a auth.users) ──────
create table staff (
  id         uuid primary key default extensions.gen_random_uuid(),
  user_id    uuid unique references auth.users (id) on delete cascade,
  nombre     text not null,
  rol        rol_staff not null default 'cajero',
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Barberos (atribución de venta; pueden no tener login) ───────
create table barberos (
  id         uuid primary key default extensions.gen_random_uuid(),
  nombre     text not null,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Clientes (PWA; identidad = qr_token, sin password) ──────────
create table clientes (
  id         uuid primary key default extensions.gen_random_uuid(),
  numero     bigint generated always as identity,           -- id corto para mostrar (#00847)
  nombre     text not null,
  telefono   text not null unique,
  correo     text,
  qr_token   text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  created_at timestamptz not null default now()
);
create index clientes_telefono_idx on clientes (telefono);
create index clientes_nombre_idx   on clientes (lower(nombre));

-- ── Servicios ───────────────────────────────────────────────────
create table servicios (
  id             uuid primary key default extensions.gen_random_uuid(),
  nombre         text not null,
  precio         numeric(10, 2) not null check (precio >= 0),
  categoria      text,
  duracion_min   int,
  cuenta_lealtad boolean not null default true,   -- ¿suma corte al programa?
  activo         boolean not null default true,
  orden          int not null default 0,          -- frecuentes primero en el POS
  created_at     timestamptz not null default now()
);

-- ── Productos ───────────────────────────────────────────────────
create table productos (
  id         uuid primary key default extensions.gen_random_uuid(),
  nombre     text not null,
  precio     numeric(10, 2) not null check (precio >= 0),
  categoria  text,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Ventas ──────────────────────────────────────────────────────
create table ventas (
  id                  uuid primary key default extensions.gen_random_uuid(),
  cliente_id          uuid not null references clientes (id) on delete restrict,
  barbero_id          uuid references barberos (id) on delete set null,
  registrado_por      uuid references staff (id) on delete set null,
  total               numeric(10, 2) not null check (total >= 0),
  metodo_pago         metodo_pago not null default 'efectivo',
  recompensa_canjeada boolean not null default false,   -- esta venta canjeó un corte gratis
  created_at          timestamptz not null default now()
);
create index ventas_cliente_idx on ventas (cliente_id, created_at desc);

-- ── Detalle de venta (snapshot de nombre/precio al momento) ─────
create table venta_items (
  id          uuid primary key default extensions.gen_random_uuid(),
  venta_id    uuid not null references ventas (id) on delete cascade,
  tipo        item_tipo not null,
  servicio_id uuid references servicios (id) on delete set null,
  producto_id uuid references productos (id) on delete set null,
  nombre      text not null,
  precio      numeric(10, 2) not null check (precio >= 0),
  cantidad    int not null default 1 check (cantidad > 0)
);
create index venta_items_venta_idx on venta_items (venta_id);

-- ════════════════════════════════════════════════════════════════
-- View de lealtad — datos crudos por cliente (la presentación
-- (tier/labels/progreso) la calcula lib/loyalty.ts).
-- "Corte" = venta que incluye >=1 servicio con cuenta_lealtad.
-- ════════════════════════════════════════════════════════════════
create or replace view cliente_loyalty as
with cortes as (
  select
    v.cliente_id,
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
  c.id as cliente_id,
  count(co.venta_id)                                          as cortes_total,
  count(co.venta_id) filter (
    where co.created_at >= now() - (cfg.ventana_meses || ' months')::interval
  )                                                           as visitas_12m,
  count(co.venta_id) filter (where co.recompensa_canjeada)    as recompensas_canjeadas,
  max(co.created_at)                                          as ultima_visita,
  cfg.cortes_objetivo
from clientes c
cross join config_lealtad cfg
left join cortes co on co.cliente_id = c.id
group by c.id, cfg.cortes_objetivo;

-- ════════════════════════════════════════════════════════════════
-- Helper: ¿el request viene de staff activo?
-- ════════════════════════════════════════════════════════════════
create or replace function public.is_active_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from staff
    where user_id = auth.uid() and activo
  );
$$;

-- ════════════════════════════════════════════════════════════════
-- RPCs para la PWA cliente (anon, sin auth). SECURITY DEFINER.
-- ════════════════════════════════════════════════════════════════

-- Registro rápido desde el punto de venta o la PWA.
create or replace function public.register_cliente(
  p_nombre   text,
  p_telefono text,
  p_correo   text default null
)
returns clientes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente clientes;
begin
  if coalesce(trim(p_nombre), '') = '' then
    raise exception 'nombre requerido' using errcode = '23514';
  end if;
  if coalesce(trim(p_telefono), '') = '' then
    raise exception 'telefono requerido' using errcode = '23514';
  end if;

  insert into clientes (nombre, telefono, correo)
  values (trim(p_nombre), trim(p_telefono), nullif(trim(p_correo), ''))
  returning * into v_cliente;

  return v_cliente;
exception
  when unique_violation then
    raise exception 'Ya existe un cliente con ese teléfono' using errcode = 'P0001';
end;
$$;

-- Dashboard del cliente por QR (lo usa la PWA y el escáner admin).
create or replace function public.get_cliente_by_qr(p_qr_token text)
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_cliente clientes;
  v_loyalty cliente_loyalty;
  v_historial json;
begin
  select * into v_cliente from clientes where qr_token = p_qr_token;
  if not found then
    return null;
  end if;

  select * into v_loyalty from cliente_loyalty where cliente_id = v_cliente.id;

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
    'loyalty', json_build_object(
      'cortes_total', coalesce(v_loyalty.cortes_total, 0),
      'visitas_12m', coalesce(v_loyalty.visitas_12m, 0),
      'recompensas_canjeadas', coalesce(v_loyalty.recompensas_canjeadas, 0),
      'cortes_objetivo', coalesce(v_loyalty.cortes_objetivo, 6),
      'ultima_visita', v_loyalty.ultima_visita
    ),
    'historial', v_historial
  );
end;
$$;

-- ════════════════════════════════════════════════════════════════
-- Row Level Security
--   · tablas: solo staff activo (panel admin)
--   · PWA cliente: accede vía RPCs security definer (anon)
-- ════════════════════════════════════════════════════════════════
alter table staff           enable row level security;
alter table barberos        enable row level security;
alter table clientes        enable row level security;
alter table servicios       enable row level security;
alter table productos       enable row level security;
alter table ventas          enable row level security;
alter table venta_items     enable row level security;
alter table config_lealtad  enable row level security;

-- Staff puede verse a sí mismo (para resolver su rol tras login).
create policy staff_self_select on staff
  for select using (user_id = auth.uid());

-- Lectura general para staff activo.
create policy barberos_read    on barberos       for select using (is_active_staff());
create policy clientes_read    on clientes        for select using (is_active_staff());
create policy servicios_read   on servicios       for select using (is_active_staff());
create policy productos_read   on productos       for select using (is_active_staff());
create policy ventas_read      on ventas          for select using (is_active_staff());
create policy venta_items_read on venta_items     for select using (is_active_staff());
create policy config_read      on config_lealtad  for select using (is_active_staff());

-- Escritura de ventas: cualquier staff activo (cajero+).
create policy ventas_insert      on ventas      for insert with check (is_active_staff());
create policy ventas_update      on ventas      for update using (is_active_staff());
create policy venta_items_insert on venta_items for insert with check (is_active_staff());

-- Alta de clientes desde el panel.
create policy clientes_insert on clientes for insert with check (is_active_staff());
create policy clientes_update on clientes for update using (is_active_staff());

-- Gestión de catálogo: admin/dueño.
create policy servicios_write on servicios
  for all using (is_active_staff()) with check (is_active_staff());
create policy productos_write on productos
  for all using (is_active_staff()) with check (is_active_staff());
create policy barberos_write on barberos
  for all using (is_active_staff()) with check (is_active_staff());

-- Permisos de ejecución de los RPCs públicos.
grant execute on function public.register_cliente(text, text, text) to anon, authenticated;
grant execute on function public.get_cliente_by_qr(text)            to anon, authenticated;
