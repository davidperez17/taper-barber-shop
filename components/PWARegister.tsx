"use client";

import { useEffect } from "react";

/**
 * Registra el service worker (solo en producción para no chocar con HMR) y
 * mantiene la PWA al día en TODOS los dispositivos:
 * - Busca un SW nuevo al reenfocar la app (clave en iOS, que no revalida solo).
 * - Cuando un SW nuevo toma control, recarga una vez para aplicar el deploy.
 *   (No recarga en la primera instalación: solo cuando reemplaza a uno previo.)
 */
export function PWARegister() {
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
        const check = () => reg.update().catch(() => {});
        // iOS reabre el PWA desde memoria; al reenfocar buscamos el deploy nuevo.
        document.addEventListener("visibilitychange", () => {
          if (!document.hidden) check();
        });
        check();
      })
      .catch(() => {});
  }, []);

  return null;
}
