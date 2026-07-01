import { createClient } from "@/lib/supabase/server";
import type { Cupon } from "@/lib/types";

/** Todos los cupones (incluye inactivos y agotados) para gestión. */
export async function getCupones(): Promise<Cupon[]> {
  const sb = await createClient();
  const { data } = await sb.from("cupones").select("*").order("created_at", { ascending: false });
  return (data as Cupon[]) ?? [];
}
