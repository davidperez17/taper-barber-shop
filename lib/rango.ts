// Rango de fechas para reportes, en calendario de Guatemala.
// Anclado a medianoche UTC del día GT para que la aritmética por días no se desfase.

export const PRESETS = [
  { key: "hoy", label: "Hoy" },
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "mes", label: "Este mes" },
] as const;

export type Preset = (typeof PRESETS)[number]["key"];

export const ymd = (d: Date) => d.toISOString().slice(0, 10);

export function hoyGT(): Date {
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guatemala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${s}T00:00:00Z`);
}

export function normalizarPreset(v: string | undefined): Preset {
  return (PRESETS.some((p) => p.key === v) ? v : "30d") as Preset;
}

export function rango(preset: Preset): { desde: string; hasta: string; label: string } {
  const hoy = hoyGT();
  const hasta = ymd(hoy);
  if (preset === "hoy") return { desde: hasta, hasta, label: "Hoy" };
  if (preset === "7d") {
    const d = new Date(hoy); d.setUTCDate(d.getUTCDate() - 6);
    return { desde: ymd(d), hasta, label: "Últimos 7 días" };
  }
  if (preset === "mes") {
    const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));
    return { desde: ymd(d), hasta, label: "Este mes" };
  }
  const d = new Date(hoy); d.setUTCDate(d.getUTCDate() - 29);
  return { desde: ymd(d), hasta, label: "Últimos 30 días" };
}
