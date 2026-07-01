import Link from "next/link";

/** Filtro de sucursal para reportes: "Todas" + cada sucursal activa. */
export function ReportesSucursalFiltro({
  basePath, rango, extraQS = "", sucursales, activaId,
}: {
  basePath: string;
  rango: string;
  extraQS?: string;
  sucursales: { id: string; nombre: string }[];
  activaId: string | null; // resuelta; null = todas
}) {
  const opciones = [{ id: "all", nombre: "Todas las sucursales" }, ...sucursales];
  const activaKey = activaId ?? "all";
  return (
    <div role="tablist" aria-label="Sucursal del reporte" className="mt-3 inline-flex flex-wrap gap-1 rounded-full border border-line bg-elevated p-1">
      {opciones.map((o) => {
        const activo = o.id === activaKey;
        return (
          <Link
            key={o.id}
            href={`${basePath}?rango=${rango}${extraQS}&suc=${o.id}`}
            role="tab"
            aria-selected={activo}
            className={`flex min-h-[38px] items-center rounded-full px-3.5 text-[13px] font-semibold transition-colors ${activo ? "bg-accent text-accent-ink shadow-[0_1px_6px_var(--accent-glow)]" : "text-muted hover:text-ink"}`}
          >
            {o.nombre}
          </Link>
        );
      })}
    </div>
  );
}
