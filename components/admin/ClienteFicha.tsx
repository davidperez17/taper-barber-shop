"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addNota,
  deleteNota,
  addEtiqueta,
  removeEtiqueta,
  updateCliente,
  resetPinCliente,
  regenerarQrCliente,
  anularVenta,
  editarVenta,
  ajustarSellos,
} from "@/app/admin/actions";
import {
  computeLoyalty,
  memberId,
  TIER_LABEL,
  TIER_SURFACE,
} from "@/lib/loyalty";
import { fmtDiaMes, fmtMesAnio, fmtMesCorto, fmtQ } from "@/lib/format";
import type { ClienteFicha as Ficha, HistorialVenta } from "@/lib/types";
import { IconPlus } from "@/components/icons";
import { useModalA11y } from "@/components/admin/useModalA11y";

type Tab = "resumen" | "historial" | "notas";
const ETIQUETAS_SUGERIDAS = ["vip", "frecuente", "nuevo", "barba", "recuperar"];

export function ClienteFicha({ ficha, puedeResetPin, puedeGestionar }: { ficha: Ficha; puedeResetPin?: boolean; puedeGestionar?: boolean }) {
  const [tab, setTab] = useState<Tab>("resumen");
  const [editando, setEditando] = useState(false);
  const [ajustando, setAjustando] = useState(false);
  const [pinPend, startPin] = useTransition();
  const [pinMsg, setPinMsg] = useState<string | null>(null);
  const [qrPend, startQr] = useTransition();
  const [qrMsg, setQrMsg] = useState<string | null>(null);
  const loyalty = computeLoyalty(ficha.loyalty);
  const invertido = ficha.historial.reduce((s, v) => s + Number(v.total), 0);

  const reiniciarPin = () => {
    if (!confirm(`¿Reiniciar el PIN de ${ficha.cliente.nombre}? Creará uno nuevo en su próximo ingreso.`)) return;
    setPinMsg(null);
    startPin(async () => {
      const r = await resetPinCliente(ficha.cliente.id);
      setPinMsg(r.ok ? "PIN reiniciado. El cliente lo configura al ingresar." : r.error ?? "Error");
    });
  };

  const regenerarQr = () => {
    if (!confirm(`¿Regenerar el QR de ${ficha.cliente.nombre}? El QR anterior dejará de funcionar y el cliente deberá volver a ingresar con su teléfono y PIN.`)) return;
    setQrMsg(null);
    startQr(async () => {
      const r = await regenerarQrCliente(ficha.cliente.id);
      setQrMsg(r.ok ? "QR regenerado. El anterior ya no sirve; el cliente ve el nuevo al reingresar." : r.error ?? "Error");
    });
  };

  return (
    <div>
      <Link href="/admin/clientes" className="mb-4 inline-flex min-h-9 items-center gap-1 text-sm text-muted hover:text-ink">
        ← Clientes
      </Link>

      {/* Header con tier */}
      <div className={`${TIER_SURFACE[loyalty.tier]} rounded-2xl border border-white/15 p-5`} style={{ boxShadow: "0 8px 30px var(--tier-glow)" }}>
        <div className="flex flex-wrap items-start justify-between gap-3" style={{ color: "var(--tier-ink)" }}>
          <div className="min-w-0">
            <h1 className="font-display text-[26px] font-extrabold leading-none">{ficha.cliente.nombre}</h1>
            <p className="mt-1.5 text-[13px] opacity-85">
              {memberId(ficha.cliente.numero)} · {TIER_LABEL[loyalty.tier]} · Miembro desde {fmtMesCorto(ficha.cliente.created_at)}
            </p>
            <p className="mt-0.5 text-[13px] opacity-75">
              {ficha.cliente.telefono}
              {ficha.cliente.correo ? ` · ${ficha.cliente.correo}` : ""}
            </p>
          </div>
          <span className="rounded-full bg-black/25 px-2.5 py-1 text-[13px] font-semibold">
            {loyalty.cortesCiclo}/{loyalty.objetivo}
          </span>
        </div>
        {loyalty.recompensaDisponible && (
          <div className="mt-3 rounded-lg bg-success px-3 py-2 text-sm font-semibold text-[var(--success-ink)]">
            ★ Recompensa disponible — corte gratis
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="mt-4 flex flex-wrap gap-2.5">
        <Link href={`/admin/venta/${ficha.cliente.id}`} className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink">
          Registrar venta
        </Link>
        <button onClick={() => setEditando(true)} className="inline-flex min-h-11 items-center rounded-full border border-line bg-elevated px-5 text-sm font-medium text-ink hover:border-line-strong">
          Editar datos
        </button>
        {puedeResetPin && (
          <button onClick={reiniciarPin} disabled={pinPend} className="inline-flex min-h-11 items-center rounded-full border border-line bg-elevated px-5 text-sm font-medium text-muted hover:border-line-strong hover:text-ink disabled:opacity-50">
            {pinPend ? "Reiniciando…" : "Reiniciar PIN"}
          </button>
        )}
        {puedeResetPin && (
          <button onClick={regenerarQr} disabled={qrPend} className="inline-flex min-h-11 items-center rounded-full border border-line bg-elevated px-5 text-sm font-medium text-muted hover:border-line-strong hover:text-ink disabled:opacity-50">
            {qrPend ? "Regenerando…" : "Regenerar QR"}
          </button>
        )}
      </div>
      {pinMsg && <p role="status" className="mt-2 text-sm text-muted">{pinMsg}</p>}
      {qrMsg && <p role="status" className="mt-2 text-sm text-muted">{qrMsg}</p>}

      {/* Tabs */}
      <div className="mt-6 flex gap-5 border-b border-line">
        {(["resumen", "historial", "notas"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px min-h-10 border-b-2 text-sm font-medium capitalize transition-colors ${tab === t ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t === "notas" ? "Notas y etiquetas" : t}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "resumen" && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat value={String(ficha.loyalty.cortes_total)} label="Cortes totales" accent />
              <Stat value={String(ficha.loyalty.visitas_12m)} label="Visitas (12m)" />
              <Stat value={fmtQ(invertido)} label="Invertido" />
              <Stat value={fmtDiaMes(ficha.loyalty.ultima_visita)} label="Última visita" />
            </div>
            {puedeGestionar && (
              <button
                onClick={() => setAjustando(true)}
                className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-elevated px-4 text-sm font-medium text-muted hover:border-line-strong hover:text-ink"
              >
                Ajustar sellos
              </button>
            )}
          </>
        )}

        {tab === "historial" && (
          <Historial
            ventas={ficha.historial}
            clienteId={ficha.cliente.id}
            barberos={ficha.barberos}
            puedeGestionar={!!puedeGestionar}
          />
        )}

        {tab === "notas" && (
          <NotasEtiquetas
            clienteId={ficha.cliente.id}
            notas={ficha.notas}
            etiquetas={ficha.etiquetas}
          />
        )}
      </div>

      {editando && <EditarSheet cliente={ficha.cliente} onClose={() => setEditando(false)} />}
      {ajustando && (
        <AjustarSellosSheet
          clienteId={ficha.cliente.id}
          sucursalId={ficha.sucursalId}
          actuales={ficha.loyalty.cortes_total}
          onClose={() => setAjustando(false)}
        />
      )}
    </div>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-elevated p-4">
      <p className={`font-display text-[26px] font-extrabold leading-none tabular-nums ${accent ? "text-accent" : "text-ink"}`}>{value}</p>
      <p className="mt-1.5 text-[13px] font-medium text-muted">{label}</p>
    </div>
  );
}

function Historial({
  ventas, clienteId, barberos, puedeGestionar,
}: {
  ventas: HistorialVenta[];
  clienteId: string;
  barberos: { id: string; nombre: string }[];
  puedeGestionar: boolean;
}) {
  const router = useRouter();
  const [pend, start] = useTransition();
  const [editar, setEditar] = useState<HistorialVenta | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  if (ventas.length === 0) {
    return <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">Sin ventas registradas todavía.</p>;
  }
  const grupos = new Map<string, HistorialVenta[]>();
  for (const v of ventas) {
    const k = fmtMesAnio(v.created_at);
    const arr = grupos.get(k) ?? [];
    arr.push(v);
    grupos.set(k, arr);
  }

  const anular = (v: HistorialVenta) => {
    if (!confirm(`¿Anular esta venta de ${fmtQ(v.total)}? Se quitará el sello correspondiente y se corregirán reportes y caja. No se puede deshacer.`)) return;
    const motivo = prompt("Motivo (opcional):") ?? undefined;
    setMsg(null);
    start(async () => {
      const r = await anularVenta(v.id, clienteId, motivo);
      if (!r.ok) { setMsg(r.error ?? "Error"); return; }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {msg && <p role="alert" className="text-sm text-danger">{msg}</p>}
      {[...grupos.entries()].map(([mes, vs]) => (
        <section key={mes}>
          <p className="mb-2.5 text-xs uppercase tracking-[0.06em] text-subtle">{mes}</p>
          <div className="flex flex-col gap-2.5">
            {vs.map((v) => (
              <article key={v.id} className="rounded-xl border border-line bg-elevated p-4">
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-sm font-medium text-ink">
                    {fmtDiaMes(v.created_at)}
                    {v.barbero && <span className="text-muted"> · {v.barbero}</span>}
                  </span>
                  <span className="font-display text-lg font-bold text-accent">{fmtQ(v.total)}</span>
                </div>
                <p className="text-[13px] text-muted">{v.items.map((i) => i.nombre).join(" · ") || "Venta"}</p>
                {v.recompensa_canjeada && (
                  <span className="mt-2 inline-block rounded-full bg-success-dim px-2.5 py-1 text-[11px] font-semibold text-success">Corte gratis canjeado</span>
                )}
                {puedeGestionar && (
                  <div className="mt-3 flex gap-2 border-t border-line pt-3">
                    <button onClick={() => setEditar(v)} disabled={pend} className="min-h-9 rounded-full border border-line px-3.5 text-[13px] font-medium text-muted hover:border-line-strong hover:text-ink disabled:opacity-50">
                      Editar
                    </button>
                    <button onClick={() => anular(v)} disabled={pend} className="min-h-9 rounded-full border border-danger/40 px-3.5 text-[13px] font-medium text-danger hover:border-danger disabled:opacity-50">
                      Anular
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}

      {editar && (
        <EditarVentaSheet venta={editar} clienteId={clienteId} barberos={barberos} onClose={() => setEditar(null)} />
      )}
    </div>
  );
}

function NotasEtiquetas({ clienteId, notas, etiquetas }: { clienteId: string; notas: Ficha["notas"]; etiquetas: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState("");
  const [nuevaNota, setNuevaNota] = useState("");

  const agregarEtiqueta = (val: string) => {
    const v = val.trim().toLowerCase();
    if (!v || etiquetas.includes(v)) return;
    start(async () => {
      await addEtiqueta(clienteId, v);
      setNuevaEtiqueta("");
      router.refresh();
    });
  };
  const quitarEtiqueta = (v: string) => start(async () => { await removeEtiqueta(clienteId, v); router.refresh(); });
  const guardarNota = () => {
    if (!nuevaNota.trim()) return;
    start(async () => { await addNota(clienteId, nuevaNota); setNuevaNota(""); router.refresh(); });
  };
  const borrarNota = (id: string) => start(async () => { await deleteNota(id, clienteId); router.refresh(); });

  const sugeridas = ETIQUETAS_SUGERIDAS.filter((s) => !etiquetas.includes(s));

  return (
    <div className="flex flex-col gap-6">
      {/* Etiquetas */}
      <section>
        <h2 className="mb-2.5 font-display text-base font-bold text-ink">Etiquetas</h2>
        <div className="flex flex-wrap items-center gap-2">
          {etiquetas.map((e) => (
            <span key={e} className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-dim px-3 py-1.5 text-[13px] font-medium text-accent">
              {e}
              <button onClick={() => quitarEtiqueta(e)} aria-label={`Quitar ${e}`} className="-mr-1 flex size-6 items-center justify-center text-base text-accent/70 hover:text-accent">×</button>
            </span>
          ))}
          {etiquetas.length === 0 && <span className="text-[13px] text-subtle">Sin etiquetas.</span>}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={nuevaEtiqueta}
            onChange={(e) => setNuevaEtiqueta(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarEtiqueta(nuevaEtiqueta); } }}
            placeholder="Nueva etiqueta…"
            className="min-h-10 rounded-lg border border-line bg-elevated px-3 text-sm text-ink outline-none placeholder:text-muted focus:border-accent"
          />
          {sugeridas.map((s) => (
            <button key={s} onClick={() => agregarEtiqueta(s)} disabled={pending} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[13px] text-muted hover:border-line-strong hover:text-ink">
              <IconPlus size={13} /> {s}
            </button>
          ))}
        </div>
      </section>

      {/* Notas */}
      <section>
        <h2 className="mb-2.5 font-display text-base font-bold text-ink">Notas internas</h2>
        <textarea
          value={nuevaNota}
          onChange={(e) => setNuevaNota(e.target.value)}
          placeholder="Preferencias, recordatorios, contexto del cliente…"
          rows={3}
          className="w-full resize-none rounded-xl border border-line bg-elevated p-3 text-sm text-ink outline-none placeholder:text-muted focus:border-accent"
        />
        <button onClick={guardarNota} disabled={pending || !nuevaNota.trim()} className="mt-2 inline-flex min-h-10 items-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink disabled:opacity-40">
          Guardar nota
        </button>

        <div className="mt-4 flex flex-col gap-2.5">
          {notas.map((n) => (
            <div key={n.id} className="rounded-xl border border-line bg-elevated p-3.5">
              <div className="flex items-start justify-between gap-3">
                <p className="whitespace-pre-wrap text-sm text-ink">{n.texto}</p>
                <button onClick={() => borrarNota(n.id)} aria-label="Borrar nota" className="-mr-1 -mt-1 flex size-9 shrink-0 items-center justify-center text-base text-subtle hover:text-danger">×</button>
              </div>
              <p className="mt-1.5 text-[11px] text-subtle">{fmtDiaMes(n.created_at)}{n.autor_nombre ? ` · ${n.autor_nombre}` : ""}</p>
            </div>
          ))}
          {notas.length === 0 && <p className="text-[13px] text-subtle">Sin notas todavía.</p>}
        </div>
      </section>
    </div>
  );
}

function EditarSheet({ cliente, onClose }: { cliente: Ficha["cliente"]; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [nombre, setNombre] = useState(cliente.nombre);
  const [telefono, setTelefono] = useState(cliente.telefono);
  const [correo, setCorreo] = useState(cliente.correo ?? "");
  const [error, setError] = useState<string | null>(null);

  const ref = useModalA11y(onClose);

  const guardar = () => {
    setError(null);
    start(async () => {
      const r = await updateCliente(cliente.id, { nombre, telefono, correo });
      if (!r.ok) { setError(r.error ?? "Error"); return; }
      onClose();
      router.refresh();
    });
  };

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Editar cliente">
      <button aria-label="Cerrar" tabIndex={-1} className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div ref={ref} className="animate-fade-up relative w-full max-w-[440px] rounded-t-2xl border border-line bg-bg p-5 sm:rounded-2xl">
        <h2 className="font-display text-xl font-bold text-ink">Editar cliente</h2>
        <div className="mt-4 flex flex-col gap-3">
          <Field label="Nombre" value={nombre} onChange={setNombre} />
          <Field label="Teléfono" value={telefono} onChange={setTelefono} inputMode="tel" />
          <Field label="Correo" value={correo} onChange={setCorreo} inputMode="email" placeholder="opcional" />
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="min-h-[48px] flex-1 rounded-full border border-line text-sm font-medium text-muted hover:text-ink">Cancelar</button>
          <button onClick={guardar} disabled={pending} className="min-h-[48px] flex-1 rounded-full bg-accent text-sm font-semibold text-accent-ink disabled:opacity-50">
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, inputMode, placeholder }: { label: string; value: string; onChange: (v: string) => void; inputMode?: "tel" | "email"; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        placeholder={placeholder}
        className="min-h-[48px] w-full rounded-lg border border-line bg-elevated px-4 text-base text-ink outline-none placeholder:text-muted focus:border-accent"
      />
    </label>
  );
}

const METODOS = ["efectivo", "tarjeta", "transferencia"] as const;
type Metodo = (typeof METODOS)[number];

function EditarVentaSheet({
  venta, clienteId, barberos, onClose,
}: {
  venta: HistorialVenta;
  clienteId: string;
  barberos: { id: string; nombre: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [total, setTotal] = useState(String(venta.total));
  const [metodo, setMetodo] = useState<Metodo>(venta.metodo_pago ?? "efectivo");
  const [barberoId, setBarberoId] = useState<string>(venta.barbero_id ?? "");
  const [error, setError] = useState<string | null>(null);
  const ref = useModalA11y(onClose);

  const guardar = () => {
    const t = Number(total);
    if (!(t >= 0)) { setError("Monto inválido."); return; }
    setError(null);
    start(async () => {
      const r = await editarVenta({ ventaId: venta.id, clienteId, total: t, metodo, barberoId: barberoId || null });
      if (!r.ok) { setError(r.error ?? "Error"); return; }
      onClose();
      router.refresh();
    });
  };

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Editar venta">
      <button aria-label="Cerrar" tabIndex={-1} className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div ref={ref} className="animate-fade-up relative w-full max-w-[440px] rounded-t-2xl border border-line bg-bg p-5 sm:rounded-2xl">
        <h2 className="font-display text-xl font-bold text-ink">Editar venta</h2>
        <p className="mt-1 text-[13px] text-muted">{fmtDiaMes(venta.created_at)} · {venta.items.map((i) => i.nombre).join(" · ") || "Venta"}</p>

        <div className="mt-4 flex flex-col gap-4">
          <Field label="Monto (Q)" value={total} onChange={setTotal} inputMode="tel" />

          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-muted">Método de pago</span>
            <div className="flex flex-wrap gap-2">
              {METODOS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMetodo(m)}
                  className={`min-h-10 rounded-full border px-4 text-sm font-medium capitalize transition-colors ${metodo === m ? "border-accent bg-accent text-accent-ink" : "border-line bg-elevated text-muted hover:text-ink"}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {barberos.length > 0 && (
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-muted">Barbero</span>
              <select
                value={barberoId}
                onChange={(e) => setBarberoId(e.target.value)}
                className="min-h-[48px] w-full rounded-lg border border-line bg-elevated px-4 text-base text-ink outline-none focus:border-accent"
              >
                <option value="">Sin asignar</option>
                {barberos.map((b) => (
                  <option key={b.id} value={b.id}>{b.nombre}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="min-h-[48px] flex-1 rounded-full border border-line text-sm font-medium text-muted hover:text-ink">Cancelar</button>
          <button onClick={guardar} disabled={pending} className="min-h-[48px] flex-1 rounded-full bg-accent text-sm font-semibold text-accent-ink disabled:opacity-50">
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AjustarSellosSheet({
  clienteId, sucursalId, actuales, onClose,
}: {
  clienteId: string;
  sucursalId: string | null;
  actuales: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [delta, setDelta] = useState(0);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ref = useModalA11y(onClose);
  const resultado = Math.max(0, actuales + delta);

  const guardar = () => {
    if (delta === 0) { setError("Cambia el número de sellos (+/−)."); return; }
    if (!sucursalId) { setError("No hay sucursal activa."); return; }
    setError(null);
    start(async () => {
      const r = await ajustarSellos({ clienteId, sucursalId, delta, motivo });
      if (!r.ok) { setError(r.error ?? "Error"); return; }
      onClose();
      router.refresh();
    });
  };

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Ajustar sellos">
      <button aria-label="Cerrar" tabIndex={-1} className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div ref={ref} className="animate-fade-up relative w-full max-w-[440px] rounded-t-2xl border border-line bg-bg p-5 sm:rounded-2xl">
        <h2 className="font-display text-xl font-bold text-ink">Ajustar sellos</h2>
        <p className="mt-1 text-[13px] text-muted">Corrección manual. Actual: <b className="text-ink">{actuales}</b> · Quedará en <b className="text-accent">{resultado}</b>.</p>

        <div className="mt-4 flex items-center justify-center gap-4">
          <button onClick={() => setDelta((d) => d - 1)} className="grid size-12 place-items-center rounded-full border border-line bg-elevated text-2xl text-ink hover:border-line-strong" aria-label="Quitar sello">−</button>
          <span className="min-w-[64px] text-center font-display text-3xl font-bold tabular-nums text-ink">{delta > 0 ? `+${delta}` : delta}</span>
          <button onClick={() => setDelta((d) => d + 1)} className="grid size-12 place-items-center rounded-full border border-line bg-elevated text-2xl text-ink hover:border-line-strong" aria-label="Agregar sello">+</button>
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[13px] font-medium text-muted">Motivo (opcional)</span>
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="cortesía, corrección…"
            className="min-h-[48px] w-full rounded-lg border border-line bg-elevated px-4 text-base text-ink outline-none placeholder:text-muted focus:border-accent"
          />
        </label>

        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="min-h-[48px] flex-1 rounded-full border border-line text-sm font-medium text-muted hover:text-ink">Cancelar</button>
          <button onClick={guardar} disabled={pending || delta === 0} className="min-h-[48px] flex-1 rounded-full bg-accent text-sm font-semibold text-accent-ink disabled:opacity-50">
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
