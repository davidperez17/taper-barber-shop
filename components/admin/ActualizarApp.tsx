"use client";

import { useState } from "react";

/**
 * Botón para traer la última versión sin cerrar la PWA.
 * iOS cachea el PWA de forma muy agresiva, así que además de pedir un service
 * worker nuevo BORRA todos los caches (chunks/estáticos viejos) y recarga desde
 * red. Con eso el deploy nuevo entra aunque el navegador sirviera algo viejo.
 */
export function ActualizarApp() {
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

  return (
    <button
      type="button"
      onClick={actualizar}
      disabled={cargando}
      aria-label="Actualizar app"
      title="Actualizar app"
      className="grid min-h-9 w-9 place-items-center rounded-lg border border-line text-muted hover:border-line-strong hover:text-ink disabled:opacity-60"
    >
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
    </button>
  );
}
