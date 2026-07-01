import { createClient } from "@/lib/supabase/server";
import type { Producto } from "@/lib/types";

/** Productos con seguimiento de stock (de una sucursal), para inventario. */
export async function getInventario(sucursalId?: string | null): Promise<Producto[]> {
  const sb = await createClient();
  let q = sb.from("productos").select("*").eq("controla_stock", true);
  if (sucursalId) q = q.eq("sucursal_id", sucursalId);
  const { data } = await q.order("nombre");
  return (data as Producto[]) ?? [];
}
