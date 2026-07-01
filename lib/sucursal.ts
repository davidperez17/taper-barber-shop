import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { StaffSession } from "@/lib/queries/staff";
import type { Sucursal } from "@/lib/types";

export const SUCURSAL_COOKIE = "taper_sucursal";

/** Sucursales activas, ordenadas. */
export async function getSucursales(): Promise<Sucursal[]> {
  const sb = await createClient();
  const { data } = await sb.from("sucursales").select("*").eq("activo", true).order("orden");
  return (data as Sucursal[]) ?? [];
}

/**
 * Sucursal activa para el staff dado.
 * - cajero/barbero → su sucursal asignada (fija).
 * - dueño/admin → cookie `taper_sucursal` si es válida, o la primera activa.
 * Devuelve null si no hay ninguna sucursal (no debería tras la migración 0015).
 */
export async function getSucursalActiva(staff: StaffSession): Promise<string | null> {
  if (staff.rol === "cajero" || staff.rol === "barbero") {
    return staff.sucursal_id ?? null;
  }

  const jar = await cookies();
  const elegida = jar.get(SUCURSAL_COOKIE)?.value;
  const sucursales = await getSucursales();
  if (elegida && sucursales.some((s) => s.id === elegida)) return elegida;
  return sucursales[0]?.id ?? null;
}
