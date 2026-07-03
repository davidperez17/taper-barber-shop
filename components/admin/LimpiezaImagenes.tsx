"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useModalA11y } from "@/components/admin/useModalA11y";
import { limpiarImagenesHuerfanas, type LimpiezaResult } from "@/app/admin/actions";

/**
 * Mantenimiento (dueño): borra del bucket las imágenes que ningún servicio ni
 * producto referencia. Confirmación en portal antes de ejecutar.
 */
export function LimpiezaImagenes() {
  const [confirmar, setConfirmar] = useState(false);
  const [pending, start] = useTransition();
  const [res, setRes] = useState<LimpiezaResult | null>(null);

  const ejecutar = () => start(async () => {
    const r = await limpiarImagenesHuerfanas();
    setRes(r);
    setConfirmar(false);
  });

  return (
    <section className="mt-8 rounded-2xl border border-line bg-elevated p-4">
      <h2 className="font-display text-base font-bold text-ink">Mantenimiento</h2>
      <p className="mt-1 text-[13px] text-muted">
        Borra imágenes del almacenamiento que ya no usa ningún servicio ni producto. Libera espacio; es irreversible.
      </p>

      {res && (
        <p role="status" className={`mt-3 text-sm ${res.ok ? "text-success" : "text-danger"}`}>
          {res.ok
            ? res.borradas === 0
              ? `Todo limpio — ${res.revisadas} imagen${res.revisadas === 1 ? "" : "es"} revisada${res.revisadas === 1 ? "" : "s"}, nada que borrar.`
              : `Se borraron ${res.borradas} imagen${res.borradas === 1 ? "" : "es"} sin usar (de ${res.revisadas}).`
            : res.error}
        </p>
      )}

      <button
        onClick={() => setConfirmar(true)}
        disabled={pending}
        className="mt-3 inline-flex min-h-10 items-center rounded-full border border-line px-4 text-sm font-semibold text-ink hover:border-line-strong disabled:opacity-50"
      >
        {pending ? "Limpiando…" : "Limpiar imágenes sin usar"}
      </button>

      {confirmar && <ConfirmDialog pending={pending} onCancel={() => setConfirmar(false)} onConfirm={ejecutar} />}
    </section>
  );
}

function ConfirmDialog({ pending, onCancel, onConfirm }: { pending: boolean; onCancel: () => void; onConfirm: () => void }) {
  const ref = useModalA11y(onCancel);
  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Confirmar limpieza de imágenes">
      <button aria-label="Cerrar" tabIndex={-1} className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div ref={ref} className="animate-fade-up relative w-full max-w-[400px] rounded-t-2xl border border-line bg-bg p-5 sm:rounded-2xl">
        <h3 className="font-display text-lg font-bold text-ink">¿Limpiar imágenes sin usar?</h3>
        <p className="mt-2 text-sm text-muted">
          Se borrarán definitivamente las imágenes del almacenamiento que ningún servicio ni producto referencia. No afecta tu catálogo. No se puede deshacer.
        </p>
        <div className="mt-5 flex gap-3">
          <button onClick={onCancel} className="min-h-[48px] flex-1 rounded-full border border-line text-sm font-medium text-muted hover:text-ink">Cancelar</button>
          <button onClick={onConfirm} disabled={pending} className="min-h-[48px] flex-1 rounded-full bg-danger text-sm font-semibold text-white disabled:opacity-50">
            {pending ? "Limpiando…" : "Sí, limpiar"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
