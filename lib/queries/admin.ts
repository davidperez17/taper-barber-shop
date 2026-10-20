import { createClient } from "@/lib/supabase/server";
import type { ClienteDashboard, Servicio, Producto, Barbero } from "@/lib/types";

/**
 * Ficha del cliente para el POS (reusa el RPC definer para lealtad+historial).
 * `loyalty` es la tarjeta de la SUCURSAL ACTIVA: el canje solo aplica ahí.
 */
export async function getClienteParaVenta(
  clienteId: string,
  sucursalId: string | null,
): Promise<ClienteDashboard | null> {
  const sb = await createClient();
  return (await clientePorId(sb, clienteId, sucursalId)) as ClienteDashboard | null;
}

/**
 * Dashboard de un cliente por id para el staff. Usa get_cliente_by_id (0035),
 * que no expone qr_token; si la base aún no la tiene, cae al camino viejo
 * (leer qr_token → get_cliente_by_qr), que 0035 deja de permitir.
 */
export async function clientePorId(
  sb: Awaited<ReturnType<typeof createClient>>,
  clienteId: string,
  sucursalId: string | null,
): Promise<Record<string, unknown> | null> {
  const nuevo = await sb.rpc("get_cliente_by_id", { p_cliente_id: clienteId, p_sucursal_id: sucursalId });
  if (!nuevo.error) return (nuevo.data as Record<string, unknown> | null) ?? null;
  if (nuevo.error.code !== "PGRST202") return null;

  const { data: cliente } = await sb.from("clientes").select("qr_token").eq("id", clienteId).single();
  if (!cliente) return null;
  const { data } = await sb.rpc("get_cliente_by_qr", { p_qr_token: cliente.qr_token, p_sucursal_id: sucursalId });
  if (!data) return null;
  // Nunca mandar el token al navegador (es la sesión del cliente en la PWA).
  const d = data as { cliente: Record<string, unknown> };
  const { qr_token: _omit, ...resto } = d.cliente;
  void _omit;
  return { ...d, cliente: resto };
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

export async function getDashboardMetrics(sucursalId?: string | null): Promise<DashboardMetrics> {
  const sb = await createClient();
  const params: Record<string, unknown> = {};
  if (sucursalId) params.p_sucursal_id = sucursalId;
  const { data } = await sb.rpc("dashboard_metrics", params);
  return data as DashboardMetrics;
}

export interface VentaSucursal {
  sucursal_id: string;
  nombre: string;
  total: number;
  num: number;
}

/** Comparativa de ventas por sucursal en un rango (admin/dueño). */
export async function getVentasPorSucursal(desde: string, hasta: string): Promise<VentaSucursal[]> {
  const sb = await createClient();
  const { data } = await sb.rpc("ventas_por_sucursal", { p_desde: desde, p_hasta: hasta });
  return (data as VentaSucursal[]) ?? [];
}

export async function getCatalogo(sucursalId?: string | null): Promise<Catalogo> {
  const sb = await createClient();
  let sQ = sb.from("servicios").select("*").eq("activo", true);
  let pQ = sb.from("productos").select("*").eq("activo", true);
  let bQ = sb.from("barberos").select("id, nombre, activo").eq("activo", true);
  if (sucursalId) {
    sQ = sQ.eq("sucursal_id", sucursalId);
    pQ = pQ.eq("sucursal_id", sucursalId);
    bQ = bQ.eq("sucursal_id", sucursalId);
  }
  const [serv, prod, barb] = await Promise.all([
    sQ.order("orden"),
    pQ.order("nombre"),
    bQ.order("nombre"),
  ]);
  return {
    servicios: (serv.data as Servicio[]) ?? [],
    productos: (prod.data as Producto[]) ?? [],
    barberos: (barb.data as Barbero[]) ?? [],
  };
}
