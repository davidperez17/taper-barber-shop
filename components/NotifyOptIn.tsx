"use client";

import { useEffect, useState } from "react";
import { guardarSuscripcion, enviarPrueba, type SubJSON } from "@/app/push/actions";

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

type Estado = "oculto" | "ofrecer" | "guardando" | "listo";

// El descarte vive por sesión: "Ahora no" silencia el banner hasta que se
// vuelva a abrir la app, sin quemar el permiso del navegador.
const DESCARTE_KEY = "taper_notif_luego";

/**
 * Banner discreto para activar notificaciones push. Se auto-oculta si ya
 * están concedidas, denegadas, descartadas en esta sesión, o si el
 * navegador/plataforma no las soporta (iOS solo con la PWA instalada).
 */
export function NotifyOptIn() {
  const [estado, setEstado] = useState<Estado>("oculto");

  useEffect(() => {
    if (!VAPID) return;
    const soporta = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!soporta) return;
    // iOS: push solo en PWA instalada. Sin instalar, no ofrecer.
    if (isIOS() && !isStandalone()) return;
    if (Notification.permission === "denied") return;
    if (sessionStorage.getItem(DESCARTE_KEY)) return;
    // Depende de APIs del navegador: solo se puede decidir tras montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEstado(Notification.permission === "granted" ? "oculto" : "ofrecer");
  }, []);

  const descartar = () => {
    sessionStorage.setItem(DESCARTE_KEY, "1");
    setEstado("oculto");
  };

  const activar = async () => {
    try {
      setEstado("guardando");
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") return setEstado("oculto");

      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(VAPID!),
        }));

      const { ok } = await guardarSuscripcion(sub.toJSON() as SubJSON);
      setEstado(ok ? "listo" : "oculto");
    } catch {
      setEstado("oculto");
    }
  };

  if (estado === "oculto") return null;

  return (
    <div className="my-6 flex items-center gap-3 rounded-2xl border border-line bg-elevated p-3.5 text-left">
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
        <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      </span>

      <div className="min-w-0 flex-1">
        {estado === "listo" ? (
          <>
            <p className="text-sm font-semibold text-ink">Notificaciones activas</p>
            <button onClick={() => enviarPrueba()} className="mt-0.5 text-xs font-medium text-accent">
              Enviar prueba
            </button>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-ink">Activa las notificaciones</p>
            <p className="mt-0.5 text-xs leading-snug text-muted">Recompensas, citas y novedades al instante.</p>
          </>
        )}
      </div>

      {estado !== "listo" && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={activar}
            disabled={estado === "guardando"}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition-transform active:scale-95 disabled:opacity-60"
          >
            {estado === "guardando" ? "…" : "Activar"}
          </button>
          <button
            onClick={descartar}
            aria-label="Ahora no"
            className="flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:text-ink"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
