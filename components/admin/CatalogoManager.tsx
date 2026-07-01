"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  saveServicio,
  saveProducto,
  saveBarbero,
  toggleActivo,
  updateConfigLealtad,
  type ActionResult,
} from "@/app/admin/actions";
import { fmtQ } from "@/lib/format";
import type { CatalogoAdmin } from "@/lib/queries/catalogo";
import type { Servicio, Producto, Barbero } from "@/lib/types";
import { IconPlus } from "@/components/icons";
import { Thumb } from "@/components/admin/Thumb";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { useModalA11y } from "@/components/admin/useModalA11y";

type Tab = "servicios" | "productos" | "barberos" | "lealtad";

export function CatalogoManager({ catalogo }: { catalogo: CatalogoAdmin }) {
  const [tab, setTab] = useState<Tab>("servicios");

  return (
    <div className="animate-fade-up">
      <h1 className="mb-5 font-display text-[26px] font-bold tracking-[-0.01em] text-ink">Catálogo</h1>

      <div className="mb-5 flex gap-5 overflow-x-auto border-b border-line">
        {(["servicios", "productos", "barberos", "lealtad"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px min-h-10 shrink-0 border-b-2 text-sm font-medium capitalize transition-colors ${tab === t ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "servicios" && <ServiciosTab servicios={catalogo.servicios} />}
      {tab === "productos" && <ProductosTab productos={catalogo.productos} />}
      {tab === "barberos" && <BarberosTab barberos={catalogo.barberos} />}
      {tab === "lealtad" && <LealtadTab config={catalogo.config} />}
    </div>
  );
}

// ── helpers compartidos ─────────────────────────────────────────
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

function ToggleActivo({ tabla, id, activo }: { tabla: "servicios" | "productos" | "barberos"; id: string; activo: boolean }) {
  const { pending, run } = useAction();
  return (
    <button
      onClick={() => run(() => toggleActivo(tabla, id, !activo))}
      disabled={pending}
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${activo ? "bg-success-dim text-success" : "border border-line text-subtle"}`}
    >
      {activo ? "Activo" : "Inactivo"}
    </button>
  );
}

function Sheet({ title, onClose, onSave, pending, error, children }: {
  title: string; onClose: () => void; onSave: () => void; pending: boolean; error: string | null; children: ReactNode;
}) {
  const ref = useModalA11y(onClose);
  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Cerrar" tabIndex={-1} className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div ref={ref} className="animate-fade-up relative w-full max-w-[440px] rounded-t-2xl border border-line bg-bg p-5 sm:rounded-2xl">
        <h2 className="mb-4 font-display text-xl font-bold text-ink">{title}</h2>
        <div className="flex flex-col gap-3">{children}</div>
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="min-h-[48px] flex-1 rounded-full border border-line text-sm font-medium text-muted hover:text-ink">Cancelar</button>
          <button onClick={onSave} disabled={pending} className="min-h-[48px] flex-1 rounded-full bg-accent text-sm font-semibold text-accent-ink disabled:opacity-50">
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
const inputCls = "min-h-[46px] w-full rounded-lg border border-line bg-elevated px-3.5 text-base text-ink outline-none placeholder:text-muted focus:border-accent";

function Fila({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-3 rounded-xl border border-line bg-elevated px-4 py-3">{children}</div>;
}
function BtnNuevo({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink">
      <IconPlus size={18} /> {label}
    </button>
  );
}

// ── Servicios ───────────────────────────────────────────────────
function ServiciosTab({ servicios }: { servicios: Servicio[] }) {
  const [edit, setEdit] = useState<Servicio | "nuevo" | null>(null);
  return (
    <div>
      <div className="mb-3 flex justify-end"><BtnNuevo onClick={() => setEdit("nuevo")} label="Nuevo servicio" /></div>
      <div className="flex flex-col gap-2">
        {servicios.map((s) => (
          <Fila key={s.id}>
            <Thumb src={s.imagen_url} nombre={s.nombre} />
            <div className="min-w-0 flex-1">
              <p className={`font-semibold ${s.activo ? "text-ink" : "text-subtle line-through"}`}>{s.nombre}</p>
              <p className="text-[13px] text-muted">
                {fmtQ(Number(s.precio))}{s.categoria ? ` · ${s.categoria}` : ""}{s.cuenta_lealtad ? " · cuenta lealtad" : ""}
              </p>
            </div>
            <ToggleActivo tabla="servicios" id={s.id} activo={s.activo} />
            <button onClick={() => setEdit(s)} className="text-[13px] text-muted hover:text-ink">Editar</button>
          </Fila>
        ))}
      </div>
      {edit && <ServicioSheet servicio={edit === "nuevo" ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function ServicioSheet({ servicio, onClose }: { servicio: Servicio | null; onClose: () => void }) {
  const { pending, error, run } = useAction();
  const [nombre, setNombre] = useState(servicio?.nombre ?? "");
  const [precio, setPrecio] = useState(String(servicio?.precio ?? ""));
  const [categoria, setCategoria] = useState(servicio?.categoria ?? "");
  const [duracion, setDuracion] = useState(servicio?.duracion_min != null ? String(servicio.duracion_min) : "");
  const [cuentaLealtad, setCuentaLealtad] = useState(servicio?.cuenta_lealtad ?? true);
  const [orden, setOrden] = useState(String(servicio?.orden ?? 0));
  const [imagen, setImagen] = useState<string | null>(servicio?.imagen_url ?? null);

  return (
    <Sheet title={servicio ? "Editar servicio" : "Nuevo servicio"} onClose={onClose} pending={pending} error={error}
      onSave={() => run(() => saveServicio({
        id: servicio?.id,
        nombre, precio: Number(precio) || 0, categoria,
        duracion_min: duracion ? Number(duracion) : null,
        cuenta_lealtad: cuentaLealtad, orden: Number(orden) || 0,
        imagen_url: imagen,
      }), onClose)}>
      <Campo label="Foto"><ImagePicker value={imagen} onChange={setImagen} /></Campo>
      <Campo label="Nombre"><input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} autoFocus /></Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Precio (Q)"><input value={precio} onChange={(e) => setPrecio(e.target.value)} inputMode="decimal" className={inputCls} /></Campo>
        <Campo label="Duración (min)"><input value={duracion} onChange={(e) => setDuracion(e.target.value)} inputMode="numeric" className={inputCls} /></Campo>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Categoría"><input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="corte, barba…" className={inputCls} /></Campo>
        <Campo label="Orden POS"><input value={orden} onChange={(e) => setOrden(e.target.value)} inputMode="numeric" className={inputCls} /></Campo>
      </div>
      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-elevated p-3">
        <input type="checkbox" checked={cuentaLealtad} onChange={(e) => setCuentaLealtad(e.target.checked)} className="size-5 accent-[var(--accent)]" />
        <span className="text-sm text-ink">Suma corte al programa de lealtad</span>
      </label>
    </Sheet>
  );
}

// ── Productos ───────────────────────────────────────────────────
function ProductosTab({ productos }: { productos: Producto[] }) {
  const [edit, setEdit] = useState<Producto | "nuevo" | null>(null);
  return (
    <div>
      <div className="mb-3 flex justify-end"><BtnNuevo onClick={() => setEdit("nuevo")} label="Nuevo producto" /></div>
      <div className="flex flex-col gap-2">
        {productos.map((p) => (
          <Fila key={p.id}>
            <Thumb src={p.imagen_url} nombre={p.nombre} />
            <div className="min-w-0 flex-1">
              <p className={`font-semibold ${p.activo ? "text-ink" : "text-subtle line-through"}`}>{p.nombre}</p>
              <p className="text-[13px] text-muted">{fmtQ(Number(p.precio))}{p.categoria ? ` · ${p.categoria}` : ""}</p>
            </div>
            <ToggleActivo tabla="productos" id={p.id} activo={p.activo} />
            <button onClick={() => setEdit(p)} className="text-[13px] text-muted hover:text-ink">Editar</button>
          </Fila>
        ))}
      </div>
      {edit && <ProductoSheet producto={edit === "nuevo" ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function ProductoSheet({ producto, onClose }: { producto: Producto | null; onClose: () => void }) {
  const { pending, error, run } = useAction();
  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [precio, setPrecio] = useState(String(producto?.precio ?? ""));
  const [categoria, setCategoria] = useState(producto?.categoria ?? "");
  const [imagen, setImagen] = useState<string | null>(producto?.imagen_url ?? null);
  return (
    <Sheet title={producto ? "Editar producto" : "Nuevo producto"} onClose={onClose} pending={pending} error={error}
      onSave={() => run(() => saveProducto({ id: producto?.id, nombre, precio: Number(precio) || 0, categoria, imagen_url: imagen }), onClose)}>
      <Campo label="Foto"><ImagePicker value={imagen} onChange={setImagen} /></Campo>
      <Campo label="Nombre"><input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} autoFocus /></Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Precio (Q)"><input value={precio} onChange={(e) => setPrecio(e.target.value)} inputMode="decimal" className={inputCls} /></Campo>
        <Campo label="Categoría"><input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="styling…" className={inputCls} /></Campo>
      </div>
    </Sheet>
  );
}

// ── Barberos ────────────────────────────────────────────────────
function BarberosTab({ barberos }: { barberos: Barbero[] }) {
  const [edit, setEdit] = useState<Barbero | "nuevo" | null>(null);
  return (
    <div>
      <div className="mb-3 flex justify-end"><BtnNuevo onClick={() => setEdit("nuevo")} label="Nuevo barbero" /></div>
      <div className="flex flex-col gap-2">
        {barberos.map((b) => (
          <Fila key={b.id}>
            <p className={`min-w-0 flex-1 font-semibold ${b.activo ? "text-ink" : "text-subtle line-through"}`}>{b.nombre}</p>
            <ToggleActivo tabla="barberos" id={b.id} activo={b.activo} />
            <button onClick={() => setEdit(b)} className="text-[13px] text-muted hover:text-ink">Editar</button>
          </Fila>
        ))}
      </div>
      {edit && <BarberoSheet barbero={edit === "nuevo" ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function BarberoSheet({ barbero, onClose }: { barbero: Barbero | null; onClose: () => void }) {
  const { pending, error, run } = useAction();
  const [nombre, setNombre] = useState(barbero?.nombre ?? "");
  return (
    <Sheet title={barbero ? "Editar barbero" : "Nuevo barbero"} onClose={onClose} pending={pending} error={error}
      onSave={() => run(() => saveBarbero({ id: barbero?.id, nombre }), onClose)}>
      <Campo label="Nombre"><input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} autoFocus /></Campo>
    </Sheet>
  );
}

// ── Config lealtad ──────────────────────────────────────────────
function LealtadTab({ config }: { config: CatalogoAdmin["config"] }) {
  const { pending, error, run } = useAction();
  const [cortes, setCortes] = useState(String(config.cortes_objetivo));
  const [ventana, setVentana] = useState(String(config.ventana_meses));
  const [ok, setOk] = useState(false);

  return (
    <div className="max-w-[440px]">
      <p className="mb-4 text-sm text-muted">Define cómo funciona el programa de lealtad para todos los clientes.</p>
      <div className="flex flex-col gap-3">
        <Campo label="Cortes para corte gratis">
          <input value={cortes} onChange={(e) => { setCortes(e.target.value); setOk(false); }} inputMode="numeric" className={inputCls} />
        </Campo>
        <Campo label="Ventana de actividad para tier (meses)">
          <input value={ventana} onChange={(e) => { setVentana(e.target.value); setOk(false); }} inputMode="numeric" className={inputCls} />
        </Campo>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      {ok && <p className="mt-3 text-sm text-success">Guardado ✓</p>}
      <button
        onClick={() => run(() => updateConfigLealtad(Number(cortes) || 0, Number(ventana) || 0), () => setOk(true))}
        disabled={pending}
        className="mt-4 inline-flex min-h-[48px] items-center rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Guardar config"}
      </button>
    </div>
  );
}
