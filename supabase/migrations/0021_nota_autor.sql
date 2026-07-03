-- ════════════════════════════════════════════════════════════════
-- Migración: 0021_nota_autor.sql
-- Autor de la nota, denormalizado. `cliente_notas.autor_id` referencia a
-- staff, pero la RLS de staff (staff_self_select) impide leer el nombre de
-- otro autor, y abrir staff a lectura general filtraría email/credenciales.
-- Guardar el nombre al escribir la nota lo hace legible sin join y sobrevive
-- al rename/borrado del staff (autor_id → null, el nombre queda).
-- ════════════════════════════════════════════════════════════════

alter table cliente_notas add column if not exists autor_nombre text;

-- Backfill best-effort de notas existentes con el nombre actual del staff.
update cliente_notas n
   set autor_nombre = s.nombre
  from staff s
 where n.autor_id = s.id
   and n.autor_nombre is null;
