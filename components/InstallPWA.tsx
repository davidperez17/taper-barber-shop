"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  // iOS Safari
  (window.navigator as unknown as { standalone?: boolean }).standalone === true;

const isIOS = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
  !/crios|fxios/i.test(window.navigator.userAgent);

const noSubscribe = () => () => {};

/** Banner discreto para instalar la PWA. Se auto-oculta si ya está instalada. */
export function InstallPWA() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  // iOS no dispara beforeinstallprompt: instrucciones manuales. Valor estable
  // del entorno → useSyncExternalStore (false en SSR, sin setState en effect).
  const iosHint = useSyncExternalStore(noSubscribe, () => isIOS() && !isStandalone(), () => false);

  useEffect(() => {
    if (isStandalone()) return; // ya instalada → nada

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const onInstalled = () => setDeferred(null);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (dismissed || (!deferred && !iosHint)) return null;

  const instalar = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  return (
    <div className="mt-6 flex items-center gap-3 rounded-2xl border border-line bg-elevated/80 p-3.5 text-left">
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
        <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">Instala la app</p>
        {iosHint ? (
          <p className="mt-0.5 text-xs leading-snug text-muted">
            Toca <span className="font-semibold text-ink">Compartir</span> y luego{" "}
            <span className="font-semibold text-ink">Añadir a inicio</span>.
          </p>
        ) : (
          <p className="mt-0.5 text-xs leading-snug text-muted">Acceso rápido desde tu pantalla de inicio.</p>
        )}
      </div>

      {deferred ? (
        <button
          onClick={instalar}
          className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition-transform active:scale-95"
        >
          Instalar
        </button>
      ) : (
        <button
          onClick={() => setDismissed(true)}
          aria-label="Cerrar"
          className="shrink-0 rounded-full px-2 py-1 text-muted hover:text-ink"
        >
          ✕
        </button>
      )}
    </div>
  );
}
