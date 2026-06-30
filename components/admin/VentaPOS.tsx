"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { recordVenta, type VentaItemInput, type VentaInput } from "@/app/admin/actions";
import { enqueueVenta } from "@/lib/offline";
import { computeLoyalty, memberId, TIER_LABEL, TIER_SURFACE, type LoyaltyRaw } from "@/lib/loyalty";
import { fmtDiaMes, fmtQ } from "@/lib/format";
import type { Servicio, Producto, Barbero } from "@/lib/types";
import { IconCheck } from "@/components/icons";
import { Thumb } from "@/components/admin/Thumb";

interface Props {
  cliente: { id: string; nombre: string; numero: number };
  loyaltyRaw: LoyaltyRaw & { ultima_visita: string | null };
  servicios: Servicio[];
  productos: Producto[];
  barberos: Barbero[];
}

type MetodoPago = "efectivo" | "tarjeta" | "transferencia";

export function VentaPOS({ cliente, loyaltyRaw, servicios, productos, barberos }: Props) {
  const router = useRouter();
  const loyalty = computeLoyalty(loyaltyRaw);

  const [serv, setServ] = useState<Record<string, number>>({});
  const [prod, setProd] = useState<Record<string, number>>({});
  const [barbero, setBarbero] = useState<string>(barberos[0]?.id ?? "");
  const [metodo, setMetodo] = useState<MetodoPago>("efectivo");
  const [canjear, setCanjear] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [pendiente, setPendiente] = useState(false);

  const inc = (m: Record<string, number>, set: (v: Record<string, number>) => void, id: string, d: number) => {
    const next = { ...m, [id]: Math.max(0, (m[id] ?? 0) + d) };
    if (next[id] === 0) delete next[id];
    set(next);
  };

  const hayCorteEnCarrito = useMemo(
    () => servicios.some((s) => s.cuenta_lealtad && (serv[s.id] ?? 0) > 0),
    [serv, servicios],
  );

  const { items, total } = useMemo(() => {
    const it: VentaItemInput[] = [];
    let usadoGratis = false;
    for (const s of servicios) {
      const q = serv[s.id] ?? 0;
      if (q <= 0) continue;
      let precio = Number(s.precio);
      // Aplicar el corte gratis al primer servicio de lealtad.
      if (canjear && hayCorteEnCarrito && s.cuenta_lealtad && !usadoGratis) {
        precio = 0;
        usadoGratis = true;
      }
      it.push({ tipo: "servicio", servicio_id: s.id, nombre: s.nombre, precio, cantidad: q });
    }
    for (const p of productos) {
      const q = prod[p.id] ?? 0;
      if (q <= 0) continue;
      it.push({ tipo: "producto", producto_id: p.id, nombre: p.nombre, precio: Number(p.precio), cantidad: q });
    }
    const tot = it.reduce((s, i) => s + i.precio * i.cantidad, 0);
    return { items: it, total: tot };
  }, [serv, prod, canjear, hayCorteEnCarrito, servicios, productos]);

  async function confirmar() {
    setSubmitting(true);
    setError(null);
    const payload: VentaInput = {
      clienteId: cliente.id,
      barberoId: barbero || null,
      metodo,
      canjear: canjear && hayCorteEnCarrito,
      items,
    };

    // Offline-first: sin red, encolar y sincronizar al reconectar.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      enqueueVenta(payload);
      setSubmitting(false);
      setPendiente(true);
      setDone(total);
      return;
    }

    const res = await recordVenta(payload);
    setSubmitting(false);
    if (!res.ok) {
      // Falla de red tras el intento: guardar local en vez de perder la venta.
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        enqueueVenta(payload);
        setPendiente(true);
        setDone(total);
        return;
      }
      setError(res.error);
      return;
    }
    setDone(res.total);
  }

  // ── Pantalla de éxito ─────────────────────────────────────────
  if (done !== null) {
    return (
      <div className="animate-fade-up flex flex-col items-center pt-10 text-center">
        <div className={`mb-5 flex size-20 items-center justify-center rounded-full ${pendiente ? "bg-warning/15 text-warning" : "bg-success-dim text-success"}`}>
          <IconCheck size={44} />
        </div>
        <h1 className="font-display text-[28px] font-bold text-ink">
          {pendiente ? "Venta guardada" : "Venta registrada"}
        </h1>
        <p className={`mt-1 text-lg font-semibold ${pendiente ? "text-warning" : "text-accent"}`}>{fmtQ(done)}</p>
        <p className="mt-2 max-w-[280px] text-sm text-muted">
          {pendiente
            ? "Sin conexión: se sincronizará automáticamente al recuperar la red."
            : `${cliente.nombre} suma su corte. El progreso ya se refleja en su app.`}
        </p>
        <div className="mt-7 flex w-full max-w-[320px] flex-col gap-3">
          <button
            onClick={() => router.push("/admin")}
            className="min-h-[52px] rounded-full bg-accent font-semibold text-accent-ink"
          >
            Nueva venta
          </button>
          <button
            onClick={() => router.refresh()}
            className="min-h-11 text-sm text-muted hover:text-ink"
          >
            Ver ficha del cliente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up pb-28">
      {/* Ficha del cliente */}
      <div className={`${TIER_SURFACE[loyalty.tier]} rounded-2xl border border-white/15 p-4`} style={{ boxShadow: "0 8px 30px var(--tier-glow)" }}>
        <div className="flex items-start justify-between" style={{ color: "var(--tier-ink)" }}>
          <div>
            <p className="font-display text-[22px] font-extrabold leading-none">{cliente.nombre}</p>
            <p className="mt-1 text-[13px] opacity-80">
              {memberId(cliente.numero)} · {TIER_LABEL[loyalty.tier]} · Últ. {fmtDiaMes(loyaltyRaw.ultima_visita)}
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

      {loyalty.recompensaDisponible && (
        <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-success/40 bg-success-dim p-3.5">
          <input type="checkbox" checked={canjear} onChange={(e) => setCanjear(e.target.checked)} className="size-5 accent-[var(--success)]" />
          <span className="text-sm text-ink">
            Canjear corte gratis en esta venta
            {canjear && !hayCorteEnCarrito && <span className="block text-xs text-warning">Agrega un corte para aplicarlo.</span>}
          </span>
        </label>
      )}

      {/* Servicios */}
      <h2 className="mb-2.5 mt-6 font-display text-lg font-bold text-ink">Servicios</h2>
      <div className="grid grid-cols-2 gap-2.5">
        {servicios.map((s) => {
          const q = serv[s.id] ?? 0;
          return (
            <CatItem key={s.id} nombre={s.nombre} precio={Number(s.precio)} imagen={s.imagen_url} qty={q}
              onAdd={() => inc(serv, setServ, s.id, 1)} onSub={() => inc(serv, setServ, s.id, -1)} />
          );
        })}
      </div>

      {/* Productos */}
      <h2 className="mb-2.5 mt-6 font-display text-lg font-bold text-ink">Productos</h2>
      <div className="grid grid-cols-2 gap-2.5">
        {productos.map((p) => {
          const q = prod[p.id] ?? 0;
          return (
            <CatItem key={p.id} nombre={p.nombre} precio={Number(p.precio)} imagen={p.imagen_url} qty={q}
              onAdd={() => inc(prod, setProd, p.id, 1)} onSub={() => inc(prod, setProd, p.id, -1)} />
          );
        })}
      </div>

      {/* Barbero + método */}
      <h2 className="mb-2.5 mt-6 font-display text-lg font-bold text-ink">Detalles</h2>
      <div className="flex flex-wrap gap-2">
        {barberos.map((b) => (
          <Chip key={b.id} active={barbero === b.id} onClick={() => setBarbero(b.id)}>{b.nombre}</Chip>
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {(["efectivo", "tarjeta", "transferencia"] as MetodoPago[]).map((m) => (
          <Chip key={m} active={metodo === m} onClick={() => setMetodo(m)}>
            {m[0].toUpperCase() + m.slice(1)}
          </Chip>
        ))}
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}

      {/* Barra fija: total + confirmar */}
      <div className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] border-t border-line bg-elevated/95 px-5 py-3.5 backdrop-blur">
        <div className="mx-auto flex max-w-[640px] items-center gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-subtle">Total</p>
            <p className="font-display text-2xl font-bold text-ink">{fmtQ(total)}</p>
          </div>
          <button
            onClick={confirmar}
            disabled={submitting || items.length === 0}
            className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-full bg-accent text-base font-semibold text-accent-ink shadow-[0_0_28px_var(--accent-glow)] transition-all active:scale-[0.98] disabled:opacity-40"
          >
            {submitting && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            Confirmar venta
          </button>
        </div>
      </div>
    </div>
  );
}

function CatItem({ nombre, precio, imagen, qty, onAdd, onSub }: { nombre: string; precio: number; imagen: string | null; qty: number; onAdd: () => void; onSub: () => void }) {
  const active = qty > 0;
  return (
    <div className={`rounded-xl border p-3 transition-colors ${active ? "border-accent/50 bg-accent-dim" : "border-line bg-elevated"}`}>
      <button type="button" onClick={onAdd} className="flex w-full items-center gap-2.5 text-left">
        <Thumb src={imagen} nombre={nombre} size={36} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink">{nombre}</span>
          <span className="block text-[13px] text-muted">{fmtQ(precio)}</span>
        </span>
      </button>
      {active && (
        <div className="mt-2 flex items-center justify-between">
          <button onClick={onSub} aria-label={`Quitar ${nombre}`} className="flex size-11 items-center justify-center rounded-md border border-line text-lg text-ink active:bg-surface">−</button>
          <span className="text-sm font-semibold text-ink">{qty}</span>
          <button onClick={onAdd} aria-label={`Agregar ${nombre}`} className="flex size-11 items-center justify-center rounded-md border border-line text-lg text-ink active:bg-surface">+</button>
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-full border px-4 text-sm font-medium transition-colors ${active ? "border-accent bg-accent text-accent-ink" : "border-line bg-elevated text-muted hover:text-ink"}`}
    >
      {children}
    </button>
  );
}
