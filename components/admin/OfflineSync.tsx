"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { recordVenta } from "@/app/admin/actions";
import { getQueue, setQueue } from "@/lib/offline";

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

/** Banner offline + sincronización de la cola de ventas al reconectar. */
export function OfflineSync() {
  // Estado del navegador como external store (sin setState en effect; SSR asume online).
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const [synced, setSynced] = useState(0);
  // Motivo del primer rechazo al vaciar la cola (p. ej. canje fuera de horario):
  // sin esto la venta se queda en `pendientes` para siempre y nadie se entera.
  const [rechazo, setRechazo] = useState<string | null>(null);
  const router = useRouter();

  // Vacía la cola al montar y en cada reconexión.
  useEffect(() => {
    if (!online) return;
    let cancelado = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    (async () => {
      const q = getQueue();
      if (q.length === 0) return;
      const pendientes = [];
      let ok = 0;
      let motivo: string | null = null;
      for (const v of q) {
        const r = await recordVenta(v);
        if (r.ok) ok++;
        else {
          pendientes.push(v);
          motivo ??= r.error;
        }
      }
      setQueue(pendientes);
      if (cancelado) return;
      if (motivo) {
        setRechazo(motivo);
        timers.push(setTimeout(() => setRechazo(null), 8000));
      }
      if (ok > 0) {
        setSynced(ok);
        router.refresh();
        // Si hay rechazo, el toast de éxito espera a que ese aviso se vaya.
        timers.push(setTimeout(() => setSynced(0), motivo ? 12000 : 4000));
      }
    })();

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
          Venta pendiente sin sincronizar: {rechazo}
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
