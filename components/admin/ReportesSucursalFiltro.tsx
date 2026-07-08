import Link from "next/link";

/** Filtro de sucursal para reportes: "Todas" + cada sucursal activa. */
export function ReportesSucursalFiltro({
  basePath, rangoQS, extraQS = "", sucursales, activaId,
}: {
  basePath: string;
  rangoQS: string; // fragmento canónico del rango: "rango=30d" o "rango=custom&desde=..&hasta=.."
  extraQS?: string;
  sucursales: { id: string; nombre: string }[];
  activaId: string | null; // resuelta; null = todas
}) {
  const activaKey = activaId ?? "all";
  const pill = (o: { id: string; nombre: string }, ancho: string) => {
    const activo = o.id === activaKey;
    return (
      <Link
        key={o.id}
        href={`${basePath}?${rangoQS}${extraQS}&suc=${o.id}`}
        role="tab"
        aria-selected={activo}
        className={`flex min-h-[38px] items-center justify-center rounded-full px-3.5 text-center text-[13px] font-semibold transition-colors ${ancho} ${activo ? "bg-accent text-accent-ink shadow-[0_1px_6px_var(--accent-glow)]" : "text-muted hover:text-ink"}`}
      >
        {o.nombre}
      </Link>
    );
  };
  return (
    <div role="tablist" aria-label="Sucursal del reporte" className="mt-3 flex flex-col gap-1 rounded-[22px] border border-line bg-elevated p-1">
      {/* "Todas" ocupa todo el ancho del contenedor */}
      {pill({ id: "all", nombre: "Todas las sucursales" }, "w-full")}
      {/* Sucursales: píldoras a la par que reparten el ancho y bajan de fila si no caben */}
      {sucursales.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {sucursales.map((s) => pill(s, "min-w-0 flex-1 basis-[calc(50%-0.125rem)]"))}
        </div>
      )}
    </div>
  );
}
