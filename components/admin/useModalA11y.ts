"use client";

import { useEffect, useRef } from "react";

/**
 * A11y de modales/sheets: cerrar con Escape, bloquear scroll del body,
 * atrapar el foco y devolverlo al disparador al cerrar.
 * Devuelve el ref para el contenedor del diálogo.
 */
export function useModalA11y(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const disparador = document.activeElement as HTMLElement | null;

    // Scroll-lock del body.
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Foco inicial: primer elemento enfocable dentro del diálogo.
    const enfocables = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => el.offsetParent !== null);

    enfocables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const els = enfocables();
        if (els.length === 0) return;
        const primero = els[0];
        const ultimo = els[els.length - 1];
        const activo = document.activeElement;
        if (e.shiftKey && activo === primero) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && activo === ultimo) {
          e.preventDefault();
          primero.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflowPrevio;
      disparador?.focus?.();
    };
  }, [onClose]);

  return ref;
}
