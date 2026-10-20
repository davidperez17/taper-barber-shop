/**
 * Arma el filtro `.or()` de PostgREST para buscar clientes por nombre/teléfono.
 *
 * El término va crudo dentro de la sintaxis del filtro: una coma o paréntesis
 * lo rompen (o lo convierten en otra condición), y `%`/`*` actúan como comodín.
 * Se quitan esos caracteres (y `\` y comillas) antes de interpolar.
 * Devuelve null si tras sanear no queda un término útil (< 2 caracteres).
 * También busca por número de cliente si el término lo parece (#00012, 12).
 */
export function filtroClientes(termino: string): string | null {
  const term = termino.replace(/[,()*\\%"]/g, " ").replace(/\s+/g, " ").trim();
  if (term.length < 2) return null;
  // Teléfonos se guardan como 8 dígitos sin +502 (0037): quitar el prefijo.
  let digits = term.replace(/\D/g, "");
  if (digits.length > 8 && digits.startsWith("502")) digits = digits.slice(3);
  const partes = [`nombre.ilike.%${term}%`];
  if (digits.length >= 3) partes.unshift(`telefono.ilike.%${digits}%`);
  // Número de cliente (#00012 o 12): sin red, /offline le muestra al cliente
  // su número para que el cajero lo busque (el QR rotativo necesita red).
  const num = numeroCliente(term);
  if (num !== null) partes.unshift(`numero.eq.${num}`);
  return partes.join(",");
}

/** "#00012" / "12" → 12; null si el término no es un número de cliente. */
export function numeroCliente(termino: string): number | null {
  const m = /^#?\s*(\d{1,7})$/.exec(termino.trim());
  return m ? Number(m[1]) : null;
}
