-- ════════════════════════════════════════════════════════════════
-- Migración: 0020_notificaciones.sql
-- Bandeja de notificaciones del cliente. Persiste lo que se le avisa
-- (recompensas, citas, recordatorios, reactivación, promos) para que la
-- campana del header muestre un historial, exista o no push activo.
--   - La push sigue siendo el canal de entrega; esta tabla es el registro.
--   - Escritura/lectura desde el servidor con service-role (valida sesión
--     por qr_token antes de operar); RLS on sin policies = deny anon.
-- ════════════════════════════════════════════════════════════════

create table if not exists notificaciones (
  id         uuid primary key default extensions.gen_random_uuid(),
  cliente_id uuid not null references clientes (id) on delete cascade,
  tipo       text not null default 'general',
  titulo     text not null,
  cuerpo     text not null,
  url        text,
  leida      boolean not null default false,
  created_at timestamptz not null default now()
);

-- Listado por cliente, más recientes primero.
create index if not exists notificaciones_cliente_idx
  on notificaciones (cliente_id, created_at desc);

-- Conteo de no leídas (badge de la campana).
create index if not exists notificaciones_no_leidas_idx
  on notificaciones (cliente_id) where not leida;

alter table notificaciones enable row level security;
