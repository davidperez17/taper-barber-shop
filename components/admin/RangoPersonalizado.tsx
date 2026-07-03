"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Selector de rango de fechas personalizado. Chip que despliega dos inputs
 * date + Aplicar y navega a `?rango=custom&desde=..&hasta=..`, preservando
 * el resto de la query (bp/suc) vía `extraQS`.
 */
export function RangoPersonalizado({
  basePath, desde, hasta, extraQS = "", activo,
}: {
  basePath: string;
  desde: string; // valor actual resuelto (default de los inputs)
  hasta: string;
  extraQS?: string;
  activo: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [d, setD] = useState(desde);
  const [h, setH] = useState(hasta);
  const box = useRef<HTMLDivElement>(null);

  // Refleja el rango vigente si cambia desde fuera (al navegar).
  useEffect(() => { setD(desde); setH(hasta); }, [desde, hasta]);

  // Cierra al hacer clic afuera o con Escape.
  useEffect(() => {
    if (!abierto) return;
    function fuera(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setAbierto(false);
    }
    function esc(e: KeyboardEvent) { if (e.key === "Escape") setAbierto(false); }
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", fuera); document.removeEventListener("keydown", esc); };
  }, [abierto]);

  function aplicar() {
    if (!d || !h) return;
    const [a, b] = d <= h ? [d, h] : [h, d]; // ordena si vienen al revés
    router.push(`${basePath}?rango=custom&desde=${a}&hasta=${b}${extraQS}`);
    setAbierto(false);
  }

  return (
    <div ref={box} className="relative inline-block">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-haspopup="dialog"
        className={`flex min-h-[42px] items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors ${activo ? "border-accent bg-accent text-accent-ink shadow-[0_1px_6px_var(--accent-glow)]" : "border-line bg-elevated text-muted hover:text-ink"}`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" />
        </svg>
        Personalizado
      </button>

      {abierto && (
        <div role="dialog" aria-label="Rango personalizado" className="absolute left-0 top-full z-20 mt-2 w-64 rounded-2xl border border-line bg-elevated p-4 shadow-[0_8px_28px_rgba(0,0,0,0.4)]">
          <label className="block text-[13px] font-medium text-muted">Desde
            <input type="date" value={d} max={h || undefined} onChange={(e) => setD(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none" />
          </label>
          <label className="mt-3 block text-[13px] font-medium text-muted">Hasta
            <input type="date" value={h} min={d || undefined} onChange={(e) => setH(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none" />
          </label>
          <button type="button" onClick={aplicar} disabled={!d || !h}
            className="mt-4 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition-opacity disabled:opacity-40">
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}
