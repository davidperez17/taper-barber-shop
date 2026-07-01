import { getStaff } from "@/lib/queries/staff";
import { createAdmin } from "@/lib/supabase/admin";
import type { StaffRow } from "@/lib/types";

/** Lista completa del personal. Solo el dueño; devuelve [] si no lo es. */
export async function getPersonal(): Promise<StaffRow[]> {
  const yo = await getStaff();
  if (yo?.rol !== "dueno") return [];

  const admin = createAdmin();
  const { data: filas } = await admin
    .from("staff")
    .select("id, user_id, nombre, rol, email, activo, created_at")
    .order("created_at");

  // Último acceso desde Auth (mapeado por user_id).
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const ultimoAcceso = new Map((users?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]));

  return (filas ?? []).map((f) => ({
    ...f,
    last_sign_in_at: f.user_id ? ultimoAcceso.get(f.user_id) ?? null : null,
  })) as StaffRow[];
}
