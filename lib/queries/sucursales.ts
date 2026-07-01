import { createClient } from "@/lib/supabase/server";
import type { Sucursal } from "@/lib/types";

/** Todas las sucursales (incluye inactivas) para gestión. */
export async function getSucursalesAdmin(): Promise<Sucursal[]> {
  const sb = await createClient();
  const { data } = await sb.from("sucursales").select("*").order("orden").order("created_at");
  return (data as Sucursal[]) ?? [];
}

/** Límite de sucursales del plan (config de cuenta). */
export async function getMaxSucursales(): Promise<number> {
  const sb = await createClient();
  const { data } = await sb.from("cuenta").select("max_sucursales").eq("id", 1).single();
  return (data?.max_sucursales as number) ?? 2;
}
