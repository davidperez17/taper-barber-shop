import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type RolStaff = "cajero" | "barbero" | "admin" | "dueno";

export interface StaffSession {
  id: string;
  nombre: string;
  rol: RolStaff;
  sucursal_id: string | null;
}

/**
 * Staff autenticado actual, o null si no hay sesión / no es staff activo.
 * Memoizado por request (React cache): el layout, la página y las acciones
 * lo comparten sin repetir el round-trip a Auth en cada navegación.
 */
export const getStaff = cache(async (): Promise<StaffSession | null> => {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data } = await sb
    .from("staff")
    .select("id, nombre, rol, activo, sucursal_id")
    .eq("user_id", user.id)
    .single();

  if (!data || !data.activo) return null;
  return { id: data.id, nombre: data.nombre, rol: data.rol as RolStaff, sucursal_id: data.sucursal_id ?? null };
});
