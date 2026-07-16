-- ════════════════════════════════════════════════════════════════
-- Seed demo — Taper Barbershop
-- Ejecutar después de 0001_init.sql
-- ════════════════════════════════════════════════════════════════

-- ── Servicios (orden = más frecuentes primero en el POS) ────────
-- `puntos` = sellos que suma cada unidad a la tarjeta (0028). El combo vale 2
-- porque son dos servicios; `cuenta_lealtad` quedó obsoleta y la dropea 0029.
insert into servicios (nombre, precio, categoria, duracion_min, puntos, orden) values
  ('Corte Clásico',  50, 'corte', 30, 1, 10),
  ('Corte Fade',     60, 'corte', 35, 1, 20),
  ('Corte + Barba',  90, 'corte', 50, 2, 30),
  ('Barba',          45, 'barba', 20, 1, 40),
  ('Tratamiento',    80, 'tratamiento', 40, 0, 50);

-- ── Productos (puntos = 0: no suman a la tarjeta) ───────────────
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
