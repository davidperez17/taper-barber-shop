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

export async function getHeatmapHorario(desde: string, hasta: string, sucursalId?: string | null): Promise<HeatCell[]> {
  const sb = await createClient();
  const params: Record<string, unknown> = { p_desde: desde, p_hasta: hasta };
  if (sucursalId) params.p_sucursal_id = sucursalId;
  const { data } = await sb.rpc("ventas_heatmap_horario", params);
  return (data as HeatCell[]) ?? [];
}

export interface TopCliente {
  nombre: string;
  numero: number;
  visitas: number;
  total: number;
}

export interface ReporteClientes {
  nuevos: number;
  activos: number;
  recurrentes: number;
  ticket_cliente: number;
  gasto_nuevos: number;
  gasto_recurrentes: number;
  top_clientes: TopCliente[];
}

export async function getReporteClientes(desde: string, hasta: string, sucursalId?: string | null): Promise<ReporteClientes> {
  const sb = await createClient();
  const params: Record<string, unknown> = { p_desde: desde, p_hasta: hasta };
  if (sucursalId) params.p_sucursal_id = sucursalId;
  const { data } = await sb.rpc("reporte_clientes", params);
  return (
    (data as ReporteClientes) ?? {
      nuevos: 0, activos: 0, recurrentes: 0, ticket_cliente: 0,
      gasto_nuevos: 0, gasto_recurrentes: 0, top_clientes: [],
    }
  );
}

export async function getReporte(desde: string, hasta: string, sucursalId?: string | null): Promise<ReporteData> {
  const sb = await createClient();
  const params: Record<string, unknown> = { p_desde: desde, p_hasta: hasta };
  if (sucursalId) params.p_sucursal_id = sucursalId;
  const { data } = await sb.rpc("reporte_ventas", params);
  return (data as ReporteData) ?? {
    total: 0, num: 0, ticket: 0, por_dia: [], top_servicios: [], top_productos: [], top_barberos: [],
  };
}
