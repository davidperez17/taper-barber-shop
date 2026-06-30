import { createClient } from "@/lib/supabase/server";

export interface InactivoRow {
  id: string;
  numero: number;
  nombre: string;
  telefono: string;
  ultima_visita: string | null;
  dias_inactivo: number | null;
}

/** Clientes activos sin visita en `dias` días (recuperación). */
export async function getInactivos(dias: number): Promise<InactivoRow[]> {
  const sb = await createClient();
  const { data } = await sb.rpc("clientes_inactivos", { p_dias: dias });
  return (data as InactivoRow[]) ?? [];
}
