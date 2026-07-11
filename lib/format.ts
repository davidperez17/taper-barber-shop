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

/** "Q1,250" */
export function fmtQ(n: number): string {
  return `Q${Math.round(n).toLocaleString("es-GT")}`;
}
