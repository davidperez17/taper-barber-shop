import Link from "next/link";
import type { Preset } from "@/lib/rango";

export function ReportesTabs({ activo, preset }: { activo: "ventas" | "clientes"; preset: Preset }) {
  const tabs = [
    { key: "ventas", label: "Ventas", href: `/admin/reportes?rango=${preset}` },
    { key: "clientes", label: "Clientes", href: `/admin/reportes/clientes?rango=${preset}` },
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
