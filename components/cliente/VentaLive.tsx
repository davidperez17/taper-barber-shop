"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Escucha el canal realtime del cliente: cuando el cajero registra una venta,
 * refresca la tarjeta al instante (el sello nuevo hace su pop) y suena un
 * "ding" de logro. Sin polling; websocket de Supabase Realtime.
 *
 * Audio: iOS/Android exigen un gesto previo para sonar — el AudioContext se
 * desbloquea con el primer toque en la página (abrir la app ya lo es en la
 * práctica: el usuario navega). Si aún está bloqueado, vibra como fallback.
 */
export function VentaLive({ clienteId }: { clienteId: string }) {
  const router = useRouter();
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Desbloqueo de audio en el primer gesto (una sola vez).
    const unlock = () => {
      if (!ctxRef.current) {
        try {
          ctxRef.current = new AudioContext();
        } catch {
          return;
        }
      }
      if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    };
    window.addEventListener("pointerdown", unlock, { passive: true });

    // Respeta reduced-motion: nada de sonido/vibración sorpresa (el refresh
    // visual del sello sí ocurre igual).
    const quieto = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const ding = () => {
      if (quieto) return;
      const ctx = ctxRef.current;
      if (!ctx || ctx.state !== "running") {
        navigator.vibrate?.(120);
        return;
      }
      // Dos notas ascendentes (E5 → B5): logro, no alarma.
      const t0 = ctx.currentTime;
      for (const [freq, dt] of [[659.25, 0], [987.77, 0.09]] as const) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, t0 + dt);
        gain.gain.linearRampToValueAtTime(0.18, t0 + dt + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.4);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0 + dt);
        osc.stop(t0 + dt + 0.45);
      }
      navigator.vibrate?.(60);
    };

    const sb = createClient();
    const canal = sb
      .channel(`cliente:${clienteId}`)
      .on("broadcast", { event: "venta" }, () => {
        ding();
        router.refresh(); // trae el progreso nuevo → stamp-pop del sello
      })
      .subscribe();

    return () => {
      window.removeEventListener("pointerdown", unlock);
      void sb.removeChannel(canal);
      void ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, [clienteId, router]);

  return null;
}
