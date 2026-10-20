"use server";

import { headers } from "next/headers";
import { createAdmin } from "@/lib/supabase/admin";
import { getQrToken } from "@/lib/session";
import { getStaff } from "@/lib/queries/staff";
import { enviarPush, ICONO_STAFF } from "@/lib/push/send";
import { subsDeCliente, subsDeStaff } from "@/lib/push/targets";

/** Suscripción tal como la serializa el navegador (PushSubscription.toJSON()). */
export interface SubJSON {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
}

type Owner = { type: AppPush; id: string; sucursalId: string | null };

/** App desde la que se llama: cada una tiene su propia suscripción. */
export type AppPush = "cliente" | "staff";

/**
 * Dueño de la sesión para esa app. Explícito porque un mismo navegador puede
 * tener a la vez sesión de staff y cookie de cliente: inferirlo (staff
 * primero) guardaba como staff la suscripción de la app cliente.
 */
async function ownerActual(app: AppPush): Promise<Owner | null> {
  if (app === "staff") {
    const staff = await getStaff();
    return staff ? { type: "staff", id: staff.id, sucursalId: staff.sucursal_id } : null;
  }

  const token = await getQrToken();
  if (!token) return null;
  const { data } = await createAdmin()
    .from("clientes")
    .select("id")
    .eq("qr_token", token)
    .single();
  if (!data) return null;
  return { type: "cliente", id: data.id as string, sucursalId: null };
}

// Solo push services reales: el servidor hace POST a cada endpoint guardado en
// cada difusión/cron, así que una URL arbitraria era un SSRF a ciegas.
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^android\.googleapis\.com$/,
  /(^|\.)push\.apple\.com$/,
  /(^|\.)notify\.windows\.com$/,
  /(^|\.)push\.services\.mozilla\.com$/,
];
function endpointPushValido(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && PUSH_HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

/** Guarda (o refresca) la suscripción push del usuario actual. */
export async function guardarSuscripcion(sub: SubJSON, app: AppPush): Promise<{ ok: boolean }> {
  const owner = await ownerActual(app);
  if (!owner) return { ok: false };
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false };
  if (!endpointPushValido(sub.endpoint)) return { ok: false };

  const ua = (await headers()).get("user-agent") ?? null;

  const { error } = await createAdmin()
    .from("push_subscriptions")
    .upsert(
      {
        owner_type: owner.type,
        owner_id: owner.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        sucursal_id: owner.sucursalId,
        user_agent: ua,
        last_seen: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );

  return { ok: !error };
}

/**
 * Elimina la suscripción de un endpoint, solo si es del usuario actual de esa
 * app (antes bastaba conocer el endpoint para borrar la de cualquiera).
 */
export async function borrarSuscripcion(endpoint: string, app: AppPush = "cliente"): Promise<{ ok: boolean }> {
  if (!endpoint) return { ok: false };
  const owner = await ownerActual(app);
  if (!owner) return { ok: false };
  await createAdmin()
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("owner_type", owner.type)
    .eq("owner_id", owner.id);
  return { ok: true };
}

/**
 * Quita la fila staff de un endpoint del staff actual (la suscripción raíz que
 * usaba antes de tener registro propio). Si esa fila ya es de un cliente, no
 * la toca.
 */
export async function soltarSuscripcionStaff(endpoint: string): Promise<void> {
  const staff = await getStaff();
  if (!staff || !endpoint) return;
  await createAdmin()
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("owner_type", "staff")
    .eq("owner_id", staff.id);
}

/** Envía una notificación de prueba a los dispositivos del usuario actual. */
export async function enviarPrueba(app: AppPush): Promise<{ ok: boolean; enviadas: number }> {
  const owner = await ownerActual(app);
  if (!owner) return { ok: false, enviadas: 0 };

  const subs = owner.type === "staff" ? await subsDeStaff(owner.id) : await subsDeCliente(owner.id);
  const { enviadas } = await enviarPush(subs, {
    title: "Taper Barber",
    body: "🔔 Notificaciones activadas. ¡Listo!",
    url: owner.type === "staff" ? "/admin" : "/",
    ...(owner.type === "staff" && { icon: ICONO_STAFF }),
  });
  return { ok: true, enviadas };
}
