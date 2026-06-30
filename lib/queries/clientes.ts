import { createClient } from "@/lib/supabase/server";
import type { ClienteRow, ClienteFicha, LoyaltyRawData } from "@/lib/types";

const LOYALTY_VACIO: LoyaltyRawData = {
  cortes_total: 0,
  visitas_12m: 0,
  recompensas_canjeadas: 0,
  cortes_objetivo: 6,
  ultima_visita: null,
};

/** Lista de clientes activos con su lealtad (merge clientes + view). */
export async function getClientesConLealtad(): Promise<ClienteRow[]> {
  const sb = await createClient();
  const [clientes, loyalty] = await Promise.all([
    sb.from("clientes").select("id, numero, nombre, telefono, correo, created_at").eq("activo", true).order("nombre"),
    sb.from("cliente_loyalty").select("*"),
  ]);

  const lmap = new Map((loyalty.data ?? []).map((l) => [l.cliente_id, l as LoyaltyRawData & { cliente_id: string }]));
  return (clientes.data ?? []).map((c) => ({
    ...c,
    loyalty: lmap.get(c.id) ?? LOYALTY_VACIO,
  })) as ClienteRow[];
}

/** Ficha 360 de un cliente: datos + lealtad + historial + notas + etiquetas. */
export async function getClienteFicha(id: string): Promise<ClienteFicha | null> {
  const sb = await createClient();
  const { data: cliente } = await sb
    .from("clientes")
    .select("id, numero, nombre, telefono, correo, qr_token, created_at, activo")
    .eq("id", id)
    .single();
  if (!cliente) return null;

  const [dash, notas, etiquetas] = await Promise.all([
    sb.rpc("get_cliente_by_qr", { p_qr_token: cliente.qr_token }),
    sb.from("cliente_notas").select("id, texto, created_at").eq("cliente_id", id).order("created_at", { ascending: false }),
    sb.from("cliente_etiquetas").select("etiqueta").eq("cliente_id", id).order("created_at"),
  ]);

  const d = dash.data as { loyalty: LoyaltyRawData; historial: ClienteFicha["historial"] } | null;

  return {
    cliente,
    loyalty: d?.loyalty ?? LOYALTY_VACIO,
    historial: d?.historial ?? [],
    notas: notas.data ?? [],
    etiquetas: (etiquetas.data ?? []).map((e) => e.etiqueta),
  };
}
