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
  const router = useRouter();

  // Vacía la cola al montar y en cada reconexión.
  useEffect(() => {
    if (!online) return;
    let cancelado = false;
    let t: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      const q = getQueue();
      if (q.length === 0) return;
      const pendientes = [];
      let ok = 0;
      for (const v of q) {
        const r = await recordVenta(v);
        if (r.ok) ok++;
        else pendientes.push(v);
      }
      setQueue(pendientes);
      if (ok > 0 && !cancelado) {
        setSynced(ok);
        router.refresh();
        t = setTimeout(() => setSynced(0), 4000);
      }
    })();

    return () => {
      cancelado = true;
      if (t) clearTimeout(t);
    };
  }, [online, router]);

  return (
    <>
      {!online && (
        <div role="status" className="bg-warning/15 px-5 py-2 text-center text-[13px] font-medium text-warning">
          Sin conexión — las ventas se guardan y sincronizan al reconectar.
        </div>
      )}
      {synced > 0 && (
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
