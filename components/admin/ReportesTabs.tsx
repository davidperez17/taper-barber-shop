import Link from "next/link";

export function ReportesTabs({ activo, rangoQS, suc = "" }: { activo: "ventas" | "clientes"; rangoQS: string; suc?: string }) {
  const q = suc ? `&suc=${suc}` : "";
  const tabs = [
    { key: "ventas", label: "Ventas", href: `/admin/reportes?${rangoQS}${q}` },
    { key: "clientes", label: "Clientes", href: `/admin/reportes/clientes?${rangoQS}${q}` },
  ] as const;
  return (
    <div role="tablist" aria-label="Tipo de reporte" className="mb-4 inline-flex rounded-full border border-line bg-elevated p-1">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          role="tab"
          aria-selected={activo === t.key}
          className={`flex min-h-9 items-center rounded-full px-4 text-sm font-semibold transition-colors ${activo === t.key ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"}`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
