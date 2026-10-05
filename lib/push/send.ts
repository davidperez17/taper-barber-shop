import "server-only";
import { createAdmin } from "@/lib/supabase/admin";
import { getWebPush } from "./webpush";

/** Una fila de push_subscriptions (lo mínimo para enviar). */
export interface Suscripcion {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Ícono de la app admin, para que los avisos al staff se distingan. */
export const ICONO_STAFF = "/admin-icon-192.png";

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

// TTL: si el dispositivo está apagado, el push service guarda el mensaje
// hasta 1 día (el default de web-push son 4 semanas: un recordatorio de cita
// llegaría días tarde). Urgencia alta para que iOS/Android no lo difieran en
// ahorro de batería.
const OPCIONES = { TTL: 60 * 60 * 24, urgency: "high" as const };

/**
 * Envía `payload` a un conjunto de suscripciones en paralelo.
 * Poda automáticamente las expiradas (404/410). Devuelve cuántas llegaron.
 * Nunca lanza: los errores por suscripción se aíslan y se registran en logs.
 */
export async function enviarPush(
  subs: Suscripcion[],
  payload: PushPayload,
): Promise<{ enviadas: number; podadas: number; fallidas: number }> {
  if (subs.length === 0) return { enviadas: 0, podadas: 0, fallidas: 0 };

  const webpush = getWebPush();
  const data = JSON.stringify(payload);
  const expiradas: string[] = [];
  let enviadas = 0;
  let fallidas = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data,
          OPCIONES,
        );
        enviadas++;
      } catch (err) {
        const { statusCode: code, body } = err as { statusCode?: number; body?: string };
        if (code === 404 || code === 410) {
          expiradas.push(s.endpoint);
          return;
        }
        // 403 = llave VAPID distinta a la de la suscripción; 400/413 = payload
        // o JWT inválido; sin código = red. Se registra para diagnosticar en
        // los logs de Vercel (antes se tragaba en silencio).
        fallidas++;
        console.error(
          `[push] fallo ${code ?? "red"} → ${new URL(s.endpoint).host}:`,
          body || (err as Error).message,
        );
      }
    }),
  );

  if (expiradas.length > 0) {
    await createAdmin().from("push_subscriptions").delete().in("endpoint", expiradas);
  }

  return { enviadas, podadas: expiradas.length, fallidas };
}
