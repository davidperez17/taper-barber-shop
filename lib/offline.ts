// Cola offline de ventas (localStorage). Se sincroniza al reconectar.
import type { VentaInput } from "@/app/admin/actions";

const KEY = "taper_venta_queue";

export function enqueueVenta(v: VentaInput): void {
  if (typeof window === "undefined") return;
  const q = getQueue();
  q.push(v);
  localStorage.setItem(KEY, JSON.stringify(q));
}

export function getQueue(): VentaInput[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as VentaInput[];
  } catch {
    return [];
  }
}

export function setQueue(q: VentaInput[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(q));
}

export function queueLength(): number {
  return getQueue().length;
}
