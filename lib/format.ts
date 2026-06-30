const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MESES_LARGO = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

/** "20 Jun" */
export function fmtDiaMes(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

/** "Junio 2026" — para agrupar historial */
export function fmtMesAnio(iso: string): string {
  const d = new Date(iso);
  return `${MESES_LARGO[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Mar 2025" */
export function fmtMesCorto(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Q1,250" */
export function fmtQ(n: number): string {
  return `Q${Math.round(n).toLocaleString("es-GT")}`;
}
