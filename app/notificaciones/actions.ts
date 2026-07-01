"use server";

import { createAdmin } from "@/lib/supabase/admin";
import { clienteIdActual, getBandeja, type Noti } from "@/lib/queries/notificaciones";

/** Recarga la bandeja del cliente actual (para refrescar tras abrir). */
export async function cargarBandeja(): Promise<{ notis: Noti[]; noLeidas: number }> {
  const clienteId = await clienteIdActual();
  if (!clienteId) return { notis: [], noLeidas: 0 };
  return getBandeja(clienteId);
}

/** Marca una notificación como leída (solo si es del cliente de la sesión). */
export async function marcarNotiLeida(id: string): Promise<{ ok: boolean }> {
  const clienteId = await clienteIdActual();
  if (!clienteId) return { ok: false };
  const { error } = await createAdmin()
    .from("notificaciones")
    .update({ leida: true })
    .eq("id", id)
    .eq("cliente_id", clienteId);
  return { ok: !error };
}
