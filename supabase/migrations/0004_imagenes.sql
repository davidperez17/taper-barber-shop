-- ════════════════════════════════════════════════════════════════
-- Migración: 0004_imagenes.sql
-- Imágenes de servicios y productos: columna imagen_url + bucket de
-- Storage 'catalogo' (lectura pública, escritura solo admin/dueño).
-- ════════════════════════════════════════════════════════════════

alter table servicios add column if not exists imagen_url text;
alter table productos add column if not exists imagen_url text;

-- ── Bucket de Storage (público para lectura por URL) ────────────
insert into storage.buckets (id, name, public)
values ('catalogo', 'catalogo', true)
on conflict (id) do nothing;

-- ── Policies sobre storage.objects para el bucket 'catalogo' ────
-- Lectura pública (además el bucket es public).
create policy "catalogo lectura publica"
  on storage.objects for select
  using (bucket_id = 'catalogo');

-- Escritura (subir/reemplazar/borrar) solo admin/dueño.
create policy "catalogo insert owner"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'catalogo' and public.is_owner_admin());

create policy "catalogo update owner"
  on storage.objects for update to authenticated
  using (bucket_id = 'catalogo' and public.is_owner_admin());

create policy "catalogo delete owner"
  on storage.objects for delete to authenticated
  using (bucket_id = 'catalogo' and public.is_owner_admin());
