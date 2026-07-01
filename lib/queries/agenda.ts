import { createClient } from "@/lib/supabase/server";
import type { CitaRow } from "@/lib/types";

const SELECT =
  "*, cliente:clientes(nombre,telefono), barbero:barberos(nombre), servicio:servicios(nombre,precio,duracion_min)";

/** Fecha de hoy (YYYY-MM-DD) en hora local de Guatemala. */
export function hoyGT(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guatemala" }).format(new Date());
}

/** Citas de un día (hora local GT, UTC-6 sin horario de verano), ordenadas por hora. */
export async function getCitasDelDia(fecha: string): Promise<CitaRow[]> {
  const inicio = new Date(`${fecha}T00:00:00-06:00`);
  const fin = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);

  const sb = await createClient();
  const { data } = await sb
    .from("citas")
    .select(SELECT)
    .gte("inicia_en", inicio.toISOString())
    .lt("inicia_en", fin.toISOString())
    .order("inicia_en");
  return (data as CitaRow[]) ?? [];
}
