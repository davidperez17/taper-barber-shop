const PAGINA = 1000; // tope por defecto de filas de PostgREST

/**
 * Trae todas las filas de un select paginando con range(): un select simple
 * se corta en silencio en 1000 filas. `pagina` debe incluir un order estable.
 */
export async function todasLasFilas<T>(
  pagina: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null }>,
): Promise<T[]> {
  let filas: T[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data } = await pagina(desde, desde + PAGINA - 1);
    filas = filas.concat(data ?? []);
    if (!data || data.length < PAGINA) return filas;
  }
}
