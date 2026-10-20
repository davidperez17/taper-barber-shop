"use client";

import { useEffect } from "react";
import { QR_OFFLINE_KEY, type QrOffline } from "@/lib/qr-offline";

/** Guarda el QR vigente para que /offline pueda mostrarlo sin red. */
export function QrOfflineCache(props: QrOffline) {
  const { nombre, memberId, qrSvg } = props;
  useEffect(() => {
    try {
      localStorage.setItem(QR_OFFLINE_KEY, JSON.stringify({ nombre, memberId, qrSvg }));
    } catch {}
  }, [nombre, memberId, qrSvg]);
  return null;
}
