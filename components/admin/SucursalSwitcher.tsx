"use client";

import { useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { setSucursalActiva } from "@/app/admin/actions";
import { IconStore, IconCheck } from "@/components/icons";

interface Mini { id: string; nombre: string }

export function SucursalSwitcher({
  sucursales, activeId, canSwitch,
}: {
  sucursales: Mini[];
  activeId: string | null;
  canSwitch: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [pending, start] = useTransition();
  const botonRef = useRef<HTMLButtonElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);

  // Al abrir, el foco pasa a la opción seleccionada (o la primera) para poder
  // navegar con teclado.
  useEffect(() => {
    if (!abierto) return;
    const ops = listaRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]');
    const sel = listaRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    (sel ?? ops?.[0])?.focus();
  }, [abierto]);

  const actual = sucursales.find((s) => s.id === activeId) ?? sucursales[0];
  if (!actual) return null;

  // Trabajador (o una sola sucursal): etiqueta estática con su sucursal.
  if (!canSwitch || sucursales.length <= 1) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-ink">
        <IconStore size={16} />
        <span className="truncate font-medium">{actual.nombre}</span>
      </div>
    );
  }

  // Cierra el menú y devuelve el foco al botón que lo abrió.
  const cerrar = () => {
    setAbierto(false);
    botonRef.current?.focus();
  };

  // Teclado dentro del menú: Escape cierra, flechas/Home/End mueven el foco.
  // Enter/Espacio sobre una opción ya disparan su onClick (son <button>).
  const onKeyLista = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key === "Escape" || e.key === "Tab") {
      if (e.key === "Escape") e.preventDefault();
      cerrar();
      return;
    }
    const ops = Array.from(listaRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
    if (ops.length === 0) return;
    const i = ops.indexOf(document.activeElement as HTMLButtonElement);
    let sig: number | null = null;
    if (e.key === "ArrowDown") sig = (i + 1) % ops.length;
    else if (e.key === "ArrowUp") sig = (i - 1 + ops.length) % ops.length;
    else if (e.key === "Home") sig = 0;
    else if (e.key === "End") sig = ops.length - 1;
    if (sig !== null) {
      e.preventDefault();
      ops[sig].focus();
    }
  };

  const elegir = (id: string) => {
    cerrar();
    if (id === actual.id) return;
    start(async () => {
      await setSucursalActiva(id);
      // Cambiar de sucursal reescribe los datos de TODO el panel y la cookie es
      // httpOnly + global; router.refresh() no busta el Router Cache con
      // staleTimes.dynamic activo. Recarga dura = re-render limpio y fiable.
      window.location.reload();
    });
  };

  return (
    <div className="relative">
      <button
        ref={botonRef}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        onKeyDown={(e) => {
          // Flecha abajo también abre (patrón listbox); Enter/Espacio ya los
          // maneja el <button> nativo vía onClick.
          if (e.key === "ArrowDown" && !abierto) {
            e.preventDefault();
            setAbierto(true);
          } else if (e.key === "Escape" && abierto) {
            e.preventDefault();
            setAbierto(false);
          }
        }}
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        className="flex w-full min-h-11 items-center gap-2 rounded-lg border border-line bg-elevated px-3 text-sm text-ink transition-colors hover:border-line-strong disabled:opacity-60"
      >
        <IconStore size={16} />
        <span className="min-w-0 flex-1 truncate text-left font-medium">{actual.nombre}</span>
        <span className={`shrink-0 text-subtle transition-transform ${abierto ? "rotate-180" : ""}`}>▾</span>
      </button>

      {abierto && (
        <>
          <button aria-label="Cerrar" tabIndex={-1} className="fixed inset-0 z-[var(--z-sticky)] cursor-default" onClick={cerrar} />
          <ul ref={listaRef} role="listbox" onKeyDown={onKeyLista} className="absolute left-0 right-0 z-[var(--z-modal)] mt-1 overflow-hidden rounded-lg border border-line bg-bg shadow-lg">
            {sucursales.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={s.id === actual.id}
                  onClick={() => elegir(s.id)}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-elevated ${s.id === actual.id ? "text-accent" : "text-ink"}`}
                >
                  <span className="min-w-0 flex-1 truncate">{s.nombre}</span>
                  {s.id === actual.id && <IconCheck size={16} />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
