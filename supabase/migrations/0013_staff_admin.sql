-- ════════════════════════════════════════════════════════════════
-- Migración: 0013_staff_admin.sql
-- Gestión de personal (staff = usuarios con login). La escritura se hace
-- desde el servidor con la service-role (salta RLS), por eso aquí NO se
-- agregan policies de escritura. Solo:
-- - staff.email denormalizado para poder listar sin consultar Auth siempre.
-- - is_owner(): helper de rol dueño (para futuras policies).
-- - Trigger anti-lockout: nunca dejar 0 dueños activos.
-- ════════════════════════════════════════════════════════════════

alter table staff add column if not exists email text;

-- ── Helper: ¿el usuario actual es dueño activo? ─────────────────
create or replace function public.is_owner()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from staff
    where user_id = auth.uid() and activo and rol = 'dueno'
  );
$$;

-- ════════════════════════════════════════════════════════════════
-- Anti-lockout: tras cualquier update/delete de staff debe quedar al
-- menos un dueño activo. Protege incluso a la service-role.
-- ════════════════════════════════════════════════════════════════
create or replace function public.staff_guard_dueno()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from staff where rol = 'dueno' and activo) then
    raise exception 'Debe quedar al menos un dueño activo' using errcode = '23514';
  end if;
  return null;
end;
$$;

drop trigger if exists trg_staff_guard_dueno on staff;
create trigger trg_staff_guard_dueno
  after update or delete on staff
  for each row execute function public.staff_guard_dueno();
