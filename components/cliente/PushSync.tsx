"use client";

import { useEffect } from "react";
import { pushDisponible, sincronizarPush } from "@/lib/push/cliente";

// Una vez por sesión de la app: si el permiso ya está concedido, re-guarda la
// suscripción en el servidor (y la recrea si la llave VAPID cambió). Sin esto,
// un cliente que activó push y nunca vuelve a Perfil queda sin recibir nada si
// su fila se podó o su suscripción quedó desfasada.
const SYNC_KEY = "taper_push_sync";

export function PushSync() {
  useEffect(() => {
    if (!pushDisponible() || Notification.permission !== "granted") return;
    try {
      if (sessionStorage.getItem(SYNC_KEY)) return;
      sessionStorage.setItem(SYNC_KEY, "1");
    } catch {}
    sincronizarPush().catch(() => {});
  }, []);
  return null;
}
