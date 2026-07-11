"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useModalA11y } from "@/components/admin/useModalA11y";

interface Props {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Botón de confirmar en rojo (acción destructiva). */
  danger?: boolean;
  pending?: boolean;
  pendingLabel?: string;
  /** Si se define, muestra un campo de texto y su valor va a onConfirm. */
  reason?: { label: string; placeholder?: string; required?: boolean };
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

/**
 * Diálogo de confirmación temático (portal a document.body + useModalA11y).
 * Reemplaza a confirm()/prompt() nativos, que no se pueden tematizar en esta
 * PWA oscura y rompen el lenguaje visual del panel. Con `reason` sirve también
 * para pedir un motivo (antes prompt()).
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger,
  pending,
  pendingLabel = "…",
  reason,
  onConfirm,
  onCancel,
}: Props) {
  const ref = useModalA11y(onCancel);
  const [val, setVal] = useState("");
  const bloqueado = !!pending || (!!reason?.required && !val.trim());

  return createPortal(
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button aria-label="Cerrar" tabIndex={-1} className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div ref={ref} className="animate-fade-up relative w-full max-w-[400px] rounded-t-2xl border border-line bg-bg p-5 sm:rounded-2xl">
        <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
        {message && <p className="mt-2 text-sm text-muted">{message}</p>}
        {reason && (
          <label className="mt-4 block">
            <span className="mb-1.5 block text-[13px] font-medium text-muted">{reason.label}</span>
            <input
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder={reason.placeholder}
              aria-label={reason.label}
              className="w-full rounded-lg border border-line bg-elevated px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-accent"
            />
          </label>
        )}
        <div className="mt-5 flex gap-3">
          <button onClick={onCancel} className="min-h-[48px] flex-1 rounded-full border border-line text-sm font-medium text-muted hover:text-ink">
            {cancelLabel}
          </button>
          <button
            onClick={() => onConfirm(reason ? val.trim() : undefined)}
            disabled={bloqueado}
            className={`min-h-[48px] flex-1 rounded-full text-sm font-semibold disabled:opacity-50 ${danger ? "bg-danger text-white" : "bg-accent text-accent-ink"}`}
          >
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
