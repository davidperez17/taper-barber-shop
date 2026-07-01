-- ════════════════════════════════════════════════════════════════
-- Migración: 0018_push.sql
-- Suscripciones de notificaciones push (Web Push / VAPID), para clientes
-- y staff. La escritura se hace desde el servidor con la service-role
-- (salta RLS), validando la sesión antes de operar — por eso aquí NO se
-- agregan policies (RLS habilitada = deny-by-default para el anon key).
--   - owner_type: 'cliente' → clientes.id ; 'staff' → staff.id.
--   - endpoint es único: una fila por navegador/dispositivo suscrito.
--   - sucursal_id: para segmentar difusiones por sucursal.
-- ════════════════════════════════════════════════════════════════

create table if not exists push_subscriptions (
  id          uuid primary key default extensions.gen_random_uuid(),
  owner_type  text not null check (owner_type in ('cliente', 'staff')),
  owner_id    uuid not null,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  sucursal_id uuid references sucursales (id) on delete set null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);

create index if not exists push_subs_owner_idx on push_subscriptions (owner_type, owner_id);
create index if not exists push_subs_sucursal_idx on push_subscriptions (sucursal_id);

-- RLS on, sin policies: solo la service-role (servidor) puede leer/escribir.
alter table push_subscriptions enable row level security;
