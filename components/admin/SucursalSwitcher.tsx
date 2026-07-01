"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pending, start] = useTransition();
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

  const elegir = (id: string) => {
    setAbierto(false);
    if (id === actual.id) return;
    start(async () => {
      await setSucursalActiva(id);
      router.refresh();
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        className="flex w-full min-h-10 items-center gap-2 rounded-lg border border-line bg-elevated px-3 text-sm text-ink transition-colors hover:border-line-strong disabled:opacity-60"
      >
        <IconStore size={16} />
        <span className="min-w-0 flex-1 truncate text-left font-medium">{actual.nombre}</span>
        <span className={`shrink-0 text-subtle transition-transform ${abierto ? "rotate-180" : ""}`}>▾</span>
      </button>

      {abierto && (
        <>
          <button aria-label="Cerrar" tabIndex={-1} className="fixed inset-0 z-[var(--z-sticky)] cursor-default" onClick={() => setAbierto(false)} />
          <ul role="listbox" className="absolute left-0 right-0 z-[var(--z-modal)] mt-1 overflow-hidden rounded-lg border border-line bg-bg shadow-lg">
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
