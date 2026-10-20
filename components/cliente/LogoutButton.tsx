"use client";

import { useState } from "react";
import { logout } from "@/app/(cliente)/actions";

/**
 * Cerrar sesión del cliente. Antes de soltar la cookie libera lo que quedaba
 * atado a esta persona en el teléfono: su suscripción push (si no, el próximo
 * cliente en el mismo teléfono recibía sus avisos) y las claves taper_* locales
 * (QR offline, nivel visto, sync de push).
 */
export function LogoutButton() {
  const [pending, setPending] = useState(false);

  async function salir() {
    setPending(true);
    let endpoint: string | null = null;
    try {
      const reg = await navigator.serviceWorker?.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        endpoint = sub.endpoint;
        await sub.unsubscribe().catch(() => {});
      }
    } catch {}
    try {
      for (const store of [localStorage, sessionStorage]) {
        Object.keys(store)
          .filter((k) => k.startsWith("taper_"))
          .forEach((k) => store.removeItem(k));
      }
    } catch {}
    await logout(endpoint);
  }

  return (
    <button
      type="button"
      onClick={salir}
      disabled={pending}
      className="mt-8 min-h-11 text-sm text-muted underline-offset-4 hover:text-danger hover:underline disabled:opacity-60"
    >
      {pending ? "Cerrando sesión…" : "Cerrar sesión"}
    </button>
  );
}
