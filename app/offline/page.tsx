import { ErrorScreen } from "@/components/ErrorScreen";

export default function OfflinePage() {
  return (
    <ErrorScreen
      titulo="Sin conexión"
      mensaje="No hay internet ahora mismo. Tu tarjeta y progreso vuelven en cuanto recuperes la red."
    />
  );
}
