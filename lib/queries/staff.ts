import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type RolStaff = "cajero" | "barbero" | "admin" | "dueno";

export interface StaffSession {
  id: string;
  nombre: string;
  rol: RolStaff;
  sucursal_id: string | null;
  barbero_id: string | null; // ficha de barberos vinculada (auto-atribución en POS)
}

/**
 * Staff autenticado actual, o null si no hay sesión / no es staff activo.
 * Memoizado por request (React cache): el layout, la página y las acciones
 * lo comparten sin repetir el round-trip a Auth en cada navegación.
 */
export const getStaff = cache(async (): Promise<StaffSession | null> => {
  const sb = await createClient();
  // Sesión rota (refresh token revocado) = sin sesión, nunca un 500.
  let user = null;
  try {
    const { data, error } = await sb.auth.getUser();
    if (!error) user = data.user;
  } catch {
    user = null;
  }
  if (!user) return null;

  const { data } = await sb
    .from("staff")
    .select("id, nombre, rol, activo, sucursal_id, barbero_id")
    .eq("user_id", user.id)
    .single();

  if (!data || !data.activo) return null;
  return { id: data.id, nombre: data.nombre, rol: data.rol as RolStaff, sucursal_id: data.sucursal_id ?? null, barbero_id: data.barbero_id ?? null };
});
