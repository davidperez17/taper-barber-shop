"use client";

import { ErrorScreen } from "@/components/ErrorScreen";

export default function ClienteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorScreen
      titulo="No pudimos cargar tu tarjeta"
      mensaje="Puede ser la conexión. Intenta de nuevo en unos segundos."
      onRetry={reset}
      error={error}
    />
  );
}
