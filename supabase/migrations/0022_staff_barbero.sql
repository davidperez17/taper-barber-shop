-- ════════════════════════════════════════════════════════════════
-- Migración: 0022_staff_barbero.sql
-- Vincula un integrante del staff con su ficha de `barberos` (la entidad
-- que atribuye la venta). No fusiona las tablas: `ventas.barbero_id` sigue
-- apuntando a `barberos`. Con el link, el POS puede pre-seleccionar al
-- barbero del staff logueado (auto-atribución) sin elegirlo a mano.
--   - on delete set null: si se borra el barbero, el staff queda sin vínculo.
--   - índice único parcial: un barbero se vincula a lo sumo a un staff.
-- ════════════════════════════════════════════════════════════════

alter table staff add column if not exists barbero_id uuid references barberos (id) on delete set null;

create unique index if not exists staff_barbero_unico on staff (barbero_id) where barbero_id is not null;
