// Cola offline de ventas (localStorage). Se sincroniza al reconectar.
import type { VentaInput } from "@/app/admin/actions";

const KEY = "taper_venta_queue";

/** Venta encolada + motivo del último rechazo del servidor (si lo hubo). */
export type VentaEncolada = VentaInput & { rechazo?: string };

function leer(): VentaEncolada[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as VentaEncolada[];
  } catch {
    return [];
  }
}

function escribir(q: VentaEncolada[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(q));
}

export function enqueueVenta(v: VentaInput): void {
  const q = leer();
  // Mismo clientId = misma venta (reintento): no duplicar en la cola.
  if (v.clientId && q.some((x) => x.clientId === v.clientId)) return;
  q.push(v);
  escribir(q);
}

export function getQueue(): VentaEncolada[] {
  const q = leer();
  // Ventas encoladas antes de la idempotencia: darles id para poder quitarlas.
  if (q.some((v) => !v.clientId)) {
    const conId = q.map((v) => (v.clientId ? v : { ...v, clientId: crypto.randomUUID() }));
    escribir(conId);
    return conId;
  }
  return q;
}

/**
 * Quita una venta por clientId releyendo la cola: lo encolado mientras se
 * sincronizaba no se pisa (antes setQueue(pendientes) lo borraba).
 */
export function quitarDeCola(clientId: string): void {
  escribir(leer().filter((v) => v.clientId !== clientId));
}

export function marcarRechazo(clientId: string, rechazo: string): void {
  escribir(leer().map((v) => (v.clientId === clientId ? { ...v, rechazo } : v)));
}

/** Descarta las ventas que el servidor rechazó (p. ej. canje fuera de horario). */
export function descartarRechazadas(): void {
  escribir(leer().filter((v) => !v.rechazo));
}
