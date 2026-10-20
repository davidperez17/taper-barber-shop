const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MESES_LARGO = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// Zona de negocio: día/mes/año deben calcularse SIEMPRE en Guatemala, no en la
// zona del server (UTC en Vercel) ni la del navegador. Si no, el mismo ISO cae
// en fechas distintas server vs cliente y la hidratación falla (React #418).
const TZ = "America/Guatemala";

/** Y/M/D estables en zona de negocio (m es 1..12). */
function partesGT(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date(iso))
    .split("-")
    .map(Number);
  return { y, m, d };
}

/** "20 Jun" */
export function fmtDiaMes(iso: string | null): string {
  if (!iso) return "—";
  const { m, d } = partesGT(iso);
  return `${d} ${MESES[m - 1]}`;
}

/** "Junio 2026" — para agrupar historial */
export function fmtMesAnio(iso: string): string {
  const { y, m } = partesGT(iso);
  return `${MESES_LARGO[m - 1]} ${y}`;
}

/** "Mar 2025" */
export function fmtMesCorto(iso: string | null): string {
  if (!iso) return "—";
  const { y, m } = partesGT(iso);
  return `${MESES[m - 1]} ${y}`;
}

/** "20 Jun 2026" — fecha exacta con año */
export function fmtFecha(iso: string | null): string {
  if (!iso) return "—";
  const { y, m, d } = partesGT(iso);
  return `${d} ${MESES[m - 1]} ${y}`;
}

/** "20 de julio de 2026" — fecha larga en prosa */
export function fmtFechaLarga(iso: string | null): string {
  if (!iso) return "—";
  const { y, m, d } = partesGT(iso);
  return `${d} de ${MESES_LARGO[m - 1].toLowerCase()} de ${y}`;
}

/** "Q1,250" · "Q72.25" · "-Q0.40" — centavos solo si los hay. */
export function fmtQ(n: number): string {
  const c = Math.round(n * 100) / 100;
  const abs = Math.abs(c);
  const dec = Number.isInteger(abs) ? 0 : 2;
  const txt = abs.toLocaleString("es-GT", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return `${c < 0 ? "-" : ""}Q${txt}`;
}

/** true si dos montos son iguales al centavo (evita 0.1+0.2 !== 0.3). */
export function mismoMonto(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.005;
}

/**
 * Monto escrito a mano → número, o null si no es válido.
 * Acepta "150", "150.50", "150,50" (coma decimal) y "1,250" / "1,250.50"
 * (coma de miles, formato es-GT).
 */
export function parseMonto(s: string): number | null {
  let t = s.trim().replace(/^Q\s*/i, "").replace(/\s/g, "");
  if (!t) return null;
  if (t.includes(".") || /^\d{1,3}(,\d{3})+$/.test(t)) t = t.replace(/,/g, "");
  else t = t.replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}
