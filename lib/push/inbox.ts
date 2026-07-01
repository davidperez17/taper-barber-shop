import "server-only";
import { createAdmin } from "@/lib/supabase/admin";

/** Contenido de una notificación para la bandeja del cliente. */
export interface NotiInput {
  tipo?: string;
  titulo: string;
  cuerpo: string;
  url?: string | null;
}

/**
 * Registra una notificación en la bandeja de un cliente. Nunca lanza: la
 * bandeja es secundaria, un fallo aquí no debe romper la operación principal.
 */
export async function registrarNoti(clienteId: string, noti: NotiInput): Promise<void> {
  try {
    await createAdmin().from("notificaciones").insert({
      cliente_id: clienteId,
      tipo: noti.tipo ?? "general",
      titulo: noti.titulo,
      cuerpo: noti.cuerpo,
      url: noti.url ?? null,
    });
  } catch {}
}

/** Registra la misma notificación para todos los clientes (difusión/promos). */
export async function registrarNotiTodosClientes(noti: NotiInput): Promise<void> {
  try {
    const admin = createAdmin();
    const { data } = await admin.from("clientes").select("id");
    const ids = (data as { id: string }[] | null) ?? [];
    if (ids.length === 0) return;
    await admin.from("notificaciones").insert(
      ids.map((c) => ({
        cliente_id: c.id,
        tipo: noti.tipo ?? "general",
        titulo: noti.titulo,
        cuerpo: noti.cuerpo,
        url: noti.url ?? null,
      })),
    );
  } catch {}
}
