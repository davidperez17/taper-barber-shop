// Promo de Halloween 2026: el 31-oct todos los cortes incluyen mascarilla de
// carbón gratis. Es solo un anuncio (no toca POS ni DB). Se anuncia desde el
// deploy hasta el mismo 31; desde el 1-nov no se muestra nada → borrable.
//
// El día se evalúa en la zona del negocio, no en la del dispositivo ni la del
// server (UTC en Vercel) — mismo criterio que lib/horario.ts.

export const HALLOWEEN = "2026-10-31";

/** Clave localStorage: guarda el día (GT) en que el cliente ya vio el splash. */
export const HALLOWEEN_KEY = "taper_halloween_2026";

const FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Guatemala",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha en calendario de Guatemala (YYYY-MM-DD). */
export function diaGT(d: Date = new Date()): string {
  return FMT.format(d);
}

export type FaseHalloween = "antes" | "hoy";

/** "antes" hasta el 30-oct, "hoy" el 31-oct, null desde el 1-nov. */
export function faseHalloween(d: Date = new Date()): FaseHalloween | null {
  const hoy = diaGT(d);
  if (hoy < HALLOWEEN) return "antes";
  if (hoy === HALLOWEEN) return "hoy";
  return null;
}

/** Avisos push + bandeja de la promo, disparados por el cron (cada 15 min). */
export interface AvisoHalloween {
  id: string; // idempotencia en notificaciones_log (tipo `halloween_2026_${id}`)
  dia: string; // YYYY-MM-DD en Guatemala
  hora: number; // minutos desde medianoche GT a partir de los que sale
  titulo: string;
  cuerpo: string;
}

export const AVISOS_HALLOWEEN: AvisoHalloween[] = [
  {
    id: "anuncio",
    dia: "2026-10-24",
    hora: 10 * 60,
    titulo: "🎃 Halloween en Taper",
    cuerpo: "Este sábado 31, todos los cortes incluyen mascarilla de carbón GRATIS. ¡Aparta tu día!",
  },
  {
    id: "vispera",
    dia: "2026-10-30",
    hora: 17 * 60,
    titulo: "🎃 Mañana es Halloween",
    cuerpo: "Mañana sábado 31 tu corte incluye aplicación de mascarilla de carbón gratis. ¡Te esperamos!",
  },
  {
    id: "dia",
    dia: HALLOWEEN,
    hora: 8 * 60,
    titulo: "🎃 ¡Hoy es Halloween en Taper!",
    cuerpo: "Solo hoy: mascarilla de carbón gratis en todos los cortes.",
  },
];

const FMT_HORA = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Guatemala",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Avisos que tocan ahora: su día (GT) es hoy y ya pasó su hora. */
export function avisosHalloweenDelMomento(d: Date = new Date()): AvisoHalloween[] {
  const hoy = diaGT(d);
  const p: Record<string, string> = {};
  for (const { type, value } of FMT_HORA.formatToParts(d)) p[type] = value;
  const minutos = Number(p.hour) * 60 + Number(p.minute);
  return AVISOS_HALLOWEEN.filter((a) => a.dia === hoy && minutos >= a.hora);
}
