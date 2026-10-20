-- ════════════════════════════════════════════════════════════════
-- Migración: 0041_sesiones_staff.sql  (rama seguridad, 2026-10-20)
--
-- Problema: cuando el dueño cambia la contraseña de alguien del personal
-- (Personal → Cambiar contraseña), las sesiones abiertas de esa persona
-- seguían vivas: un teléfono perdido o una sesión robada seguían operando.
-- La API admin de Supabase no cierra sesiones al cambiar la contraseña.
--
-- 1. staff.sesiones_desde: fecha de corte. Toda sesión iniciada antes ya
--    no cuenta como staff. Las funciones de permisos (is_active_staff,
--    is_owner_admin, is_owner, usadas por la RLS) la revisan contra la
--    hora de login del JWT (claim amr). El panel la revisa también.
-- 2. cerrar_sesiones_staff(staff_id): pone el corte y borra sus sesiones
--    de auth.sessions (sus refresh tokens dejan de servir). Solo la llama
--    el servidor con service role. Devuelve cuántas sesiones borró, o null
--    si la base no permitió tocar auth.sessions (el corte sigue valiendo).
--    Si el dueño cambia SU contraseña, conserva la sesión actual y cierra
--    las demás (sin corte, que lo sacaría a él también).
--
-- Aplicar ANTES de desplegar el código de esta rama.
-- ════════════════════════════════════════════════════════════════

alter table public.staff add column if not exists sesiones_desde timestamptz;

-- Hora (epoch) en que se inició la sesión del JWT actual. amr guarda la
-- hora del login y se conserva al refrescar el token (iat no).
create or replace function public.jwt_hora_login()
returns bigint
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select max((e->>'timestamp')::bigint)
       from jsonb_array_elements(
         case when jsonb_typeof(auth.jwt() -> 'amr') = 'array' then auth.jwt() -> 'amr' else '[]'::jsonb end
       ) e),
    (auth.jwt() ->> 'iat')::bigint,
    0);
$$;

-- ¿La sesión actual es posterior al corte de ese integrante?
create or replace function public.staff_sesion_vigente(p_desde timestamptz)
returns boolean
language sql
stable
set search_path = public
as $$
  select p_desde is null or jwt_hora_login() >= floor(extract(epoch from p_desde));
$$;

create or replace function public.is_active_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from staff
    where user_id = auth.uid() and activo and staff_sesion_vigente(sesiones_desde)
  );
$$;

create or replace function public.is_owner_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from staff
    where user_id = auth.uid() and activo and rol in ('admin', 'dueno')
      and staff_sesion_vigente(sesiones_desde)
  );
$$;

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
      and staff_sesion_vigente(sesiones_desde)
  );
$$;

create or replace function public.cerrar_sesiones_staff(
  p_staff_id uuid,
  p_conservar uuid default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_n    int;
begin
  -- p_conservar: el dueño cambió su propia contraseña; se conserva la
  -- sesión desde la que lo hizo (sin corte) y se cierran las demás.
  if p_conservar is null then
    update staff set sesiones_desde = now() where id = p_staff_id returning user_id into v_user;
  else
    select user_id into v_user from staff where id = p_staff_id;
  end if;
  if v_user is null then
    return 0;
  end if;
  begin
    delete from auth.sessions
    where user_id = v_user and (p_conservar is null or id <> p_conservar);
    get diagnostics v_n = row_count;
  exception when insufficient_privilege or undefined_table then
    v_n := null;
  end;
  return v_n;
end;
$$;
revoke all on function public.cerrar_sesiones_staff(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cerrar_sesiones_staff(uuid, uuid) to service_role;
