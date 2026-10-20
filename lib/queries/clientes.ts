import { createClient } from "@/lib/supabase/server";
import { todasLasFilas } from "@/lib/supabase/paginar";
import { clientePorId } from "@/lib/queries/admin";
import type { ClienteRow, ClienteFicha, LoyaltyRawData } from "@/lib/types";

const LOYALTY_VACIO: LoyaltyRawData = {
  cortes_total: 0,
  visitas_12m: 0,
  recompensas_canjeadas: 0,
  cortes_objetivo: 6,
  ultima_visita: null,
};

/**
 * Lista de clientes activos con su lealtad (merge clientes + view).
 * La lealtad es POR SUCURSAL: se muestra la tarjeta de la sucursal activa.
 */
export async function getClientesConLealtad(sucursalId: string | null): Promise<ClienteRow[]> {
  const sb = await createClient();
  // Paginado: con más de 1000 clientes la lista se cortaba sin aviso.
  const [clientes, loyalty] = await Promise.all([
    todasLasFilas((desde, hasta) =>
      sb
        .from("clientes")
        .select("id, numero, nombre, telefono, correo, created_at")
        .eq("activo", true)
        .order("nombre")
        .order("id")
        .range(desde, hasta),
    ),
    todasLasFilas((desde, hasta) => {
      const q = sb.from("cliente_loyalty").select("*");
      return (sucursalId ? q.eq("sucursal_id", sucursalId) : q)
        .order("cliente_id")
        .order("sucursal_id")
        .range(desde, hasta);
    }),
  ]);

  const lmap = new Map(loyalty.map((l) => [l.cliente_id, l as LoyaltyRawData & { cliente_id: string }]));
  return clientes.map((c) => ({
    ...c,
    loyalty: lmap.get(c.id) ?? LOYALTY_VACIO,
  })) as ClienteRow[];
}

/**
 * Ficha 360 de un cliente: datos + lealtad + historial + notas + etiquetas.
 * La lealtad mostrada es la de la sucursal activa (tarjeta por sucursal).
 */
export async function getClienteFicha(id: string, sucursalId: string | null): Promise<ClienteFicha | null> {
  const sb = await createClient();
  const { data: cliente } = await sb
    .from("clientes")
    .select("id, numero, nombre, telefono, correo, created_at, activo")
    .eq("id", id)
    .single();
  if (!cliente) return null;

  // `ventas`: método/barbero por venta (el RPC no los trae; se fusionan al historial
  // para poder editar). `barberos`: opciones del editor (sucursal activa).
  let barberosQ = sb.from("barberos").select("id, nombre").eq("activo", true);
  if (sucursalId) barberosQ = barberosQ.eq("sucursal_id", sucursalId);

  const [dash, notas, etiquetas, ventasMeta, barberos] = await Promise.all([
    clientePorId(sb, id, sucursalId),
    sb.from("cliente_notas").select("id, texto, created_at, autor_nombre").eq("cliente_id", id).order("created_at", { ascending: false }),
    sb.from("cliente_etiquetas").select("etiqueta").eq("cliente_id", id).order("created_at"),
    sb.from("ventas").select("id, metodo_pago, barbero_id").eq("cliente_id", id),
    barberosQ.order("nombre"),
  ]);

  const d = dash as { loyalty: LoyaltyRawData; historial: ClienteFicha["historial"] } | null;
  const metaMap = new Map((ventasMeta.data ?? []).map((v) => [v.id, v as { id: string; metodo_pago: "efectivo" | "tarjeta" | "transferencia"; barbero_id: string | null }]));

  return {
    cliente,
    loyalty: d?.loyalty ?? LOYALTY_VACIO,
    historial: (d?.historial ?? []).map((v) => {
      const m = metaMap.get(v.id);
      return { ...v, metodo_pago: m?.metodo_pago, barbero_id: m?.barbero_id ?? null };
    }),
    notas: notas.data ?? [],
    etiquetas: (etiquetas.data ?? []).map((e) => e.etiqueta),
    sucursalId,
    barberos: (barberos.data ?? []) as { id: string; nombre: string }[],
  };
}
