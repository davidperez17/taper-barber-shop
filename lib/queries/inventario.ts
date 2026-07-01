import { createClient } from "@/lib/supabase/server";
import type { Producto } from "@/lib/types";

/** Productos con seguimiento de stock, para la pantalla de inventario. */
export async function getInventario(): Promise<Producto[]> {
  const sb = await createClient();
  const { data } = await sb
    .from("productos")
    .select("*")
    .eq("controla_stock", true)
    .order("nombre");
  return (data as Producto[]) ?? [];
}
