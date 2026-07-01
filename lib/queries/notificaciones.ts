import "server-only";
import { createAdmin } from "@/lib/supabase/admin";
import { getQrToken } from "@/lib/session";

/** Una notificación de la bandeja del cliente. */
export interface Noti {
  id: string;
  tipo: string;
  titulo: string;
  cuerpo: string;
  url: string | null;
  leida: boolean;
  created_at: string;
}

const COLS = "id, tipo, titulo, cuerpo, url, leida, created_at";
const LIMITE = 40;

/** id del cliente de la sesión actual (por qr_token), o null. */
export async function clienteIdActual(): Promise<string | null> {
  const token = await getQrToken();
  if (!token) return null;
  const { data } = await createAdmin()
    .from("clientes")
    .select("id")
    .eq("qr_token", token)
    .single();
  return (data?.id as string) ?? null;
}

/** Bandeja del cliente: últimas notificaciones + cuántas sin leer. */
export async function getBandeja(
  clienteId: string,
): Promise<{ notis: Noti[]; noLeidas: number }> {
  // Tolerante: si la migración 0020 aún no está aplicada, no romper la tarjeta.
  try {
    const admin = createAdmin();
    const [{ data }, { count }] = await Promise.all([
      admin
        .from("notificaciones")
        .select(COLS)
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false })
        .limit(LIMITE),
      admin
        .from("notificaciones")
        .select("id", { count: "exact", head: true })
        .eq("cliente_id", clienteId)
        .eq("leida", false),
    ]);
    return { notis: (data as Noti[]) ?? [], noLeidas: count ?? 0 };
  } catch {
    return { notis: [], noLeidas: 0 };
  }
}
