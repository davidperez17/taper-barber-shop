import { createClient } from "@/lib/supabase/server";
import type { ClienteDashboard, Servicio, Producto, Barbero } from "@/lib/types";

/** Ficha del cliente para el POS (reusa el RPC definer para lealtad+historial). */
export async function getClienteParaVenta(
  clienteId: string,
): Promise<ClienteDashboard | null> {
  const sb = await createClient();
  const { data: cliente } = await sb
    .from("clientes")
    .select("qr_token")
    .eq("id", clienteId)
    .single();
  if (!cliente) return null;

  const { data } = await sb.rpc("get_cliente_by_qr", { p_qr_token: cliente.qr_token });
  return (data as ClienteDashboard | null) ?? null;
}

export interface Catalogo {
  servicios: Servicio[];
  productos: Producto[];
  barberos: Barbero[];
}

export interface DashboardMetrics {
  ventas_hoy: number;
  num_ventas_hoy: number;
  ventas_mes: number;
  ticket_promedio: number;
  clientes_total: number;
  clientes_activos: number;
  clientes_inactivos: number;
  productos_bajo_stock: number;
  top_servicios: { nombre: string; n: number }[];
  top_productos: { nombre: string; n: number }[];
  top_barbero: string | null;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const sb = await createClient();
  const { data } = await sb.rpc("dashboard_metrics");
  return data as DashboardMetrics;
}

export async function getCatalogo(): Promise<Catalogo> {
  const sb = await createClient();
  const [serv, prod, barb] = await Promise.all([
    sb.from("servicios").select("*").eq("activo", true).order("orden"),
    sb.from("productos").select("*").eq("activo", true).order("nombre"),
    sb.from("barberos").select("id, nombre, activo").eq("activo", true).order("nombre"),
  ]);
  return {
    servicios: (serv.data as Servicio[]) ?? [],
    productos: (prod.data as Producto[]) ?? [],
    barberos: (barb.data as Barbero[]) ?? [],
  };
}
