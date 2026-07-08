"use client";

import { useState } from "react";

/**
 * Botón para traer la última versión sin cerrar la PWA.
 * Pide al navegador un service worker nuevo (refresca estáticos cacheados) y
 * recarga. La navegación es network-first, así que el HTML/JS del deploy nuevo
 * entra en el reload aunque el SW aún esté instalando en segundo plano.
 */
export function ActualizarApp() {
  const [cargando, setCargando] = useState(false);

  async function actualizar() {
    setCargando(true);
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        await reg?.update();
      }
    } catch {
      // sin SW o red caída: recargamos igual, no dejamos el botón colgado
    }
    window.location.reload();
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
