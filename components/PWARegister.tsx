"use client";

import { useEffect, useState } from "react";

/**
 * Registra el service worker (solo en producción para no chocar con HMR) y
 * gestiona las actualizaciones de la PWA en TODOS los dispositivos:
 * - Busca un SW nuevo al cargar y al reenfocar la app (clave en iOS).
 * - Cuando hay un SW nuevo en espera (waiting), muestra un aviso VISIBLE
 *   "Nueva versión disponible — Actualizar". El SW no toma control solo
 *   (sw.js ya no hace skipWaiting automático): lo decide el usuario.
 * - Al tocar Actualizar → postMessage SKIP_WAITING → el SW nuevo activa →
 *   controllerchange → recarga una vez para aplicar el deploy.
 */
export function PWARegister() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [aplicando, setAplicando] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const sw = navigator.serviceWorker;
    const hadController = !!sw.controller;
    let refreshing = false;

    sw.addEventListener("controllerchange", () => {
      if (refreshing || !hadController) return; // primera instalación: no recargar
      refreshing = true;
      window.location.reload();
    });

    sw.register("/sw.js")
      .then((reg) => {
        // Un SW ya esperando de una sesión anterior (update sin aplicar).
        if (reg.waiting && sw.controller) setWaiting(reg.waiting);

        // Un SW nuevo que termina de instalarse mientras el viejo controla =
        // update disponible (no primera instalación).
        reg.addEventListener("updatefound", () => {
          const nuevo = reg.installing;
          if (!nuevo) return;
          nuevo.addEventListener("statechange", () => {
            if (nuevo.state === "installed" && sw.controller) {
              setWaiting(reg.waiting ?? nuevo);
            }
          });
        });

        const check = () => reg.update().catch(() => {});
        // iOS reabre el PWA desde memoria; al reenfocar buscamos el deploy nuevo.
        document.addEventListener("visibilitychange", () => {
          if (!document.hidden) check();
        });
        check();
      })
      .catch(() => {});
  }, []);

  const actualizar = () => {
    if (!waiting) return;
    setAplicando(true);
    waiting.postMessage({ type: "SKIP_WAITING" }); // → activate → controllerchange → reload
  };

  if (!waiting) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 z-[var(--z-toast)] flex justify-center px-4"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 6rem)" }}
    >
      <div className="animate-fade-up w-full max-w-[420px] rounded-2xl border border-line bg-elevated p-3.5 shadow-[0_10px_34px_rgba(0,0,0,0.55)]">
        <div className="flex items-center gap-3">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Nueva versión disponible</p>
            <p className="text-xs text-muted">Actualiza para ver las últimas mejoras.</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setWaiting(null)}
            className="min-h-11 rounded-full px-4 text-[13px] font-medium text-muted hover:text-ink"
          >
            Ahora no
          </button>
          <button
            type="button"
            onClick={actualizar}
            disabled={aplicando}
            className="min-h-11 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink disabled:opacity-60"
          >
            {aplicando ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </div>
    </div>
  );
}
