import "server-only";
import { createAdmin } from "@/lib/supabase/admin";
import { getWebPush } from "./webpush";

/** Una fila de push_subscriptions (lo mínimo para enviar). */
export interface Suscripcion {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Contenido que recibe el Service Worker en el evento `push`. */
export interface PushPayload {
  title: string;
  body: string;
  /** Deep-link al hacer click. Default "/". */
  url?: string;
  /** Ícono; default el de la marca. */
  icon?: string;
  /** Agrupa/reemplaza notificaciones con el mismo tag. */
  tag?: string;
}

/**
 * Envía `payload` a un conjunto de suscripciones en paralelo.
 * Poda automáticamente las expiradas (404/410). Devuelve cuántas llegaron.
 * Nunca lanza: los errores por suscripción se aíslan.
 */
export async function enviarPush(
  subs: Suscripcion[],
  payload: PushPayload,
): Promise<{ enviadas: number; podadas: number }> {
  if (subs.length === 0) return { enviadas: 0, podadas: 0 };

  const webpush = getWebPush();
  const data = JSON.stringify(payload);
  const expiradas: string[] = [];
  let enviadas = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data,
        );
        enviadas++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) expiradas.push(s.endpoint);
        // Otros errores (red, 5xx): se ignoran, se reintentará en el próximo evento.
      }
    }),
  );

  if (expiradas.length > 0) {
    await createAdmin().from("push_subscriptions").delete().in("endpoint", expiradas);
  }

  return { enviadas, podadas: expiradas.length };
}
