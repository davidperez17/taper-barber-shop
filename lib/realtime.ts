/**
 * Broadcast a Supabase Realtime vía REST (sin abrir websocket en el server).
 * Canal público por cliente: `cliente:{uuid}`. El payload no lleva datos
 * sensibles — es solo un "toque" para que la PWA refresque y celebre; los
 * datos reales los trae el refresh por el canal autenticado (qr_token).
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
        messages: [{ topic: `cliente:${clienteId}`, event: "venta", payload: {} }],
      }),
    });
  } catch {
    // Mejor esfuerzo: si Realtime no responde, la venta ya quedó registrada
    // y el cliente verá su progreso al reabrir la app (AutoRefresh).
  }
}
