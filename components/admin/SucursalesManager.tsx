"use client";

import { useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  crearSucursal, actualizarSucursal, toggleSucursalActiva, type SucursalResult,
} from "@/app/admin/(panel)/sucursales/actions";
import type { Sucursal } from "@/lib/types";
import { IconPlus, IconPencil, IconStore } from "@/components/icons";
import { useModalA11y } from "@/components/admin/useModalA11y";

export function SucursalesManager({ sucursales, max }: { sucursales: Sucursal[]; max: number }) {
  const [edit, setEdit] = useState<Sucursal | "nueva" | null>(null);
  const activas = sucursales.filter((s) => s.activo).length;
  const puedeCrear = activas < max;

  return (
    <div className="animate-fade-up">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="font-display text-[26px] font-bold tracking-[-0.01em] text-ink">Sucursales</h1>
        {puedeCrear && (
          <button onClick={() => setEdit("nueva")} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink">
            <IconPlus size={18} /> Nueva sucursal
          </button>
        )}
      </div>
      <p className="mb-5 text-sm text-muted">
        {activas} de {max} sucursales activas en tu plan.
      </p>

      <div className="flex flex-col gap-2">
        {sucursales.map((s) => (
          <SucursalFila key={s.id} sucursal={s} onEdit={() => setEdit(s)} />
        ))}

        {/* Tercera sucursal: upsell / próximamente */}
        {!puedeCrear && <UpsellCard max={max} />}
      </div>

      {edit && <SucursalSheet sucursal={edit === "nueva" ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<SucursalResult>, onOk?: () => void) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) { setError(r.error ?? "Error"); return; }
      onOk?.();
      router.refresh();
    });
  return { pending, error, run };
}

function SucursalFila({ sucursal, onEdit }: { sucursal: Sucursal; onEdit: () => void }) {
  const { pending, run } = useAction();
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-elevated px-4 py-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface text-muted">
        <IconStore size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate font-semibold ${sucursal.activo ? "text-ink" : "text-subtle line-through"}`}>{sucursal.nombre}</p>
        <p className="truncate text-[13px] text-muted">
          {sucursal.direccion || "Sin dirección"}{sucursal.telefono ? ` · ${sucursal.telefono}` : ""}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={sucursal.activo}
        aria-label={`${sucursal.activo ? "Desactivar" : "Activar"} ${sucursal.nombre}`}
        disabled={pending}
        onClick={() => run(() => toggleSucursalActiva(sucursal.id, !sucursal.activo))}
        className="flex min-h-11 shrink-0 items-center gap-2 rounded-full px-1.5 disabled:opacity-50"
      >
        <span className={`w-14 text-right text-[11px] font-semibold tabular-nums ${sucursal.activo ? "text-success" : "text-subtle"}`}>
          {sucursal.activo ? "Activa" : "Inactiva"}
        </span>
        <span className={`relative inline-flex h-[26px] w-[46px] shrink-0 items-center rounded-full transition-colors ${sucursal.activo ? "bg-success" : "bg-line-strong"}`}>
          <span className={`absolute size-5 rounded-full bg-white shadow-sm transition-transform ${sucursal.activo ? "translate-x-[23px]" : "translate-x-[3px]"}`} />
        </span>
      </button>
      <button onClick={onEdit} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-line px-3.5 text-[13px] font-medium text-muted transition-colors hover:border-line-strong hover:text-ink">
        <IconPencil size={15} /> Editar
      </button>
    </div>
  );
}

function UpsellCard({ max }: { max: number }) {
  const [enviado, setEnviado] = useState(false);
  return (
    <div className="mt-1 flex flex-col items-start gap-3 rounded-xl border border-dashed border-accent/40 bg-accent-dim/40 p-5 sm:flex-row sm:items-center">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
        <IconStore size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[15px] font-bold text-ink">Agregar una {max + 1}ª sucursal</p>
        <p className="mt-0.5 text-[13px] text-muted">
          Tu plan actual incluye {max} sucursales. Amplía tu plan para abrir más ubicaciones — próximamente.
        </p>
      </div>
      <button
        onClick={() => setEnviado(true)}
        disabled={enviado}
        className="min-h-10 shrink-0 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-60"
      >
        {enviado ? "Solicitud enviada ✓" : "Solicitar ampliación"}
      </button>
    </div>
  );
}

// ── Sheet de alta/edición ───────────────────────────────────────
const inputCls = "min-h-[46px] w-full rounded-lg border border-line bg-elevated px-3.5 text-base text-ink outline-none placeholder:text-muted focus:border-accent";

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function SucursalSheet({ sucursal, onClose }: { sucursal: Sucursal | null; onClose: () => void }) {
  const { pending, error, run } = useAction();
  const ref = useModalA11y(onClose);
  const [nombre, setNombre] = useState(sucursal?.nombre ?? "");
  const [direccion, setDireccion] = useState(sucursal?.direccion ?? "");
  const [telefono, setTelefono] = useState(sucursal?.telefono ?? "");

  const guardar = () =>
    sucursal
      ? run(() => actualizarSucursal(sucursal.id, { nombre, direccion, telefono }), onClose)
      : run(() => crearSucursal({ nombre, direccion, telefono }), onClose);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={sucursal ? "Editar sucursal" : "Nueva sucursal"}>
      <button aria-label="Cerrar" tabIndex={-1} className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div ref={ref} className="animate-fade-up relative flex max-h-[90dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-2xl border border-line bg-bg sm:max-h-[85dvh] sm:rounded-2xl">
        <h2 className="shrink-0 border-b border-line px-5 py-4 font-display text-xl font-bold text-ink">{sucursal ? "Editar sucursal" : "Nueva sucursal"}</h2>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
          <Campo label="Nombre"><input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} autoFocus placeholder="Ej. Zona 10" /></Campo>
          <Campo label="Dirección"><input value={direccion} onChange={(e) => setDireccion(e.target.value)} className={inputCls} placeholder="Calle, zona, referencia…" /></Campo>
          <Campo label="Teléfono"><input value={telefono} onChange={(e) => setTelefono(e.target.value)} inputMode="tel" className={inputCls} placeholder="Opcional" /></Campo>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        </div>

        <div className="shrink-0 border-t border-line px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3.5">
          <div className="flex gap-3">
            <button onClick={onClose} className="min-h-[48px] flex-1 rounded-full border border-line text-sm font-medium text-muted hover:text-ink">Cancelar</button>
            <button onClick={guardar} disabled={pending} className="min-h-[48px] flex-1 rounded-full bg-accent text-sm font-semibold text-accent-ink disabled:opacity-50">
              {pending ? "Guardando…" : sucursal ? "Guardar" : "Crear sucursal"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
