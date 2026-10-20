/**
 * Arma el filtro `.or()` de PostgREST para buscar clientes por nombre/teléfono.
 *
 * El término va crudo dentro de la sintaxis del filtro: una coma o paréntesis
 * lo rompen (o lo convierten en otra condición), y `%`/`*` actúan como comodín.
 * Se quitan esos caracteres (y `\` y comillas) antes de interpolar.
 * Devuelve null si tras sanear no queda un término útil (< 2 caracteres).
 */
export function filtroClientes(termino: string): string | null {
  const term = termino.replace(/[,()*\\%"]/g, " ").replace(/\s+/g, " ").trim();
  if (term.length < 2) return null;
  // Teléfonos se guardan como 8 dígitos sin +502 (0037): quitar el prefijo.
  let digits = term.replace(/\D/g, "");
  if (digits.length > 8 && digits.startsWith("502")) digits = digits.slice(3);
  return digits.length >= 3
    ? `telefono.ilike.%${digits}%,nombre.ilike.%${term}%`
    : `nombre.ilike.%${term}%`;
}
