-- ════════════════════════════════════════════════════════════════
-- Migración: 0042_agenda_sin_traslapes.sql  (rama seguridad, 2026-10-20)
--
-- Problema: la agenda dejaba dar dos citas al mismo barbero a la misma
-- hora (o encimadas: 10:00 de 45 min y 10:30).
--
-- Trigger en citas: al crear, reagendar, cambiar de barbero/duración o
-- reactivar una cita, rechaza si el barbero ya tiene otra no cancelada que
-- se cruce. Cuenta en todas las sucursales (el barbero es uno solo).
-- Las citas sin barbero asignado no se revisan.
--
-- Es trigger y no `exclude using gist` para no fallar con choques que ya
-- existan en datos viejos: solo se valida lo que se toca desde ahora. Un
-- advisory lock por barbero evita que dos cajeros agenden la misma hora a
-- la vez.
--
-- Error: código 23P01 con el mensaje listo para mostrar.
-- ════════════════════════════════════════════════════════════════

create or replace function public.citas_sin_traslape()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_choque  citas;
  v_barbero text;
begin
  if new.barbero_id is null or new.estado = 'cancelada' then
    return new;
  end if;
  -- En update, solo si cambió algo que mueve el horario o lo reactiva.
  if tg_op = 'UPDATE'
     and new.inicia_en = old.inicia_en
     and new.duracion_min = old.duracion_min
     and new.barbero_id is not distinct from old.barbero_id
     and old.estado <> 'cancelada' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('cita-barbero:' || new.barbero_id::text, 0));

  select * into v_choque
  from citas c
  where c.barbero_id = new.barbero_id
    and c.id <> new.id
    and c.estado <> 'cancelada'
    and c.inicia_en < new.inicia_en + make_interval(mins => new.duracion_min)
    and c.inicia_en + make_interval(mins => c.duracion_min) > new.inicia_en
  order by c.inicia_en
  limit 1;

  if found then
    select nombre into v_barbero from barberos where id = new.barbero_id;
    raise exception '% ya tiene una cita de % a %. Elige otra hora u otro barbero.',
      coalesce(v_barbero, 'Ese barbero'),
      to_char(v_choque.inicia_en at time zone 'America/Guatemala', 'HH24:MI'),
      to_char((v_choque.inicia_en + make_interval(mins => v_choque.duracion_min)) at time zone 'America/Guatemala', 'HH24:MI')
      using errcode = '23P01';
  end if;
  return new;
end;
$$;

drop trigger if exists citas_sin_traslape on citas;
create trigger citas_sin_traslape
  before insert or update of inicia_en, duracion_min, barbero_id, estado on citas
  for each row execute function public.citas_sin_traslape();
