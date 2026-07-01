"use client";

import { useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { movimientoInventario, type ActionResult } from "@/app/admin/actions";
import { fmtQ } from "@/lib/format";
import type { Producto } from "@/lib/types";
import { Thumb } from "@/components/admin/Thumb";
import { useModalA11y } from "@/components/admin/useModalA11y";

type TipoMov = "entrada" | "salida" | "ajuste";

function estadoStock(p: Producto): "agotado" | "bajo" | "ok" {
  if (p.stock <= 0) return "agotado";
  if (p.stock <= p.stock_min) return "bajo";
  return "ok";
}

export function InventarioManager({ productos }: { productos: Producto[] }) {
  const [mover, setMover] = useState<Producto | null>(null);

  const bajos = useMemo(() => productos.filter((p) => estadoStock(p) !== "ok").length, [productos]);

  return (
    <div className="animate-fade-up">
      <h1 className="mb-1 font-display text-[26px] font-bold tracking-[-0.01em] text-ink">Inventario</h1>
      <p className="mb-5 text-sm text-muted">
        Controla el stock de tus productos. Las ventas descuentan stock automáticamente.
      </p>

      {productos.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="rounded-xl border border-line bg-elevated p-4">
            <p className="font-display text-2xl font-extrabold tabular-nums text-ink">{productos.length}</p>
            <p className="mt-1 text-[13px] text-muted">Productos con stock</p>
          </div>
          <div className="rounded-xl border border-line bg-elevated p-4">
            <p className={`font-display text-2xl font-extrabold tabular-nums ${bajos > 0 ? "text-warning" : "text-ink"}`}>{bajos}</p>
            <p className="mt-1 text-[13px] text-muted">Bajo mínimo / agotado</p>
          </div>
        </div>
      )}

      {productos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
          Ningún producto controla stock. Activa &ldquo;controlar stock&rdquo; al editar un producto en el catálogo.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {productos.map((p) => (
            <ProductoFila key={p.id} producto={p} onMover={() => setMover(p)} />
          ))}
        </div>
      )}

      {mover && <MovimientoSheet producto={mover} onClose={() => setMover(null)} />}
    </div>
  );
}

function StockBadge({ producto }: { producto: Producto }) {
  const estado = estadoStock(producto);
  const cls =
    estado === "agotado"
      ? "bg-danger/15 text-danger"
      : estado === "bajo"
        ? "bg-warning/15 text-warning"
        : "bg-success-dim text-success";
  const label = estado === "agotado" ? "Agotado" : estado === "bajo" ? "Stock bajo" : "En stock";
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cls}`}>{label}</span>
  );
}

function ProductoFila({ producto, onMover }: { producto: Producto; onMover: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-elevated px-4 py-3">
      <Thumb src={producto.imagen_url} nombre={producto.nombre} />
      <div className="min-w-0 flex-1">
        <p className={`truncate font-semibold ${producto.activo ? "text-ink" : "text-subtle line-through"}`}>{producto.nombre}</p>
        <p className="text-[13px] text-muted">
          {fmtQ(Number(producto.precio))} · mín. {producto.stock_min}
        </p>
      </div>
      <div className="text-right">
        <p className={`font-display text-xl font-bold tabular-nums ${estadoStock(producto) === "ok" ? "text-ink" : estadoStock(producto) === "bajo" ? "text-warning" : "text-danger"}`}>
          {producto.stock}
        </p>
        <p className="text-[11px] text-subtle">en stock</p>
      </div>
      <StockBadge producto={producto} />
      <button
        type="button"
        onClick={onMover}
        className="min-h-11 shrink-0 rounded-full border border-line px-3.5 text-[13px] font-medium text-muted transition-colors hover:border-line-strong hover:text-ink"
      >
        Movimiento
      </button>
    </div>
  );
}

// ── Sheet de movimiento ─────────────────────────────────────────
function MovimientoSheet({ producto, onClose }: { producto: Producto; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const ref = useModalA11y(onClose);
  const [tipo, setTipo] = useState<TipoMov>("entrada");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const n = Number(cantidad);
  const nuevoStock =
    !Number.isFinite(n) || cantidad === ""
      ? null
      : tipo === "entrada"
        ? producto.stock + n
        : tipo === "salida"
          ? producto.stock - n
          : n; // ajuste = stock físico contado

  function guardar() {
    if (cantidad === "" || !Number.isFinite(n) || n < 0) {
      setError("Escribe una cantidad válida.");
      return;
    }
    if (tipo !== "ajuste" && n === 0) {
      setError("La cantidad debe ser mayor que 0.");
      return;
    }
    if (tipo === "salida" && n > producto.stock) {
      setError("No hay stock suficiente para esa salida.");
      return;
    }
    start(async () => {
      setError(null);
      const r: ActionResult = await movimientoInventario(producto.id, tipo, n, motivo);
      if (!r.ok) { setError(r.error ?? "Error"); return; }
      onClose();
      router.refresh();
    });
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={`Movimiento de ${producto.nombre}`}>
      <button aria-label="Cerrar" tabIndex={-1} className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div ref={ref} className="animate-fade-up relative flex max-h-[90dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-2xl border border-line bg-bg sm:max-h-[85dvh] sm:rounded-2xl">
        <div className="shrink-0 border-b border-line px-5 py-4">
          <h2 className="truncate font-display text-xl font-bold text-ink">{producto.nombre}</h2>
          <p className="mt-0.5 text-[13px] text-muted">
            Stock actual: <span className="font-semibold tabular-nums text-ink">{producto.stock}</span>
          </p>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
          <div className="flex gap-2">
            {(["entrada", "salida", "ajuste"] as TipoMov[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTipo(t); setError(null); }}
                className={`min-h-11 flex-1 rounded-lg border text-sm font-medium capitalize transition-colors ${tipo === t ? "border-accent bg-accent text-accent-ink" : "border-line bg-elevated text-muted hover:text-ink"}`}
              >
                {t}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-muted">
              {tipo === "ajuste" ? "Stock físico contado" : tipo === "entrada" ? "Unidades que entran" : "Unidades que salen"}
            </span>
            <input
              value={cantidad}
              onChange={(e) => { setCantidad(e.target.value); setError(null); }}
              inputMode="numeric"
              autoFocus
              placeholder="0"
              className="min-h-[46px] w-full rounded-lg border border-line bg-elevated px-3.5 text-base tabular-nums text-ink outline-none placeholder:text-muted focus:border-accent"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-muted">Motivo (opcional)</span>
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={tipo === "entrada" ? "compra a proveedor…" : tipo === "salida" ? "merma, uso interno…" : "conteo físico"}
              className="min-h-[46px] w-full rounded-lg border border-line bg-elevated px-3.5 text-base text-ink outline-none placeholder:text-muted focus:border-accent"
            />
          </label>

          {nuevoStock !== null && (
            <p className="text-sm text-muted">
              Stock resultante:{" "}
              <span className={`font-semibold tabular-nums ${nuevoStock < 0 ? "text-danger" : "text-ink"}`}>{nuevoStock}</span>
            </p>
          )}

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        </div>

        <div className="shrink-0 border-t border-line px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3.5">
          <div className="flex gap-3">
            <button onClick={onClose} className="min-h-[48px] flex-1 rounded-full border border-line text-sm font-medium text-muted hover:text-ink">Cancelar</button>
            <button onClick={guardar} disabled={pending} className="min-h-[48px] flex-1 rounded-full bg-accent text-sm font-semibold text-accent-ink disabled:opacity-50">
              {pending ? "Guardando…" : "Registrar"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
