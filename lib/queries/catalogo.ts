import { createClient } from "@/lib/supabase/server";
import type { Servicio, Producto, Barbero, ConfigLealtad } from "@/lib/types";

export interface CatalogoAdmin {
  servicios: Servicio[];
  productos: Producto[];
  barberos: Barbero[];
  config: ConfigLealtad;
}

/** Catálogo completo (incluye inactivos) para gestión. */
export async function getCatalogoAdmin(): Promise<CatalogoAdmin> {
  const sb = await createClient();
  const [servicios, productos, barberos, config] = await Promise.all([
    sb.from("servicios").select("*").order("orden"),
    sb.from("productos").select("*").order("nombre"),
    sb.from("barberos").select("id, nombre, activo").order("nombre"),
    sb.from("config_lealtad").select("*").eq("id", 1).single(),
  ]);
  return {
    servicios: (servicios.data as Servicio[]) ?? [],
    productos: (productos.data as Producto[]) ?? [],
    barberos: (barberos.data as Barbero[]) ?? [],
    config: (config.data as ConfigLealtad) ?? { id: 1, cortes_objetivo: 6, ventana_meses: 12 },
  };
}
