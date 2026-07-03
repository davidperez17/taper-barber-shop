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

// ── Rango personalizado ──────────────────────────────────────────────
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Valida un YYYY-MM-DD real (existe como fecha y round-trippea). */
export function esFechaISO(s: string | undefined): s is string {
  if (!s || !ISO.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && ymd(d) === s;
}

function fechaCorta(s: string): string {
  const [, m, d] = s.split("-").map(Number);
  return `${d} ${MESES[m - 1]}`;
}

export type RangoResuelto = {
  desde: string;
  hasta: string;
  label: string;
  preset: Preset | null; // null cuando es personalizado
  esCustom: boolean;
  qs: string; // fragmento canónico para links: "rango=custom&desde=..&hasta=.." o "rango=30d"
};

/**
 * Resuelve el rango efectivo desde los searchParams.
 * `rango=custom` con desde/hasta válidos → rango personalizado (se ordena si vienen al revés);
 * cualquier otro caso cae en los presets.
 */
export function resolverRango(sp: { rango?: string; desde?: string; hasta?: string }): RangoResuelto {
  if (sp.rango === "custom" && esFechaISO(sp.desde) && esFechaISO(sp.hasta)) {
    // Comparación lexicográfica válida para YYYY-MM-DD.
    const [desde, hasta] = sp.desde <= sp.hasta ? [sp.desde, sp.hasta] : [sp.hasta, sp.desde];
    const label = desde === hasta ? fechaCorta(desde) : `${fechaCorta(desde)} – ${fechaCorta(hasta)}`;
    return { desde, hasta, label, preset: null, esCustom: true, qs: `rango=custom&desde=${desde}&hasta=${hasta}` };
  }
  const preset = normalizarPreset(sp.rango);
  return { ...rango(preset), preset, esCustom: false, qs: `rango=${preset}` };
}
