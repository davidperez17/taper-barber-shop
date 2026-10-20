"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearMovimientoCaja, borrarMovimientoCaja, cerrarCaja } from "@/app/admin/actions";
import { fmtQ, mismoMonto, parseMonto } from "@/lib/format";
import type { CajaResumen } from "@/lib/queries/caja";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

const inputCls =
  "min-h-[46px] w-full rounded-lg border border-line bg-elevated px-3.5 text-base text-ink outline-none placeholder:text-muted focus:border-accent";

export function CajaCierre({ resumen }: { resumen: CajaResumen }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const efectivoVentas = Number(resumen.ventas.efectivo);
  const tarjeta = Number(resumen.ventas.tarjeta);
  const transfer = Number(resumen.ventas.transferencia);
  const egresos = Number(resumen.egresos);
  const ingresos = Number(resumen.ingresos_extra);

  const [fondo, setFondo] = useState("0");
  const [contado, setContado] = useState("");
  const [notas, setNotas] = useState("");
  const [confCerrar, setConfCerrar] = useState(false);
  const [borrarId, setBorrarId] = useState<string | null>(null);

  // Nuevo movimiento
  const [movTipo, setMovTipo] = useState<"egreso" | "ingreso">("egreso");
  const [movMonto, setMovMonto] = useState("");
  const [movMotivo, setMovMotivo] = useState("");

  // "1,250" o "150,50" antes daban NaN → 0 y descuadraban el arqueo.
  const fondoN = parseMonto(fondo);
  const contadoN = parseMonto(contado);
  const esperado = useMemo(
    () => (fondoN ?? 0) + efectivoVentas + ingresos - egresos,
    [fondoN, efectivoVentas, ingresos, egresos],
  );
  const diferencia = (contadoN ?? 0) - esperado;

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      setError(null);
      try {
        const r = await fn();
        if (!r.ok) { setError(r.error ?? "Error"); return; }
      } catch {
        setError("Sin conexión. Revisa la red e intenta de nuevo.");
        return;
      }
      after?.();
      router.refresh();
    });

  const agregarMov = () => {
    const monto = parseMonto(movMonto);
    if (monto === null || !(monto > 0)) { setError("Monto inválido."); return; }
    run(() => crearMovimientoCaja(movTipo, monto, movMotivo), () => { setMovMonto(""); setMovMotivo(""); });
  };

  const pedirCierre = () => {
    if (fondoN === null || fondoN < 0) { setError("Fondo inicial inválido."); return; }
    if (contadoN === null || contadoN < 0) { setError("Efectivo contado inválido."); return; }
    setError(null);
    setConfCerrar(true);
  };

  const cerrar = () => {
    run(() => cerrarCaja(resumen.fecha, fondoN ?? 0, contadoN ?? 0, notas), () => setConfCerrar(false));
  };

  // ── Día ya cerrado ─────────────────────────────────────────────
  if (resumen.cierre) {
    const c = resumen.cierre;
    const dif = Number(c.diferencia);
    // Ventas cobradas después del cierre (o sincronizadas tarde desde la cola
    // offline): el snapshot ya no las incluye y antes nadie se enteraba.
    const posteriores =
      !mismoMonto(efectivoVentas, Number(c.efectivo_ventas)) ||
      !mismoMonto(tarjeta, Number(c.tarjeta_total)) ||
      !mismoMonto(transfer, Number(c.transfer_total));
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-success/40 bg-success-dim p-4">
          <p className="font-display text-lg font-bold text-success">Caja cerrada</p>
          <p className="mt-0.5 text-sm text-muted">El arqueo de hoy ya se registró.</p>
        </div>
        {posteriores && (
          <div role="alert" className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
            <p className="font-semibold text-warning">Hubo ventas después del cierre</p>
            <p className="mt-1 text-muted">
              Ahora: efectivo {fmtQ(efectivoVentas)} · tarjeta {fmtQ(tarjeta)} · transferencia {fmtQ(transfer)}.
              El arqueo guardado no las incluye; cuéntalas aparte.
            </p>
          </div>
        )}
        <Resumen efectivo={Number(c.efectivo_ventas)} tarjeta={Number(c.tarjeta_total)} transfer={Number(c.transfer_total)} num={resumen.ventas.num} />
        <div className="rounded-xl border border-line bg-elevated p-4">
          <Fila k="Fondo inicial" v={fmtQ(Number(c.fondo_inicial))} />
          <Fila k="Ingresos extra" v={fmtQ(Number(c.ingresos_extra))} />
          <Fila k="Egresos" v={`− ${fmtQ(Number(c.egresos))}`} />
          <Fila k="Efectivo esperado" v={fmtQ(Number(c.efectivo_esperado))} bold />
          <Fila k="Efectivo contado" v={fmtQ(Number(c.efectivo_contado))} bold />
          <div className="mt-1 border-t border-line pt-2">
            <Fila k="Diferencia" v={`${dif >= 0.005 ? "+" : ""}${fmtQ(dif)}`} tone={mismoMonto(dif, 0) ? "ok" : "warn"} bold />
          </div>
          {c.notas && <p className="mt-3 whitespace-pre-wrap text-sm text-muted">{c.notas}</p>}
        </div>
      </div>
    );
  }

  // ── Cierre interactivo ─────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      <Resumen efectivo={efectivoVentas} tarjeta={tarjeta} transfer={transfer} num={resumen.ventas.num} />

      {/* Movimientos de efectivo */}
      <section>
        <h2 className="mb-2.5 font-display text-base font-bold text-ink">Movimientos de efectivo</h2>
        <div className="flex flex-wrap items-end gap-2">
          <div className="inline-flex rounded-full border border-line bg-elevated p-1">
            {(["egreso", "ingreso"] as const).map((t) => (
              <button key={t} onClick={() => setMovTipo(t)} aria-pressed={movTipo === t}
                className={`min-h-9 rounded-full px-3.5 text-[13px] font-semibold capitalize transition-colors ${movTipo === t ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"}`}>
                {t === "egreso" ? "Egreso" : "Ingreso"}
              </button>
            ))}
          </div>
          <input value={movMonto} onChange={(e) => setMovMonto(e.target.value)} inputMode="decimal" placeholder="Monto Q" aria-label="Monto del movimiento" className={`${inputCls} max-w-[120px]`} />
          <input value={movMotivo} onChange={(e) => setMovMotivo(e.target.value)} placeholder="Motivo" aria-label="Motivo del movimiento" className={`${inputCls} min-w-[140px] flex-1`} />
          <button onClick={agregarMov} disabled={pending} className="min-h-[46px] rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink disabled:opacity-50">Agregar</button>
        </div>

        {resumen.movimientos.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {resumen.movimientos.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-line bg-elevated px-3.5 py-2.5">
                <span className={`text-sm font-semibold ${m.tipo === "egreso" ? "text-danger" : "text-success"}`}>
                  {m.tipo === "egreso" ? "−" : "+"} {fmtQ(Number(m.monto))}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-muted">{m.motivo || (m.tipo === "egreso" ? "Egreso" : "Ingreso")}</span>
                <button onClick={() => setBorrarId(m.id)} aria-label="Borrar movimiento" className="flex size-11 items-center justify-center text-subtle hover:text-danger">×</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Arqueo */}
      <section className="rounded-xl border border-line bg-elevated p-4">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-muted">Fondo inicial (caja chica)</span>
          <input value={fondo} onChange={(e) => setFondo(e.target.value)} inputMode="decimal" className={inputCls} />
        </label>
        <div className="mt-3 border-t border-line pt-3">
          <Fila k="+ Ventas en efectivo" v={fmtQ(efectivoVentas)} />
          <Fila k="+ Ingresos extra" v={fmtQ(ingresos)} />
          <Fila k="− Egresos" v={fmtQ(egresos)} />
          <Fila k="= Efectivo esperado" v={fmtQ(esperado)} bold />
        </div>
        <label className="mt-3 block">
          <span className="mb-1.5 block text-[13px] font-medium text-muted">Efectivo contado en caja</span>
          <input value={contado} onChange={(e) => setContado(e.target.value)} inputMode="decimal" placeholder="0.00" className={inputCls} />
        </label>
        {contado !== "" && (
          <div className="mt-3 border-t border-line pt-2">
            <Fila k="Diferencia" v={`${diferencia >= 0.005 ? "+" : ""}${fmtQ(diferencia)}`} tone={mismoMonto(diferencia, 0) ? "ok" : "warn"} bold />
          </div>
        )}
      </section>

      <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} placeholder="Notas del cierre (opcional)…" aria-label="Notas del cierre"
        className="w-full resize-none rounded-xl border border-line bg-elevated p-3 text-sm text-ink outline-none placeholder:text-muted focus:border-accent" />

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <button onClick={pedirCierre} disabled={pending || contado === ""} className="min-h-[52px] rounded-full bg-accent text-base font-semibold text-accent-ink shadow-[0_0_28px_var(--accent-glow)] disabled:opacity-40">
        {pending ? "Cerrando…" : "Cerrar caja del día"}
      </button>

      {borrarId && (
        <ConfirmDialog
          title="¿Borrar este movimiento?"
          message="Se quita del arqueo de hoy."
          confirmLabel="Borrar"
          danger
          pending={pending}
          pendingLabel="Borrando…"
          onConfirm={() => run(() => borrarMovimientoCaja(borrarId), () => setBorrarId(null))}
          onCancel={() => setBorrarId(null)}
        />
      )}

      {confCerrar && (
        <ConfirmDialog
          title="¿Cerrar la caja del día?"
          message="No podrás editar movimientos después. Se guarda el arqueo con el efectivo contado."
          confirmLabel="Cerrar caja"
          pending={pending}
          pendingLabel="Cerrando…"
          onConfirm={cerrar}
          onCancel={() => setConfCerrar(false)}
        />
      )}
    </div>
  );
}

function Resumen({ efectivo, tarjeta, transfer, num }: { efectivo: number; tarjeta: number; transfer: number; num: number }) {
  return (
    <section>
      <h2 className="mb-2.5 font-display text-base font-bold text-ink">Ventas de hoy <span className="text-sm font-normal text-subtle">· {num} venta{num === 1 ? "" : "s"}</span></h2>
      <div className="grid grid-cols-3 gap-3">
        {[["Efectivo", efectivo], ["Tarjeta", tarjeta], ["Transferencia", transfer]].map(([k, v]) => (
          <div key={k as string} className="rounded-xl border border-line bg-elevated p-4">
            <p className="font-display text-xl font-extrabold tabular-nums text-ink">{fmtQ(v as number)}</p>
            <p className="mt-1 text-[13px] font-medium text-muted">{k as string}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Fila({ k, v, bold, tone }: { k: string; v: string; bold?: boolean; tone?: "ok" | "warn" }) {
  const color = tone === "ok" ? "text-success" : tone === "warn" ? "text-warning" : bold ? "text-ink" : "text-muted";
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted">{k}</span>
      <span className={`tabular-nums ${bold ? "font-bold" : "font-medium"} ${color}`}>{v}</span>
    </div>
  );
}
