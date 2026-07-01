"use client";

import { useEffect, useState } from "react";
import { guardarSuscripcion, enviarPrueba, type SubJSON } from "@/app/push/actions";
import { IconBell } from "@/components/icons";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as unknown as { standalone?: boolean }).standalone === true;

const isIOS = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
  !/crios|fxios/i.test(window.navigator.userAgent);

/** VAPID public key (base64url) → Uint8Array para applicationServerKey. */
function urlB64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// off = puede activar; on = suscrito; guardando = en curso;
// no-disp = no soportado o iOS sin instalar / permiso denegado.
type Estado = "off" | "on" | "guardando" | "no-disp";

/**
 * Campana del header cliente. A diferencia del banner [[NotifyOptIn]], siempre
 * está visible: si no hay suscripción muestra un punto y al tocarla pide permiso
 * y se suscribe; si ya está activa, la toca envía una notificación de prueba.
 */
export function NotifyBell() {
  const [estado, setEstado] = useState<Estado>("no-disp");

  useEffect(() => {
    if (!VAPID) return;
    const soporta =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!soporta) return;
    if (isIOS() && !isStandalone()) return;
    if (Notification.permission === "denied") return;
    if (Notification.permission !== "granted") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEstado("off");
      return;
    }
    // Permiso concedido: confirmar que la suscripción sigue viva.
    let vivo = true;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (vivo) setEstado(sub ? "on" : "off");
      })
      .catch(() => vivo && setEstado("off"));
    return () => {
      vivo = false;
    };
  }, []);

  const activar = async () => {
    try {
      setEstado("guardando");
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") return setEstado("no-disp");

      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(VAPID!),
        }));

      const { ok } = await guardarSuscripcion(sub.toJSON() as SubJSON);
      setEstado(ok ? "on" : "off");
    } catch {
      setEstado("off");
    }
  };

  const onClick = () => {
    if (estado === "guardando") return;
    if (estado === "on") return void enviarPrueba();
    void activar();
  };

  const puede = estado !== "no-disp";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={estado === "guardando"}
      aria-label={estado === "on" ? "Enviar notificación de prueba" : "Activar notificaciones"}
      className="relative flex size-11 items-center justify-center rounded-full border border-line bg-elevated text-muted transition-transform active:scale-95 disabled:opacity-60"
    >
      <IconBell />
      {puede && estado !== "on" && (
        <span className="absolute right-2.5 top-2 size-[7px] rounded-full bg-accent ring-2 ring-bg" />
      )}
    </button>
  );
}
