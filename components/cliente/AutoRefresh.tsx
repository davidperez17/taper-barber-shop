"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Refresca los datos del cliente cuando la app vuelve a primer plano.
 * Cubre el flujo real: el cajero registra la venta y el cliente ve su
 * progreso actualizado al reabrir la PWA. (Realtime push: ver step 7.)
 */
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);
  return null;
}
