import { createClient } from "@/lib/supabase/server";

export interface TopRow {
  nombre: string;
  n: number;
  monto: number;
}
export interface DiaRow {
  dia: string;
  total: number;
  num: number;
}
export interface ReporteData {
  total: number;
  num: number;
  ticket: number;
  por_dia: DiaRow[];
  top_servicios: TopRow[];
  top_productos: TopRow[];
  top_barberos: TopRow[];
}

export interface HeatCell {
  dow: number; // 0=domingo … 6=sábado
  hora: number;
  n: number;
  monto: number;
}

export async function getHeatmapHorario(desde: string, hasta: string): Promise<HeatCell[]> {
  const sb = await createClient();
  const { data } = await sb.rpc("ventas_heatmap_horario", { p_desde: desde, p_hasta: hasta });
  return (data as HeatCell[]) ?? [];
}

export async function getReporte(desde: string, hasta: string): Promise<ReporteData> {
  const sb = await createClient();
  const { data } = await sb.rpc("reporte_ventas", { p_desde: desde, p_hasta: hasta });
  return (data as ReporteData) ?? {
    total: 0, num: 0, ticket: 0, por_dia: [], top_servicios: [], top_productos: [], top_barberos: [],
  };
}
