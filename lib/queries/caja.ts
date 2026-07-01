import { createClient } from "@/lib/supabase/server";

export interface MovimientoCaja {
  id: string;
  tipo: "egreso" | "ingreso";
  monto: number;
  motivo: string | null;
  created_at: string;
}

export interface CierreCaja {
  id: string;
  fecha: string;
  fondo_inicial: number;
  efectivo_ventas: number;
  tarjeta_total: number;
  transfer_total: number;
  ingresos_extra: number;
  egresos: number;
  efectivo_esperado: number;
  efectivo_contado: number;
  diferencia: number;
  notas: string | null;
  created_at: string;
}

export interface CajaResumen {
  fecha: string;
  ventas: { efectivo: number; tarjeta: number; transferencia: number; num: number };
  egresos: number;
  ingresos_extra: number;
  movimientos: MovimientoCaja[];
  cierre: CierreCaja | null;
}

/** Fecha de hoy en calendario de Guatemala (YYYY-MM-DD). */
export function hoyGT(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guatemala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function getCajaResumen(fecha: string, sucursalId?: string | null): Promise<CajaResumen | null> {
  const sb = await createClient();
  const params: Record<string, unknown> = { p_fecha: fecha };
  if (sucursalId) params.p_sucursal_id = sucursalId;
  const { data } = await sb.rpc("caja_resumen", params);
  return (data as CajaResumen) ?? null;
}
