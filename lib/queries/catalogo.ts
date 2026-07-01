import { createClient } from "@/lib/supabase/server";
import type { Servicio, Producto, Barbero, ConfigLealtad } from "@/lib/types";

export interface CatalogoAdmin {
  servicios: Servicio[];
  productos: Producto[];
  barberos: Barbero[];
  config: ConfigLealtad;
}

/** Catálogo completo (incluye inactivos) para gestión, filtrado por sucursal. */
export async function getCatalogoAdmin(sucursalId?: string | null): Promise<CatalogoAdmin> {
  const sb = await createClient();
  let sQ = sb.from("servicios").select("*");
  let pQ = sb.from("productos").select("*");
  let bQ = sb.from("barberos").select("id, nombre, activo");
  if (sucursalId) {
    sQ = sQ.eq("sucursal_id", sucursalId);
    pQ = pQ.eq("sucursal_id", sucursalId);
    bQ = bQ.eq("sucursal_id", sucursalId);
  }
  const [servicios, productos, barberos, config] = await Promise.all([
    sQ.order("orden"),
    pQ.order("nombre"),
    bQ.order("nombre"),
    sb.from("config_lealtad").select("*").eq("id", 1).single(),
  ]);
  return {
    servicios: (servicios.data as Servicio[]) ?? [],
    productos: (productos.data as Producto[]) ?? [],
    barberos: (barberos.data as Barbero[]) ?? [],
    config: (config.data as ConfigLealtad) ?? { id: 1, cortes_objetivo: 6, ventana_meses: 12 },
  };
}
