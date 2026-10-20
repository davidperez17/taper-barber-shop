import type { CSSProperties } from "react";

/**
 * Recuadro blanco del QR. Con QR rotativo (0040) lleva abajo, dentro del
 * borde blanco y sin tocar los módulos, una barra que se vacía hasta el
 * próximo cambio: muestra que el código está vivo sin meter prisa (sin
 * segundos; el escáner lo acepta ~2.5 min).
 */
export function QrTile({
  svg,
  vencido,
  venceEn,
  ciclo,
  height,
}: {
  svg: string;
  vencido: boolean;
  /** Segundos hasta el próximo QR; null = QR fijo (base sin 0040). */
  venceEn: number | null;
  /** Cambia con cada QR nuevo: reinicia la barra. */
  ciclo: number;
  height: CSSProperties["height"];
}) {
  return (
    <div
      className="qr-tile relative"
      style={{
        boxSizing: "border-box",
        background: "#fff",
        borderRadius: 14,
        padding: 8,
        height,
        aspectRatio: "1",
        boxShadow: "0 0 0 1.5px rgba(245,200,0,0.5),0 10px 26px rgba(0,0,0,0.5)",
        opacity: vencido ? 0.15 : 1,
      }}
    >
      {/* QR generado en servidor (alto contraste, negro sobre blanco). */}
      <div style={{ width: "100%", height: "100%" }} dangerouslySetInnerHTML={{ __html: svg }} />
      {venceEn !== null && !vencido && (
        <div
          aria-hidden="true"
          className="absolute overflow-hidden rounded-full"
          style={{ left: 14, right: 14, bottom: 3, height: 3, background: "rgba(0,0,0,0.08)" }}
        >
          <div key={ciclo} className="qr-timer h-full rounded-full" style={{ background: "#d4a900", animationDuration: `${venceEn}s` }} />
        </div>
      )}
    </div>
  );
}
