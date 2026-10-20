import { createHmac } from "node:crypto";

/**
 * Nombre del canal Realtime de un cliente. Antes era `cliente:{uuid}`:
 * cualquiera con la anon key (pública) y el id podía escuchar cuándo visita
 * la barbería o mandarle avisos falsos. Ahora el sufijo es un HMAC del id
 * con una llave de servidor: solo lo conocen el servidor y la tarjeta del
 * propio cliente (se lo pasa la página ya autenticada por su cookie).
 *
 * Supabase "private channels" no sirven aquí: exigen un JWT de Supabase y la
 * PWA cliente no tiene sesión de auth (su identidad es la cookie).
 * La llave es la service role: si se rota, el canal cambia y las tarjetas
 * abiertas lo toman al recargar (AutoRefresh / próxima visita).
 */
export function canalCliente(clienteId: string): string {
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!llave) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY para el canal realtime.");
  const firma = createHmac("sha256", llave).update(`canal-cliente:${clienteId}`).digest("hex").slice(0, 32);
  return `cliente:${firma}`;
}

/**
 * Broadcast a Supabase Realtime vía REST (sin abrir websocket en el server).
 * El payload no lleva datos: es solo un "toque" para que la PWA refresque y
 * celebre; los datos reales los trae el refresh por la sesión (cookie).
 */
export async function broadcastVenta(clienteId: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;
  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ topic: canalCliente(clienteId), event: "venta", payload: {} }],
      }),
    });
  } catch {
    // Mejor esfuerzo: si Realtime no responde, la venta ya quedó registrada
    // y el cliente verá su progreso al reabrir la app (AutoRefresh).
  }
}
