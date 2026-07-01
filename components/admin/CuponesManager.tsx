"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { saveCupon, toggleCuponActivo, deleteCupon, type ActionResult } from "@/app/admin/actions";
import { fmtQ } from "@/lib/format";
import type { Cupon, CuponTipo } from "@/lib/types";
import { IconPlus } from "@/components/icons";
import { useModalA11y } from "@/components/admin/useModalA11y";

export function CuponesManager({ cupones }: { cupones: Cupon[] }) {
  const [edit, setEdit] = useState<Cupon | "nuevo" | null>(null);

  return (
    <div className="animate-fade-up">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="font-display text-[26px] font-bold tracking-[-0.01em] text-ink">Cupones</h1>
        <BtnNuevo onClick={() => setEdit("nuevo")} label="Nuevo cupón" />
      </div>

      {cupones.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
          Aún no hay cupones. Crea el primero para ofrecer descuentos en el punto de venta.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {cupones.map((c) => (
            <CuponFila key={c.id} cupon={c} onEdit={() => setEdit(c)} />
          ))}
        </div>
      )}

      {edit && <CuponSheet cupon={edit === "nuevo" ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

// ── helpers (mismo patrón que CatalogoManager) ──────────────────
function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<ActionResult>, onOk?: () => void) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) { setError(r.error ?? "Error"); return; }
      onOk?.();
      router.refresh();
    });
  return { pending, error, setError, run };
}

function BtnNuevo({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink">
      <IconPlus size={18} /> {label}
    </button>
  );
}

function descripcionCupon(c: Cupon): string {
  const valor = c.tipo === "porcentaje" ? `${c.valor}% de descuento` : `${fmtQ(Number(c.valor))} de descuento`;
  const min = Number(c.min_compra) > 0 ? ` · mín. ${fmtQ(Number(c.min_compra))}` : "";
  const usos = c.usos_max != null ? ` · ${c.usos}/${c.usos_max} usos` : ` · ${c.usos} usos`;
  return valor + min + usos;
}

function vigenciaTexto(c: Cupon): string | null {
  if (!c.vigencia_desde && !c.vigencia_hasta) return null;
  if (c.vigencia_desde && c.vigencia_hasta) return `Vigente ${c.vigencia_desde} → ${c.vigencia_hasta}`;
  if (c.vigencia_hasta) return `Hasta ${c.vigencia_hasta}`;
  return `Desde ${c.vigencia_desde}`;
}

function CuponFila({ cupon, onEdit }: { cupon: Cupon; onEdit: () => void }) {
  const { pending, run } = useAction();
  const agotado = cupon.usos_max != null && cupon.usos >= cupon.usos_max;
  const vig = vigenciaTexto(cupon);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-elevated px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`truncate font-mono text-[15px] font-bold tracking-wide ${cupon.activo && !agotado ? "text-ink" : "text-subtle line-through"}`}>
            {cupon.codigo}
          </p>
          {agotado && <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-subtle">Agotado</span>}
        </div>
        <p className="text-[13px] tabular-nums text-muted">{descripcionCupon(cupon)}</p>
        {vig && <p className="text-[11px] tabular-nums text-subtle">{vig}</p>}
      </div>
      <button
        onClick={() => run(() => toggleCuponActivo(cupon.id, !cupon.activo))}
        disabled={pending}
        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${cupon.activo ? "bg-success-dim text-success" : "border border-line text-subtle"}`}
      >
        {cupon.activo ? "Activo" : "Inactivo"}
      </button>
      <button onClick={onEdit} className="text-[13px] text-muted hover:text-ink">Editar</button>
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

function CuponSheet({ cupon, onClose }: { cupon: Cupon | null; onClose: () => void }) {
  const { pending, error, run } = useAction();
  const ref = useModalA11y(onClose);
  const [codigo, setCodigo] = useState(cupon?.codigo ?? "");
  const [tipo, setTipo] = useState<CuponTipo>(cupon?.tipo ?? "porcentaje");
  const [valor, setValor] = useState(cupon != null ? String(cupon.valor) : "");
  const [minCompra, setMinCompra] = useState(cupon?.min_compra ? String(cupon.min_compra) : "");
  const [desde, setDesde] = useState(cupon?.vigencia_desde ?? "");
  const [hasta, setHasta] = useState(cupon?.vigencia_hasta ?? "");
  const [usosMax, setUsosMax] = useState(cupon?.usos_max != null ? String(cupon.usos_max) : "");
  const [activo, setActivo] = useState(cupon?.activo ?? true);

  const guardar = () =>
    run(() => saveCupon({
      id: cupon?.id,
      codigo,
      tipo,
      valor: Number(valor) || 0,
      min_compra: Number(minCompra) || 0,
      vigencia_desde: desde || null,
      vigencia_hasta: hasta || null,
      usos_max: usosMax ? Number(usosMax) : null,
      activo,
    }), onClose);

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={cupon ? "Editar cupón" : "Nuevo cupón"}>
      <button aria-label="Cerrar" tabIndex={-1} className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div ref={ref} className="animate-fade-up relative max-h-[92vh] w-full max-w-[440px] overflow-y-auto rounded-t-2xl border border-line bg-bg p-5 sm:rounded-2xl">
        <h2 className="mb-4 font-display text-xl font-bold text-ink">{cupon ? "Editar cupón" : "Nuevo cupón"}</h2>

        <div className="flex flex-col gap-3">
          <Campo label="Código">
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="VERANO20"
              className={`${inputCls} font-mono tracking-wide`}
              autoFocus
              autoCapitalize="characters"
            />
          </Campo>

          <Campo label="Tipo de descuento">
            <div className="flex gap-2">
              {(["porcentaje", "monto"] as CuponTipo[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`min-h-11 flex-1 rounded-lg border text-sm font-medium capitalize transition-colors ${tipo === t ? "border-accent bg-accent text-accent-ink" : "border-line bg-elevated text-muted hover:text-ink"}`}
                >
                  {t === "porcentaje" ? "Porcentaje %" : "Monto Q"}
                </button>
              ))}
            </div>
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo label={tipo === "porcentaje" ? "Valor (%)" : "Valor (Q)"}>
              <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" className={`${inputCls} tabular-nums`} />
            </Campo>
            <Campo label="Compra mínima (Q)">
              <input value={minCompra} onChange={(e) => setMinCompra(e.target.value)} inputMode="decimal" placeholder="0" className={`${inputCls} tabular-nums`} />
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Vigente desde">
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={`${inputCls} tabular-nums`} />
            </Campo>
            <Campo label="Vigente hasta">
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={`${inputCls} tabular-nums`} />
            </Campo>
          </div>

          <Campo label="Límite de usos (vacío = ilimitado)">
            <input value={usosMax} onChange={(e) => setUsosMax(e.target.value)} inputMode="numeric" placeholder="Ilimitado" className={`${inputCls} tabular-nums`} />
          </Campo>

          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-elevated p-3">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="size-5 accent-[var(--accent)]" />
            <span className="text-sm text-ink">Activo (se puede aplicar en el POS)</span>
          </label>
        </div>

        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="min-h-[48px] flex-1 rounded-full border border-line text-sm font-medium text-muted hover:text-ink">Cancelar</button>
          <button onClick={guardar} disabled={pending} className="min-h-[48px] flex-1 rounded-full bg-accent text-sm font-semibold text-accent-ink disabled:opacity-50">
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>

        {cupon && <BorrarCupon id={cupon.id} onDone={onClose} />}
      </div>
    </div>
  );
}

function BorrarCupon({ id, onDone }: { id: string; onDone: () => void }) {
  const { pending, run } = useAction();
  const [confirm, setConfirm] = useState(false);
  if (!confirm) {
    return (
      <button onClick={() => setConfirm(true)} className="mt-4 block w-full text-center text-[13px] text-muted hover:text-danger">
        Eliminar cupón
      </button>
    );
  }
  return (
    <div className="mt-4 rounded-lg border border-danger/40 bg-danger/5 p-3 text-center">
      <p className="mb-2 text-[13px] text-ink">¿Eliminar este cupón? No se puede deshacer.</p>
      <div className="flex gap-2">
        <button onClick={() => setConfirm(false)} className="min-h-10 flex-1 rounded-full border border-line text-[13px] text-muted hover:text-ink">Cancelar</button>
        <button
          onClick={() => run(() => deleteCupon(id), onDone)}
          disabled={pending}
          className="min-h-10 flex-1 rounded-full bg-danger text-[13px] font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Eliminando…" : "Sí, eliminar"}
        </button>
      </div>
    </div>
  );
}
