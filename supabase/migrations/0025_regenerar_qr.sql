-- ════════════════════════════════════════════════════════════════
-- Migración: 0025_regenerar_qr.sql
-- Regenerar el QR (qr_token) de un cliente desde el panel. Útil si el
-- cliente pierde el teléfono o compartió su QR: el token anterior deja
-- de servir y su sesión PWA (cookie = token viejo) se invalida; vuelve
-- a entrar con teléfono + PIN y obtiene el QR nuevo.
--
-- Solo dueño/admin (mismo criterio que reset_cliente_pin). Definer para
-- saltar la RLS de clientes. Devuelve el token nuevo.
-- ════════════════════════════════════════════════════════════════

create or replace function public.regenerar_qr_cliente(p_cliente_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
begin
  if not exists (
    select 1 from staff where user_id = auth.uid() and rol in ('dueno', 'admin')
  ) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  update clientes
    set qr_token = encode(extensions.gen_random_bytes(12), 'hex')
    where id = p_cliente_id
    returning qr_token into v_token;

  if v_token is null then
    raise exception 'Cliente no encontrado' using errcode = 'P0001';
  end if;

  return v_token;
end;
$$;

grant execute on function public.regenerar_qr_cliente(uuid) to authenticated;
