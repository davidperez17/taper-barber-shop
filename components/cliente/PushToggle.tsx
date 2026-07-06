"use client";

import { useEffect, useState } from "react";
import { guardarSuscripcion, borrarSuscripcion, type SubJSON } from "@/app/push/actions";

// Defensivo: si en Vercel se pegó la clave con comillas, quítalas.
const VAPID = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").replace(/^["']|["']$/g, "").trim();

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as unknown as { standalone?: boolean }).standalone === true;

const isIOS = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
  !/crios|fxios/i.test(window.navigator.userAgent);

function urlB64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// on = suscrito; off = puede activar; guardando = en curso;
// bloqueado = permiso denegado; no-disp = sin soporte / iOS sin instalar / sin clave.
type Estado = "on" | "off" | "guardando" | "bloqueado" | "no-disp";

/** Fila de ajuste en Perfil para activar/desactivar las notificaciones push. */
export function PushToggle() {
  const [estado, setEstado] = useState<Estado>("no-disp");

  useEffect(() => {
    if (!VAPID) return;
    const soporta =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!soporta) return;
    if (isIOS() && !isStandalone()) return;
    // Depende de APIs del navegador: solo se puede decidir tras montar.
    if (Notification.permission === "denied") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEstado("bloqueado");
      return;
    }
    if (Notification.permission !== "granted") {
      setEstado("off");
      return;
    }
    let vivo = true;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => vivo && setEstado(sub ? "on" : "off"))
      .catch(() => vivo && setEstado("off"));
    return () => {
      vivo = false;
    };
  }, []);

  const activar = async () => {
    if (!VAPID) return;
    try {
      setEstado("guardando");
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") return setEstado(permiso === "denied" ? "bloqueado" : "off");

      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(VAPID),
        }));
      const { ok } = await guardarSuscripcion(sub.toJSON() as SubJSON);
      setEstado(ok ? "on" : "off");
    } catch (e) {
      console.error("[push] fallo al activar:", e);
      setEstado("off");
    }
  };

  const desactivar = async () => {
    try {
      setEstado("guardando");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await borrarSuscripcion(sub.endpoint);
        await sub.unsubscribe();
      }
      setEstado("off");
    } catch (e) {
      console.error("[push] fallo al desactivar:", e);
      setEstado("on");
    }
  };

  if (estado === "no-disp") return null;

  const activo = estado === "on";
  const ocupado = estado === "guardando";

  return (
    <div className="mt-6 flex items-center gap-3 rounded-xl border border-line bg-elevated p-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">Notificaciones</p>
        <p className="mt-0.5 text-xs leading-snug text-muted">
          {estado === "bloqueado"
            ? "Bloqueadas. Actívalas en los ajustes del navegador."
            : "Recompensas, citas y promos al instante."}
        </p>
      </div>

      {estado === "bloqueado" ? null : (
        <button
          type="button"
          role="switch"
          aria-checked={activo}
          aria-label={activo ? "Desactivar notificaciones" : "Activar notificaciones"}
          disabled={ocupado}
          onClick={activo ? desactivar : activar}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${activo ? "bg-accent" : "bg-line-strong"}`}
        >
          <span
            className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white transition-transform ${activo ? "translate-x-5" : "translate-x-0"}`}
          />
        </button>
      )}
    </div>
  );
}
