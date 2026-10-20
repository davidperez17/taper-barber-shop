"use client";

import { useEffect } from "react";
import { Isotipo } from "@/components/Isotipo";

// Pantalla común para error.tsx (cliente y admin) y /offline. Sin esto un fallo
// de Supabase dejaba el "Application error" genérico de Next, sin salida.
export function ErrorScreen({
  titulo,
  mensaje,
  onRetry,
  error,
}: {
  titulo: string;
  mensaje: string;
  onRetry?: () => void;
  error?: Error & { digest?: string };
}) {
  useEffect(() => {
    if (error) console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center px-8 text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-full border border-line bg-elevated">
        <Isotipo className="h-[24px] w-[13px] text-accent" />
      </div>
      <h1 className="font-display text-2xl font-bold text-ink">{titulo}</h1>
      <p className="mt-2 max-w-[300px] text-sm text-muted">{mensaje}</p>
      <button
        onClick={onRetry ?? (() => location.reload())}
        className="mt-6 inline-flex min-h-11 items-center rounded-full bg-accent px-6 font-semibold text-accent-ink"
      >
        Reintentar
      </button>
      {error?.digest && <p className="mt-4 text-xs text-subtle">Código: {error.digest}</p>}
    </main>
  );
}
