"use client";

import { useState } from "react";

/**
 * Botón para traer la última versión sin cerrar la PWA.
 * iOS cachea el PWA de forma muy agresiva, así que además de pedir un service
 * worker nuevo BORRA todos los caches (chunks/estáticos viejos) y recarga desde
 * red. Con eso el deploy nuevo entra aunque el navegador sirviera algo viejo.
 *
 * variant "icon": botón cuadrado (header del panel admin).
 * variant "full": botón con label (perfil del cliente).
 */
export function ActualizarApp({ variant = "icon" }: { variant?: "icon" | "full" }) {
  const [cargando, setCargando] = useState(false);

  async function actualizar() {
    setCargando(true);
    try {
      // 1) Borra TODOS los caches del SW (lo que deja la app pegada en iOS).
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      // 2) Fuerza un SW nuevo y que tome control de inmediato si hay uno esperando.
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.update();
          reg.waiting?.postMessage({ type: "SKIP_WAITING" });
        }
      }
    } catch {
      // sin SW/caches o red caída: recargamos igual, no dejamos el botón colgado
    }
    // 3) Recarga desde red (cache-busting por query para saltar el HTTP cache de iOS).
    const u = new URL(window.location.href);
    u.searchParams.set("v", Date.now().toString(36));
    window.location.replace(u.toString());
  }

  const Icono = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`}
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={actualizar}
        disabled={cargando}
        className="mt-6 flex w-full items-center gap-3 rounded-2xl border border-line bg-elevated p-3.5 text-left disabled:opacity-60"
      >
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
          {Icono}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">Actualizar app</span>
          <span className="mt-0.5 block text-xs leading-snug text-muted">
            {cargando ? "Actualizando…" : "Trae la última versión y limpia el caché."}
          </span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={actualizar}
      disabled={cargando}
      aria-label="Actualizar app"
      title="Actualizar app"
      className="grid min-h-9 w-9 place-items-center rounded-lg border border-line text-muted hover:border-line-strong hover:text-ink disabled:opacity-60"
    >
      {Icono}
    </button>
  );
}
