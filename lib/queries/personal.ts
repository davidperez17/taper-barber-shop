import { getStaff } from "@/lib/queries/staff";
import { createAdmin } from "@/lib/supabase/admin";
import type { StaffRow } from "@/lib/types";

export interface BarberoVinculo { id: string; nombre: string; sucursal_id: string | null; activo: boolean }

/** Barberos activos para vincular a un staff (solo dueño). */
export async function getBarberosParaVinculo(): Promise<BarberoVinculo[]> {
  const yo = await getStaff();
  if (yo?.rol !== "dueno") return [];
  const admin = createAdmin();
  const { data } = await admin
    .from("barberos")
    .select("id, nombre, sucursal_id, activo")
    .eq("activo", true)
    .order("nombre");
  return (data ?? []) as BarberoVinculo[];
}

/** Lista completa del personal. Solo el dueño; devuelve [] si no lo es. */
export async function getPersonal(): Promise<StaffRow[]> {
  const yo = await getStaff();
  if (yo?.rol !== "dueno") return [];

  const admin = createAdmin();
  const { data: filas } = await admin
    .from("staff")
    .select("id, user_id, nombre, rol, email, activo, created_at, sucursal_id, barbero_id, sucursal:sucursales(nombre)")
    .order("created_at");

  // Último acceso desde Auth (mapeado por user_id).
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const ultimoAcceso = new Map((users?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]));

  return (filas ?? []).map((f) => {
    const { sucursal, ...rest } = f as typeof f & { sucursal: { nombre: string } | null };
    return {
      ...rest,
      last_sign_in_at: f.user_id ? ultimoAcceso.get(f.user_id) ?? null : null,
      sucursal_nombre: sucursal?.nombre ?? null,
    };
  }) as StaffRow[];
}
