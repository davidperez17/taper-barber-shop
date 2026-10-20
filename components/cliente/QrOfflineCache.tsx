"use client";

import { useEffect } from "react";
import { QR_OFFLINE_KEY, type QrOffline } from "@/lib/qr-offline";

/**
 * Guarda nombre y número para /offline. Sobrescribe la copia vieja, que
 * traía el SVG del QR con el token de sesión (antes de 0040).
 */
export function QrOfflineCache({ nombre, memberId }: QrOffline) {
  useEffect(() => {
    try {
      localStorage.setItem(QR_OFFLINE_KEY, JSON.stringify({ nombre, memberId }));
    } catch {}
  }, [nombre, memberId]);
  return null;
}
