"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { recordVenta } from "@/app/admin/actions";
import { descartarRechazadas, getQueue, marcarRechazo, quitarDeCola } from "@/lib/offline";

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

/**
 * Un solo sincronizador a la vez entre pestañas (PWA + navegador): sin el lock
 * las dos leían la misma cola y reenviaban todo. Sin Web Locks, corre directo.
 */
function conLock(fn: () => Promise<void>): Promise<void> {
  const locks = (navigator as Navigator & { locks?: LockManager }).locks;
  if (!locks) return fn();
  return locks.request("taper-venta-sync", { ifAvailable: true }, async (lock) => {
    if (lock) await fn();
  });
}

/** Banner offline + sincronización de la cola de ventas al reconectar. */
export function OfflineSync() {
  // Estado del navegador como external store (sin setState en effect; SSR asume online).
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const [synced, setSynced] = useState(0);
  // Motivo del primer rechazo al vaciar la cola (p. ej. canje fuera de horario):
  // la venta queda marcada en la cola y el cajero puede descartarla.
  const [rechazo, setRechazo] = useState<string | null>(null);
  const router = useRouter();

  // Vacía la cola al montar y en cada reconexión.
  useEffect(() => {
    if (!online) return;
    let cancelado = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    conLock(async () => {
      const q = getQueue();
      if (q.length === 0) return;
      let ok = 0;
      let motivo: string | null = null;
      for (const v of q) {
        let r;
        try {
          r = await recordVenta(v);
        } catch {
          break; // la red volvió a caer: lo que falta queda en la cola
        }
        if (r.ok) {
          ok++;
          if (v.clientId) quitarDeCola(v.clientId);
        } else {
          motivo ??= r.error;
          if (v.clientId) marcarRechazo(v.clientId, r.error);
        }
      }
      if (cancelado) return;
      if (motivo) setRechazo(motivo);
      if (ok > 0) {
        setSynced(ok);
        router.refresh();
        timers.push(setTimeout(() => setSynced(0), 4000));
      }
    }).catch(() => {});

    return () => {
      cancelado = true;
      for (const t of timers) clearTimeout(t);
    };
  }, [online, router]);

  return (
    <>
      {!online && (
        <div role="status" className="bg-warning/15 px-5 py-2 text-center text-[13px] font-medium text-warning">
          Sin conexión — las ventas se guardan y sincronizan al reconectar.
        </div>
      )}
      {rechazo && (
        <div
          role="alert"
          className="animate-fade-up fixed bottom-5 left-1/2 z-[var(--z-toast)] w-[min(92vw,26rem)] -translate-x-1/2 rounded-2xl bg-danger px-5 py-3 text-center text-sm font-semibold text-white shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
        >
          <p>Venta pendiente sin sincronizar: {rechazo}</p>
          <div className="mt-2 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setRechazo(null)}
              className="min-h-9 rounded-full bg-white/15 px-4 text-[13px] font-semibold"
            >
              Reintentar luego
            </button>
            <button
              type="button"
              onClick={() => {
                descartarRechazadas();
                setRechazo(null);
              }}
              className="min-h-9 rounded-full bg-white px-4 text-[13px] font-semibold text-danger"
            >
              Descartar venta
            </button>
          </div>
        </div>
      )}
      {synced > 0 && !rechazo && (
        <div
          role="status"
          aria-live="polite"
          className="animate-fade-up fixed bottom-5 left-1/2 z-[var(--z-toast)] -translate-x-1/2 rounded-full bg-success px-5 py-2.5 text-sm font-semibold text-[var(--success-ink)] shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
        >
          {synced} venta{synced === 1 ? "" : "s"} sincronizada{synced === 1 ? "" : "s"}
        </div>
      )}
    </>
  );
}
