"use client";

import { useEffect, useState } from "react";
import { refrescarQr } from "@/app/(cliente)/actions";
import type { QrVigente } from "@/lib/qr";

// El escáner acepta un código hasta ~2.5 min (0040); a los 2 min sin poder
// renovarlo se avisa en vez de mostrar un QR que el cajero ya no podrá leer.
const VIGENCIA_MS = 120_000;
const REINTENTO_MS = 5_000;

/**
 * QR rotativo de la tarjeta: pide el siguiente cuando vence la ventana de
 * 30 s, pausa con la app en segundo plano y se pone al día al volver.
 * `vencido` = sin red el tiempo suficiente para que el código ya no sirva.
 */
export function useQrVigente(inicial: QrVigente): {
  svg: string;
  vencido: boolean;
  venceEn: number | null;
  /** Sube con cada QR nuevo (reinicia la barra de tiempo). */
  ciclo: number;
} {
  const [qr, setQr] = useState(inicial);
  const [ciclo, setCiclo] = useState(0);
  const [vencido, setVencido] = useState(false);
  // router.refresh() (venta en vivo, auto-refresh) trae un QR nuevo del servidor.
  const [previo, setPrevio] = useState(inicial);
  if (previo !== inicial) {
    setPrevio(inicial);
    setQr(inicial);
    setCiclo((c) => c + 1);
    setVencido(false);
  }

  useEffect(() => {
    // Base sin 0040: QR fijo, nada que renovar.
    if (inicial.venceEn === null) return;
    let vivo = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let obtenido = Date.now();
    let pidiendo = false;

    const pedir = async () => {
      clearTimeout(timer);
      // En segundo plano no se gasta: al volver, visibilitychange reanuda.
      if (pidiendo || document.visibilityState !== "visible") return;
      pidiendo = true;
      let siguiente: QrVigente | null = null;
      try {
        siguiente = await refrescarQr();
      } catch {
        /* sin red */
      }
      pidiendo = false;
      if (!vivo) return;
      if (siguiente) {
        obtenido = Date.now();
        setQr(siguiente);
        setCiclo((c) => c + 1);
        setVencido(false);
        timer = setTimeout(pedir, ((siguiente.venceEn ?? 30) + 0.5) * 1000);
        return;
      }
      if (Date.now() - obtenido > VIGENCIA_MS) setVencido(true);
      timer = setTimeout(pedir, REINTENTO_MS);
    };

    const alVolver = () => {
      if (document.visibilityState !== "visible") return;
      // Mientras llega el nuevo, no mostrar uno que ya no sirve.
      if (Date.now() - obtenido > VIGENCIA_MS) setVencido(true);
      void pedir();
    };

    timer = setTimeout(pedir, (inicial.venceEn + 0.5) * 1000);
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("online", alVolver);
    return () => {
      vivo = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("online", alVolver);
    };
  }, [inicial]);

  return { svg: qr.svg, vencido, venceEn: qr.venceEn, ciclo };
}
