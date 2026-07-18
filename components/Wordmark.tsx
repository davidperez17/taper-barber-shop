import { Isotipo } from "@/components/Isotipo";

/**
 * Marca de la barbería: isotipo + wordmark "TAPER BARBER SHOP".
 * Punto único de la marca — si el nombre cambia, se edita solo aquí.
 * Va en una fila `flex items-center`; el badge "Panel" u otros van como hermanos.
 *
 * - Por defecto: apilado en 3 líneas (columnas estrechas: sidebar, heros).
 * - `inline`: una sola línea (barras horizontales donde apilar rompe la altura).
 */
export function Wordmark({ className, inline = false }: { className?: string; inline?: boolean }) {
  return (
    <span className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <Isotipo
        className={`shrink-0 text-accent ${inline ? "h-[20px] w-[11px]" : "h-[41px] w-[22px]"}`}
      />
      {inline ? (
        <span className="whitespace-nowrap font-display text-[14px] font-bold tracking-[0.1em] text-ink">
          TAPER BARBER SHOP
        </span>
      ) : (
        <span className="flex flex-col font-display text-[15px] font-bold leading-[0.95] tracking-[0.18em] text-ink">
          <span>TAPER</span>
          <span>BARBER</span>
          <span>SHOP</span>
        </span>
      )}
    </span>
  );
}
