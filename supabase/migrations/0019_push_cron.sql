-- ════════════════════════════════════════════════════════════════
-- Migración: 0019_push_cron.sql
-- Soporte para las notificaciones programadas (Vercel Cron):
--   - citas.recordatorio_enviado: idempotencia del recordatorio (no repetir).
--   - notificaciones_log: throttle de envíos recurrentes (ej. reactivación),
--     para no molestar al mismo cliente muchas veces.
-- Escritura solo desde el servidor con service-role; RLS on sin policies.
-- ════════════════════════════════════════════════════════════════

alter table citas add column if not exists recordatorio_enviado boolean not null default false;

create table if not exists notificaciones_log (
  id         uuid primary key default extensions.gen_random_uuid(),
  owner_type text not null check (owner_type in ('cliente', 'staff')),
  owner_id   uuid not null,
  tipo       text not null,                       -- 'reactivacion', etc.
  created_at timestamptz not null default now()
);

create index if not exists notif_log_owner_idx on notificaciones_log (owner_id, tipo, created_at desc);

alter table notificaciones_log enable row level security;
