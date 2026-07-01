-- ════════════════════════════════════════════════════════════════
-- Migración: 0008_caja.sql
-- Cierre de caja (arqueo diario). Fechas en hora local de Guatemala.
-- - caja_movimientos: egresos (gastos/retiros) e ingresos extra de efectivo.
-- - cierres_caja: un cierre por día con esperado vs contado y diferencia.
-- ════════════════════════════════════════════════════════════════

create table if not exists caja_movimientos (
  id             uuid primary key default extensions.gen_random_uuid(),
  fecha          date not null default (now() at time zone 'America/Guatemala')::date,
  tipo           text not null check (tipo in ('egreso', 'ingreso')),
  monto          numeric(10, 2) not null check (monto > 0),
  motivo         text,
  registrado_por uuid references staff (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists caja_mov_fecha_idx on caja_movimientos (fecha);

create table if not exists cierres_caja (
  id                uuid primary key default extensions.gen_random_uuid(),
  fecha             date not null unique,
  fondo_inicial     numeric(10, 2) not null default 0,
  efectivo_ventas   numeric(10, 2) not null default 0,
  tarjeta_total     numeric(10, 2) not null default 0,
  transfer_total    numeric(10, 2) not null default 0,
  ingresos_extra    numeric(10, 2) not null default 0,
  egresos           numeric(10, 2) not null default 0,
  efectivo_esperado numeric(10, 2) not null default 0,
  efectivo_contado  numeric(10, 2) not null default 0,
  diferencia        numeric(10, 2) not null default 0,
  notas             text,
  cerrado_por       uuid references staff (id) on delete set null,
  created_at        timestamptz not null default now()
);

alter table caja_movimientos enable row level security;
alter table cierres_caja enable row level security;

-- Lectura para staff autenticado; escritura solo vía RPC (security definer).
create policy caja_mov_read on caja_movimientos for select to authenticated
  using (exists (select 1 from staff s where s.user_id = auth.uid() and s.activo));
create policy cierres_read on cierres_caja for select to authenticated
  using (exists (select 1 from staff s where s.user_id = auth.uid() and s.activo));

-- ── Resumen del día (para la pantalla de cierre) ─────────────────
create or replace function public.caja_resumen(p_fecha date)
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_staff uuid;
begin
  select id into v_staff from staff where user_id = auth.uid() and activo;
  if v_staff is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  return json_build_object(
    'fecha', p_fecha,
    'ventas', (
      select json_build_object(
        'efectivo', coalesce(sum(total) filter (where metodo_pago = 'efectivo'), 0),
        'tarjeta',  coalesce(sum(total) filter (where metodo_pago = 'tarjeta'), 0),
        'transferencia', coalesce(sum(total) filter (where metodo_pago = 'transferencia'), 0),
        'num', count(*)
      )
      from ventas
      where (created_at at time zone 'America/Guatemala')::date = p_fecha
    ),
    'egresos', (select coalesce(sum(monto), 0) from caja_movimientos where fecha = p_fecha and tipo = 'egreso'),
    'ingresos_extra', (select coalesce(sum(monto), 0) from caja_movimientos where fecha = p_fecha and tipo = 'ingreso'),
    'movimientos', (
      select coalesce(json_agg(json_build_object(
        'id', id, 'tipo', tipo, 'monto', monto, 'motivo', motivo, 'created_at', created_at
      ) order by created_at desc), '[]'::json)
      from caja_movimientos where fecha = p_fecha
    ),
    'cierre', (select row_to_json(c) from cierres_caja c where c.fecha = p_fecha)
  );
end;
$$;
grant execute on function public.caja_resumen(date) to authenticated;

-- ── Registrar egreso / ingreso de efectivo ───────────────────────
create or replace function public.caja_movimiento_crear(p_tipo text, p_monto numeric, p_motivo text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff uuid;
  v_hoy   date := (now() at time zone 'America/Guatemala')::date;
  v_id    uuid;
begin
  select id into v_staff from staff where user_id = auth.uid() and activo;
  if v_staff is null then raise exception 'No autorizado' using errcode = '42501'; end if;
  if p_tipo not in ('egreso', 'ingreso') then raise exception 'Tipo inválido' using errcode = '23514'; end if;
  if p_monto is null or p_monto <= 0 then raise exception 'Monto inválido' using errcode = '23514'; end if;
  if exists (select 1 from cierres_caja where fecha = v_hoy) then
    raise exception 'La caja del día ya está cerrada' using errcode = 'P0001';
  end if;

  insert into caja_movimientos (tipo, monto, motivo, registrado_por)
  values (p_tipo, p_monto, nullif(trim(p_motivo), ''), v_staff)
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.caja_movimiento_crear(text, numeric, text) to authenticated;

create or replace function public.caja_movimiento_borrar(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_fecha date;
begin
  if not exists (select 1 from staff where user_id = auth.uid() and activo) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select fecha into v_fecha from caja_movimientos where id = p_id;
  if v_fecha is not null and exists (select 1 from cierres_caja where fecha = v_fecha) then
    raise exception 'La caja de ese día ya está cerrada' using errcode = 'P0001';
  end if;
  delete from caja_movimientos where id = p_id;
end;
$$;
grant execute on function public.caja_movimiento_borrar(uuid) to authenticated;

-- ── Cerrar caja del día ──────────────────────────────────────────
create or replace function public.caja_cerrar(
  p_fecha date, p_fondo_inicial numeric, p_efectivo_contado numeric, p_notas text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff     uuid;
  v_efectivo  numeric := 0;
  v_tarjeta   numeric := 0;
  v_transfer  numeric := 0;
  v_egresos   numeric := 0;
  v_ingresos  numeric := 0;
  v_esperado  numeric;
  v_cierre    cierres_caja;
begin
  select id into v_staff from staff where user_id = auth.uid() and activo;
  if v_staff is null then raise exception 'No autorizado' using errcode = '42501'; end if;
  if exists (select 1 from cierres_caja where fecha = p_fecha) then
    raise exception 'La caja de ese día ya está cerrada' using errcode = 'P0001';
  end if;

  select
    coalesce(sum(total) filter (where metodo_pago = 'efectivo'), 0),
    coalesce(sum(total) filter (where metodo_pago = 'tarjeta'), 0),
    coalesce(sum(total) filter (where metodo_pago = 'transferencia'), 0)
    into v_efectivo, v_tarjeta, v_transfer
  from ventas where (created_at at time zone 'America/Guatemala')::date = p_fecha;

  select coalesce(sum(monto) filter (where tipo = 'egreso'), 0),
         coalesce(sum(monto) filter (where tipo = 'ingreso'), 0)
    into v_egresos, v_ingresos
  from caja_movimientos where fecha = p_fecha;

  v_esperado := coalesce(p_fondo_inicial, 0) + v_efectivo + v_ingresos - v_egresos;

  insert into cierres_caja (
    fecha, fondo_inicial, efectivo_ventas, tarjeta_total, transfer_total,
    ingresos_extra, egresos, efectivo_esperado, efectivo_contado, diferencia, notas, cerrado_por
  ) values (
    p_fecha, coalesce(p_fondo_inicial, 0), v_efectivo, v_tarjeta, v_transfer,
    v_ingresos, v_egresos, v_esperado, coalesce(p_efectivo_contado, 0),
    coalesce(p_efectivo_contado, 0) - v_esperado, nullif(trim(p_notas), ''), v_staff
  ) returning * into v_cierre;

  return row_to_json(v_cierre);
end;
$$;
grant execute on function public.caja_cerrar(date, numeric, numeric, text) to authenticated;
