-- ════════════════════════════════════════════════════════════════
-- Migración: 0012_agenda.sql
-- Agenda de citas gestionada por el staff (no autoservicio del cliente).
-- Pensada para clientes con evento importante. Cada cita tiene ubicación:
-- en la barbería o a domicilio/lugar del evento (con dirección).
-- Fechas en timestamptz; la app filtra por día en hora local de Guatemala.
-- ════════════════════════════════════════════════════════════════

create type cita_ubicacion as enum ('barberia', 'domicilio');
create type cita_estado    as enum ('pendiente', 'confirmada', 'completada', 'cancelada');

create table if not exists citas (
  id             uuid primary key default extensions.gen_random_uuid(),
  cliente_id     uuid references clientes (id)  on delete set null,
  cliente_nombre text,                                   -- nombre libre si no está registrado
  barbero_id     uuid references barberos (id)  on delete set null,
  servicio_id    uuid references servicios (id) on delete set null,
  inicia_en      timestamptz not null,
  duracion_min   int not null default 30 check (duracion_min > 0),
  ubicacion      cita_ubicacion not null default 'barberia',
  direccion      text,                                   -- requerida a nivel app cuando ubicacion = domicilio
  nota           text,
  estado         cita_estado not null default 'pendiente',
  creada_por     uuid references staff (id) on delete set null,
  created_at     timestamptz not null default now(),
  -- Debe haber a quién atender: cliente registrado o nombre libre.
  constraint citas_cliente_chk check (cliente_id is not null or nullif(trim(cliente_nombre), '') is not null)
);
create index if not exists citas_inicia_idx on citas (inicia_en);

-- ── RLS: cualquier staff activo gestiona la agenda ──────────────
alter table citas enable row level security;

create policy citas_read on citas for select to authenticated
  using (exists (select 1 from staff s where s.user_id = auth.uid() and s.activo));
create policy citas_write on citas for all to authenticated
  using (exists (select 1 from staff s where s.user_id = auth.uid() and s.activo))
  with check (exists (select 1 from staff s where s.user_id = auth.uid() and s.activo));
