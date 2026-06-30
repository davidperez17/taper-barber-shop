"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { recordVenta } from "@/app/admin/actions";
import { getQueue, setQueue } from "@/lib/offline";

/** Banner offline + sincronización de la cola de ventas al reconectar. */
export function OfflineSync() {
  const [online, setOnline] = useState(true);
  const [synced, setSynced] = useState(0);
  const router = useRouter();

  useEffect(() => {
    setOnline(navigator.onLine);

    async function flush() {
      const q = getQueue();
      if (q.length === 0 || !navigator.onLine) return;
      const pendientes = [];
      let ok = 0;
      for (const v of q) {
        const r = await recordVenta(v);
        if (r.ok) ok++;
        else pendientes.push(v);
      }
      setQueue(pendientes);
      if (ok > 0) {
        setSynced(ok);
        router.refresh();
        setTimeout(() => setSynced(0), 4000);
      }
    }

    const onOnline = () => {
      setOnline(true);
      flush();
    };
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    flush(); // por si quedaron pendientes de una sesión previa

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [router]);

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
