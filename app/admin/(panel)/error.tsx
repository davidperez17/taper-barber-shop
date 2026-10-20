"use client";

import { ErrorScreen } from "@/components/ErrorScreen";

export default function PanelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorScreen
      titulo="Algo falló en esta pantalla"
      mensaje="Revisa la conexión e intenta de nuevo. Si se repite, avisa al dueño con el código de abajo."
      onRetry={reset}
      error={error}
    />
  );
}
