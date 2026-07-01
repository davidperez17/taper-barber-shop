-- ════════════════════════════════════════════════════════════════
-- Migración: 0015_sucursales.sql  (Fase A — cimientos multi-sucursal)
-- 1 cuenta → N sucursales. Catálogo POR sucursal; clientes/lealtad/cupones
-- compartidos. Cajero/barbero atados a su sucursal; dueño/admin ven todas.
--
-- NO-ROMPE: la sucursal principal usa un uuid fijo y las columnas nuevas son
-- NOT NULL DEFAULT ese uuid. Así lo existente y las escrituras que aún no
-- pasan sucursal_id (record_venta, catálogo) caen en "Sucursal principal"
-- hasta la Fase B, sin fallar.
-- ════════════════════════════════════════════════════════════════

create table if not exists sucursales (
  id         uuid primary key default extensions.gen_random_uuid(),
  nombre     text not null,
  direccion  text,
  telefono   text,
  activo     boolean not null default true,
  orden      int not null default 0,
  created_at timestamptz not null default now()
);

-- Cuenta (singleton): plan y límite de sucursales.
create table if not exists cuenta (
  id             smallint primary key default 1,
  max_sucursales int not null default 2,
  constraint cuenta_singleton check (id = 1)
);
insert into cuenta (id) values (1) on conflict (id) do nothing;

-- Sucursal principal con uuid fijo (destino del backfill / default).
insert into sucursales (id, nombre, orden)
values ('00000000-0000-0000-0000-000000000001', 'Sucursal principal', 0)
on conflict (id) do nothing;

-- ── sucursal_id NOT NULL DEFAULT principal (backfill automático) ──
alter table servicios              add column if not exists sucursal_id uuid not null default '00000000-0000-0000-0000-000000000001' references sucursales (id) on delete cascade;
alter table productos              add column if not exists sucursal_id uuid not null default '00000000-0000-0000-0000-000000000001' references sucursales (id) on delete cascade;
alter table barberos               add column if not exists sucursal_id uuid not null default '00000000-0000-0000-0000-000000000001' references sucursales (id) on delete cascade;
alter table ventas                 add column if not exists sucursal_id uuid not null default '00000000-0000-0000-0000-000000000001' references sucursales (id) on delete cascade;
alter table caja_movimientos       add column if not exists sucursal_id uuid not null default '00000000-0000-0000-0000-000000000001' references sucursales (id) on delete cascade;
alter table cierres_caja           add column if not exists sucursal_id uuid not null default '00000000-0000-0000-0000-000000000001' references sucursales (id) on delete cascade;
alter table inventario_movimientos add column if not exists sucursal_id uuid not null default '00000000-0000-0000-0000-000000000001' references sucursales (id) on delete cascade;
alter table citas                  add column if not exists sucursal_id uuid not null default '00000000-0000-0000-0000-000000000001' references sucursales (id) on delete cascade;
-- staff: sucursal de asignación (dueño/admin la ignoran; ven todas).
alter table staff                  add column if not exists sucursal_id uuid not null default '00000000-0000-0000-0000-000000000001' references sucursales (id) on delete set null;

-- Cierre de caja: ahora es uno por (día, sucursal).
alter table cierres_caja drop constraint if exists cierres_caja_fecha_key;
alter table cierres_caja add constraint cierres_caja_fecha_sucursal_key unique (fecha, sucursal_id);

-- Índices para filtrar por sucursal.
create index if not exists ventas_sucursal_idx    on ventas (sucursal_id);
create index if not exists citas_sucursal_idx     on citas (sucursal_id);
create index if not exists caja_mov_sucursal_idx  on caja_movimientos (sucursal_id, fecha);
create index if not exists servicios_sucursal_idx on servicios (sucursal_id);
create index if not exists productos_sucursal_idx on productos (sucursal_id);

-- ── RLS: lectura para staff activo; escritura solo dueño ────────
alter table sucursales enable row level security;
alter table cuenta     enable row level security;

create policy sucursales_read  on sucursales for select using (is_active_staff());
create policy sucursales_write on sucursales for all using (is_owner()) with check (is_owner());
create policy cuenta_read      on cuenta     for select using (is_active_staff());
create policy cuenta_write     on cuenta     for all using (is_owner()) with check (is_owner());
