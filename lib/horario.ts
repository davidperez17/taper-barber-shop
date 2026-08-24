// Ventana en la que se puede canjear el corte gratis. Espejo en JS de
// `canje_abierto()` (SQL, 0032): la verdad la fija la DB, esto solo evita
// que el POS ofrezca un canje que el servidor va a rechazar.
//
// Se evalúa SIEMPRE en la zona del negocio, no en la del dispositivo ni la
// del server (UTC en Vercel) — mismo criterio que lib/format.ts.
const TZ = "America/Guatemala";

const ABRE = 10 * 60 + 30; // 10:30
const CIERRA = 19 * 60 + 30; // 19:30, inclusive

/** Copy único del horario, para no repetirlo en cada pantalla. */
export const CANJE_HORARIO = "lunes a viernes, de 10:30 a 19:30";

const FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** ¿Se puede canjear la recompensa ahora? L–V, 10:30–19:30 en Guatemala. */
export function canjeAbierto(d: Date = new Date()): boolean {
  const p: Record<string, string> = {};
  for (const { type, value } of FMT.formatToParts(d)) p[type] = value;
  if (p.weekday === "Sat" || p.weekday === "Sun") return false;
  const minutos = Number(p.hour) * 60 + Number(p.minute);
  return minutos >= ABRE && minutos <= CIERRA;
}
