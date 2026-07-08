"use client";

import { useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
import { IconPlus, IconPencil } from "@/components/icons";
import { Thumb } from "@/components/admin/Thumb";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { useModalA11y } from "@/components/admin/useModalA11y";

type Tab = "servicios" | "productos" | "barberos" | "lealtad";

export function CatalogoManager({ catalogo }: { catalogo: CatalogoAdmin }) {
  const [tab, setTab] = useState<Tab>("servicios");

  return (
    <div>
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

function ToggleActivo({ tabla, id, activo, nombre }: { tabla: "servicios" | "productos" | "barberos"; id: string; activo: boolean; nombre: string }) {
  const { pending, run } = useAction();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={`${activo ? "Desactivar" : "Activar"} ${nombre}`}
      onClick={() => run(() => toggleActivo(tabla, id, !activo))}
      disabled={pending}
      className="flex min-h-11 shrink-0 items-center gap-2 rounded-full px-1.5 disabled:opacity-50"
    >
      <span className={`w-14 text-right text-[11px] font-semibold tabular-nums ${activo ? "text-success" : "text-subtle"}`}>
        {activo ? "Activo" : "Inactivo"}
      </span>
      <span className={`relative inline-flex h-[26px] w-[46px] shrink-0 items-center rounded-full transition-colors ${activo ? "bg-success" : "bg-line-strong"}`}>
        <span className={`absolute size-5 rounded-full bg-white shadow-sm transition-transform ${activo ? "translate-x-[23px]" : "translate-x-[3px]"}`} />
      </span>
    </button>
  );
}

function EditarBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-line px-3.5 text-[13px] font-medium text-muted transition-colors hover:border-line-strong hover:text-ink"
    >
      <IconPencil size={15} /> Editar
    </button>
  );
}

function Sheet({ title, onClose, onSave, pending, error, children }: {
  title: string; onClose: () => void; onSave: () => void; pending: boolean; error: string | null; children: ReactNode;
}) {
  const ref = useModalA11y(onClose);
  if (typeof document === "undefined") return null;

  // Portal a document.body: escapa del contenedor animate-fade-up (transform
  // persistente) que atraparía el position:fixed. Ver [[feedback-modal-portal]].
  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Cerrar" tabIndex={-1} className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div ref={ref} className="animate-fade-up relative flex max-h-[90dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-2xl border border-line bg-bg sm:max-h-[85dvh] sm:rounded-2xl">
        <h2 className="shrink-0 border-b border-line px-5 py-4 font-display text-xl font-bold text-ink">{title}</h2>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
          {children}
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        </div>
        <div className="shrink-0 border-t border-line px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3.5">
          <div className="flex gap-3">
            <button onClick={onClose} className="min-h-[48px] flex-1 rounded-full border border-line text-sm font-medium text-muted hover:text-ink">Cancelar</button>
            <button onClick={onSave} disabled={pending} className="min-h-[48px] flex-1 rounded-full bg-accent text-sm font-semibold text-accent-ink disabled:opacity-50">
              {pending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
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

// En móvil apila: info (nombre/precio) a ancho completo arriba y las acciones
// (toggle + editar) abajo, para que el nombre no se parta palabra por palabra.
// En sm+ vuelve a una sola fila.
function Fila({ main, actions }: { main: ReactNode; actions: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-elevated px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">{main}</div>
      <div className="flex shrink-0 items-center justify-end gap-2">{actions}</div>
    </div>
  );
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
          <Fila
            key={s.id}
            main={
              <>
                <Thumb src={s.imagen_url} nombre={s.nombre} />
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold ${s.activo ? "text-ink" : "text-subtle line-through"}`}>{s.nombre}</p>
                  <p className="text-[13px] text-muted">
                    {fmtQ(Number(s.precio))}{s.categoria ? ` · ${s.categoria}` : ""}{s.cuenta_lealtad ? " · cuenta lealtad" : ""}
                  </p>
                </div>
              </>
            }
            actions={
              <>
                <ToggleActivo tabla="servicios" id={s.id} activo={s.activo} nombre={s.nombre} />
                <EditarBtn onClick={() => setEdit(s)} />
              </>
            }
          />
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
          <Fila
            key={p.id}
            main={
              <>
                <Thumb src={p.imagen_url} nombre={p.nombre} />
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold ${p.activo ? "text-ink" : "text-subtle line-through"}`}>{p.nombre}</p>
                  <p className="text-[13px] text-muted">
                    {fmtQ(Number(p.precio))}{p.categoria ? ` · ${p.categoria}` : ""}
                    {p.controla_stock && (
                      <span className={p.stock <= p.stock_min ? "text-warning" : "text-muted"}> · {p.stock} en stock</span>
                    )}
                  </p>
                </div>
              </>
            }
            actions={
              <>
                <ToggleActivo tabla="productos" id={p.id} activo={p.activo} nombre={p.nombre} />
                <EditarBtn onClick={() => setEdit(p)} />
              </>
            }
          />
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
  const [controlaStock, setControlaStock] = useState(producto?.controla_stock ?? true);
  const [stockMin, setStockMin] = useState(producto ? String(producto.stock_min) : "0");
  const [stockInicial, setStockInicial] = useState("0");

  return (
    <Sheet title={producto ? "Editar producto" : "Nuevo producto"} onClose={onClose} pending={pending} error={error}
      onSave={() => run(() => saveProducto({
        id: producto?.id, nombre, precio: Number(precio) || 0, categoria, imagen_url: imagen,
        controla_stock: controlaStock, stock_min: Number(stockMin) || 0,
        stock_inicial: producto ? undefined : Number(stockInicial) || 0,
      }), onClose)}>
      <Campo label="Foto"><ImagePicker value={imagen} onChange={setImagen} /></Campo>
      <Campo label="Nombre"><input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} autoFocus /></Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Precio (Q)"><input value={precio} onChange={(e) => setPrecio(e.target.value)} inputMode="decimal" className={inputCls} /></Campo>
        <Campo label="Categoría"><input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="styling…" className={inputCls} /></Campo>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-elevated p-3">
        <input type="checkbox" checked={controlaStock} onChange={(e) => setControlaStock(e.target.checked)} className="size-5 accent-[var(--accent)]" />
        <span className="text-sm text-ink">Controlar stock de este producto</span>
      </label>

      {controlaStock && (
        <div className="grid grid-cols-2 gap-3">
          {producto ? (
            <Campo label="Stock actual">
              <div className={`flex min-h-[46px] items-center rounded-lg border border-line bg-surface px-3.5 text-base tabular-nums ${producto.stock <= producto.stock_min ? "text-warning" : "text-ink"}`}>
                {producto.stock}
              </div>
            </Campo>
          ) : (
            <Campo label="Stock inicial"><input value={stockInicial} onChange={(e) => setStockInicial(e.target.value)} inputMode="numeric" className={inputCls} /></Campo>
          )}
          <Campo label="Alerta bajo stock (mín.)"><input value={stockMin} onChange={(e) => setStockMin(e.target.value)} inputMode="numeric" className={inputCls} /></Campo>
        </div>
      )}
      {producto && controlaStock && (
        <p className="text-[12px] text-subtle">El stock se ajusta desde Inventario (entradas, salidas y conteos).</p>
      )}
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
          <Fila
            key={b.id}
            main={<p className={`min-w-0 flex-1 font-semibold ${b.activo ? "text-ink" : "text-subtle line-through"}`}>{b.nombre}</p>}
            actions={
              <>
                <ToggleActivo tabla="barberos" id={b.id} activo={b.activo} nombre={b.nombre} />
                <EditarBtn onClick={() => setEdit(b)} />
              </>
            }
          />
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
