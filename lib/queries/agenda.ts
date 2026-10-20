import { createClient } from "@/lib/supabase/server";
import type { CitaRow } from "@/lib/types";

const SELECT =
  "*, cliente:clientes(nombre,telefono), barbero:barberos(nombre), servicio:servicios(nombre,precio,duracion_min)";

// Una sola definición de "hoy en Guatemala" (antes duplicada aquí y en caja).
export { hoyGT } from "@/lib/queries/caja";

/** Citas de un día (hora local GT, UTC-6 sin horario de verano), ordenadas por hora. */
export async function getCitasDelDia(fecha: string, sucursalId?: string | null): Promise<CitaRow[]> {
  const inicio = new Date(`${fecha}T00:00:00-06:00`);
  const fin = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);

  const sb = await createClient();
  let q = sb
    .from("citas")
    .select(SELECT)
    .gte("inicia_en", inicio.toISOString())
    .lt("inicia_en", fin.toISOString());
  if (sucursalId) q = q.eq("sucursal_id", sucursalId);
  const { data } = await q.order("inicia_en");
  return (data as CitaRow[]) ?? [];
}
