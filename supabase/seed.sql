-- ════════════════════════════════════════════════════════════════
-- Seed demo — Taper Barbershop
-- Ejecutar después de 0001_init.sql
-- ════════════════════════════════════════════════════════════════

-- ── Servicios (orden = más frecuentes primero en el POS) ────────
insert into servicios (nombre, precio, categoria, duracion_min, cuenta_lealtad, orden) values
  ('Corte Clásico',  50, 'corte', 30, true,  10),
  ('Corte Fade',     60, 'corte', 35, true,  20),
  ('Corte + Barba',  90, 'corte', 50, true,  30),
  ('Barba',          45, 'barba', 20, false, 40),
  ('Tratamiento',    80, 'tratamiento', 40, false, 50);

-- ── Productos ───────────────────────────────────────────────────
insert into productos (nombre, precio, categoria) values
  ('Shampoo Premium', 65, 'cuidado'),
  ('Cera Mate',       55, 'styling'),
  ('Pomada',          50, 'styling'),
  ('Aceite de Barba', 70, 'barba');

-- ── Barberos ────────────────────────────────────────────────────
insert into barberos (nombre) values
  ('Carlos'),
  ('Marco');

-- ════════════════════════════════════════════════════════════════
-- Staff: requiere un usuario en auth.users primero.
-- 1) Creá el usuario en Supabase → Authentication → Users (email+pass).
-- 2) Copiá su UUID y corré:
--
--   insert into staff (user_id, nombre, rol)
--   values ('<UUID_DEL_USUARIO>', 'Dueño Taper', 'dueno');
-- ════════════════════════════════════════════════════════════════
