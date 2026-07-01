"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { saveCita, updateEstadoCita, deleteCita, type ActionResult } from "@/app/admin/actions";
import type { Barbero, Servicio, CitaRow, CitaEstado, CitaUbicacion } from "@/lib/types";
import { IconPlus, IconSearch, IconChevronLeft, IconPencil } from "@/components/icons";
import { useModalA11y } from "@/components/admin/useModalA11y";

const TZ = "America/Guatemala";
const ESTADOS: CitaEstado[] = ["pendiente", "confirmada", "completada", "cancelada"];
const ESTADO_LABEL: Record<CitaEstado, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  completada: "Completada",
  cancelada: "Cancelada",
};

function fmtHora(iso: string): string {
  return new Intl.DateTimeFormat("es-GT", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
}
function fmtFechaLarga(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00-06:00`);
  return new Intl.DateTimeFormat("es-GT", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(d);
}
function sumarDias(fecha: string, n: number): string {
  const d = new Date(`${fecha}T12:00:00-06:00`);
  d.setUTCDate(d.getUTCDate() + n);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}
/** Hora "HH:MM" en GT a partir de un ISO (para precargar el form al editar). */
function horaGT(iso: string): string {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(iso));
  const h = p.find((x) => x.type === "hour")?.value ?? "09";
  const m = p.find((x) => x.type === "minute")?.value ?? "00";
  return `${h}:${m}`;
}
function fechaGT(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
}

interface Props {
  fecha: string;
  hoy: string;
  citas: CitaRow[];
  barberos: Barbero[];
  servicios: Servicio[];
}

export function AgendaManager({ fecha, hoy, citas, barberos, servicios }: Props) {
  const router = useRouter();
  const [edit, setEdit] = useState<CitaRow | "nueva" | null>(null);

  const irA = (f: string) => router.push(`/admin/agenda?d=${f}`);

  return (
    <div className="animate-fade-up">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="font-display text-[26px] font-bold tracking-[-0.01em] text-ink">Agenda</h1>
        <button onClick={() => setEdit("nueva")} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink">
          <IconPlus size={18} /> Nueva cita
        </button>
      </div>

      {/* Navegador de día */}
      <div className="mb-5 flex items-center justify-between gap-2 rounded-xl border border-line bg-elevated px-2 py-2">
        <button onClick={() => irA(sumarDias(fecha, -1))} aria-label="Día anterior" className="flex size-10 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink">
          <IconChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold capitalize text-ink">{fmtFechaLarga(fecha)}</p>
          {fecha !== hoy && (
            <button onClick={() => irA(hoy)} className="text-[12px] font-medium text-accent hover:underline">Ir a hoy</button>
          )}
        </div>
        <button onClick={() => irA(sumarDias(fecha, 1))} aria-label="Día siguiente" className="flex size-10 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink">
          <span className="rotate-180"><IconChevronLeft size={18} /></span>
        </button>
      </div>

      {citas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
          No hay citas para este día. Crea una con &ldquo;Nueva cita&rdquo;.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {citas.map((c) => (
            <CitaFila key={c.id} cita={c} onEdit={() => setEdit(c)} />
          ))}
        </div>
      )}

      {edit && (
        <CitaSheet
          cita={edit === "nueva" ? null : edit}
          fechaDefault={fecha}
          barberos={barberos}
          servicios={servicios}
          onClose={() => setEdit(null)}
        />
      )}
    </div>
  );
}

// ── acción compartida ───────────────────────────────────────────
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
  return { pending, error, run };
}

const ESTADO_CLS: Record<CitaEstado, string> = {
  pendiente: "border-line text-muted",
  confirmada: "border-accent/50 bg-accent-dim text-accent",
  completada: "border-success/40 bg-success-dim text-success",
  cancelada: "border-danger/40 bg-danger/10 text-danger",
};

function CitaFila({ cita, onEdit }: { cita: CitaRow; onEdit: () => void }) {
  const { pending, run } = useAction();
  const nombre = cita.cliente?.nombre ?? cita.cliente_nombre ?? "Cliente";
  const cancelada = cita.estado === "cancelada";
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-elevated px-4 py-3">
      <div className="w-16 shrink-0 pt-0.5">
        <p className={`font-display text-[15px] font-bold tabular-nums ${cancelada ? "text-subtle line-through" : "text-ink"}`}>{fmtHora(cita.inicia_en)}</p>
        <p className="text-[11px] text-subtle">{cita.duracion_min} min</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate font-semibold ${cancelada ? "text-subtle line-through" : "text-ink"}`}>{nombre}</p>
        <p className="truncate text-[13px] text-muted">
          {cita.servicio?.nombre ?? "Sin servicio"}
          {cita.barbero?.nombre ? ` · ${cita.barbero.nombre}` : ""}
        </p>
        <p className="mt-0.5 text-[12px]">
          {cita.ubicacion === "domicilio" ? (
            <span className="text-accent">Domicilio{cita.direccion ? <span className="text-subtle"> · {cita.direccion}</span> : null}</span>
          ) : (
            <span className="text-subtle">En la barbería</span>
          )}
        </p>
        {cita.nota && <p className="mt-0.5 truncate text-[12px] text-subtle">“{cita.nota}”</p>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <select
          value={cita.estado}
          disabled={pending}
          onChange={(e) => run(() => updateEstadoCita(cita.id, e.target.value as CitaEstado))}
          aria-label={`Estado de la cita de ${nombre}`}
          className={`min-h-8 rounded-full border px-2.5 text-[12px] font-semibold outline-none focus:border-accent ${ESTADO_CLS[cita.estado]}`}
        >
          {ESTADOS.map((e) => (
            <option key={e} value={e} className="bg-bg text-ink">{ESTADO_LABEL[e]}</option>
          ))}
        </select>
        <button onClick={onEdit} className="flex min-h-8 items-center gap-1 rounded-full border border-line px-2.5 text-[12px] font-medium text-muted hover:border-line-strong hover:text-ink">
          <IconPencil size={13} /> Editar
        </button>
      </div>
    </div>
  );
}

// ── helpers de formulario ───────────────────────────────────────
const inputCls = "min-h-[46px] w-full rounded-lg border border-line bg-elevated px-3.5 text-base text-ink outline-none placeholder:text-muted focus:border-accent";

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

interface ClienteSel { id: string | null; nombre: string }

function ClientePicker({ value, onChange }: { value: ClienteSel; onChange: (v: ClienteSel) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ id: string; nombre: string; telefono: string }[]>([]);
  const [abierto, setAbierto] = useState(false);
  const sb = useRef(createClient());

  async function buscar(term: string) {
    setQ(term);
    onChange({ id: null, nombre: term }); // permite nombre libre mientras escribe
    if (term.trim().length < 2) { setHits([]); setAbierto(false); return; }
    const digits = term.replace(/\D/g, "");
    const filter = digits.length >= 3 ? `telefono.ilike.%${digits}%,nombre.ilike.%${term}%` : `nombre.ilike.%${term}%`;
    const { data } = await sb.current.from("clientes").select("id, nombre, telefono").or(filter).limit(6);
    setHits((data as { id: string; nombre: string; telefono: string }[]) ?? []);
    setAbierto(true);
  }

  return (
    <div>
      {value.id ? (
        <div className="flex items-center justify-between rounded-lg border border-accent/40 bg-accent-dim px-3.5 py-3">
          <span className="text-sm font-semibold text-ink">{value.nombre}</span>
          <button type="button" onClick={() => { onChange({ id: null, nombre: "" }); setQ(""); }} className="text-[13px] text-muted hover:text-ink">Cambiar</button>
        </div>
      ) : (
        <div className="relative">
          <div className="flex items-center rounded-lg border border-line bg-elevated px-3 focus-within:border-accent">
            <span className="mr-2 text-subtle"><IconSearch size={18} /></span>
            <input
              value={q}
              onChange={(e) => buscar(e.target.value)}
              placeholder="Buscar cliente o escribir nombre…"
              className="min-h-[46px] w-full bg-transparent text-base text-ink outline-none placeholder:text-muted"
            />
          </div>
          {abierto && hits.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-line bg-bg shadow-lg">
              {hits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => { onChange({ id: h.id, nombre: h.nombre }); setAbierto(false); }}
                    className="flex w-full items-center justify-between px-3.5 py-2.5 text-left hover:bg-elevated"
                  >
                    <span className="text-sm text-ink">{h.nombre}</span>
                    <span className="text-[12px] text-muted">{h.telefono}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function CitaSheet({ cita, fechaDefault, barberos, servicios, onClose }: {
  cita: CitaRow | null;
  fechaDefault: string;
  barberos: Barbero[];
  servicios: Servicio[];
  onClose: () => void;
}) {
  const { pending, error, run } = useAction();
  const ref = useModalA11y(onClose);

  const [cli, setCli] = useState<ClienteSel>({
    id: cita?.cliente_id ?? null,
    nombre: cita?.cliente?.nombre ?? cita?.cliente_nombre ?? "",
  });
  const [fecha, setFecha] = useState(cita ? fechaGT(cita.inicia_en) : fechaDefault);
  const [hora, setHora] = useState(cita ? horaGT(cita.inicia_en) : "09:00");
  const [servicioId, setServicioId] = useState(cita?.servicio_id ?? "");
  const [barberoId, setBarberoId] = useState(cita?.barbero_id ?? "");
  const [duracion, setDuracion] = useState(String(cita?.duracion_min ?? 30));
  const [ubicacion, setUbicacion] = useState<CitaUbicacion>(cita?.ubicacion ?? "barberia");
  const [direccion, setDireccion] = useState(cita?.direccion ?? "");
  const [nota, setNota] = useState(cita?.nota ?? "");

  function onServicio(id: string) {
    setServicioId(id);
    const s = servicios.find((x) => x.id === id);
    if (s?.duracion_min) setDuracion(String(s.duracion_min));
  }

  const guardar = () =>
    run(() => saveCita({
      id: cita?.id,
      clienteId: cli.id,
      clienteNombre: cli.nombre,
      barberoId: barberoId || null,
      servicioId: servicioId || null,
      fecha, hora,
      duracionMin: Number(duracion) || 30,
      ubicacion, direccion, nota,
    }), onClose);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={cita ? "Editar cita" : "Nueva cita"}>
      <button aria-label="Cerrar" tabIndex={-1} className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div ref={ref} className="animate-fade-up relative flex max-h-[90dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-2xl border border-line bg-bg sm:max-h-[85dvh] sm:rounded-2xl">
        <h2 className="shrink-0 border-b border-line px-5 py-4 font-display text-xl font-bold text-ink">{cita ? "Editar cita" : "Nueva cita"}</h2>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
          <Campo label="Cliente"><ClientePicker value={cli} onChange={setCli} /></Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Fecha"><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={`${inputCls} tabular-nums`} /></Campo>
            <Campo label="Hora"><input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={`${inputCls} tabular-nums`} /></Campo>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Servicio">
              <select value={servicioId} onChange={(e) => onServicio(e.target.value)} className={inputCls}>
                <option value="">Sin especificar</option>
                {servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </Campo>
            <Campo label="Barbero">
              <select value={barberoId} onChange={(e) => setBarberoId(e.target.value)} className={inputCls}>
                <option value="">Sin asignar</option>
                {barberos.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </select>
            </Campo>
          </div>

          <Campo label="Duración (min)"><input value={duracion} onChange={(e) => setDuracion(e.target.value)} inputMode="numeric" className={`${inputCls} tabular-nums`} /></Campo>

          <Campo label="Ubicación">
            <div className="flex gap-2">
              {(["barberia", "domicilio"] as CitaUbicacion[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUbicacion(u)}
                  className={`min-h-11 flex-1 rounded-lg border text-sm font-medium transition-colors ${ubicacion === u ? "border-accent bg-accent text-accent-ink" : "border-line bg-elevated text-muted hover:text-ink"}`}
                >
                  {u === "barberia" ? "En la barbería" : "Domicilio / evento"}
                </button>
              ))}
            </div>
          </Campo>

          {ubicacion === "domicilio" && (
            <Campo label="Dirección del domicilio/evento">
              <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle, zona, referencia…" className={inputCls} />
            </Campo>
          )}

          <Campo label="Nota (opcional)">
            <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} placeholder="Detalle del evento, preferencias…" className={`${inputCls} min-h-[60px] resize-none py-2.5`} />
          </Campo>

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          {cita && <BorrarCita id={cita.id} onDone={onClose} />}
        </div>

        <div className="shrink-0 border-t border-line px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3.5">
          <div className="flex gap-3">
            <button onClick={onClose} className="min-h-[48px] flex-1 rounded-full border border-line text-sm font-medium text-muted hover:text-ink">Cancelar</button>
            <button onClick={guardar} disabled={pending} className="min-h-[48px] flex-1 rounded-full bg-accent text-sm font-semibold text-accent-ink disabled:opacity-50">
              {pending ? "Guardando…" : "Guardar cita"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function BorrarCita({ id, onDone }: { id: string; onDone: () => void }) {
  const { pending, run } = useAction();
  const [confirm, setConfirm] = useState(false);
  if (!confirm) {
    return (
      <button onClick={() => setConfirm(true)} className="block w-full text-center text-[13px] text-muted hover:text-danger">
        Eliminar cita
      </button>
    );
  }
  return (
    <div className="rounded-lg border border-danger/40 bg-danger/5 p-3 text-center">
      <p className="mb-2 text-[13px] text-ink">¿Eliminar esta cita? No se puede deshacer.</p>
      <div className="flex gap-2">
        <button onClick={() => setConfirm(false)} className="min-h-10 flex-1 rounded-full border border-line text-[13px] text-muted hover:text-ink">Cancelar</button>
        <button onClick={() => run(() => deleteCita(id), onDone)} disabled={pending} className="min-h-10 flex-1 rounded-full bg-danger text-[13px] font-semibold text-white disabled:opacity-50">
          {pending ? "Eliminando…" : "Sí, eliminar"}
        </button>
      </div>
    </div>
  );
}
