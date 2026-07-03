import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/queries/staff";
import { getSucursalActiva, getSucursales } from "@/lib/sucursal";
import { getReporteClientes } from "@/lib/queries/reportes";
import { ReportesSucursalFiltro } from "@/components/admin/ReportesSucursalFiltro";
import { fmtQ } from "@/lib/format";
import { PRESETS, resolverRango } from "@/lib/rango";
import { ReportesTabs } from "@/components/admin/ReportesTabs";
import { RangoPersonalizado } from "@/components/admin/RangoPersonalizado";
import { Metric } from "@/components/admin/Metric";

export default async function ReporteClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string; desde?: string; hasta?: string; suc?: string }>;
}) {
  const staff = await getStaff();
  if (staff?.rol !== "admin" && staff?.rol !== "dueno") redirect("/admin");

  const sp = await searchParams;
  const { desde, hasta, label, preset, esCustom, qs: rangoQS } = resolverRango(sp);

  const sucursales = await getSucursales();
  const sucSel = sp.suc ?? "";
  const sucursalId = sucSel === "all" ? null
    : sucSel && sucursales.some((s) => s.id === sucSel) ? sucSel
    : await getSucursalActiva(staff);
  const sucQS = sucSel ? `&suc=${sucSel}` : "";

  const data = await getReporteClientes(desde, hasta, sucursalId);

  const retencion = data.activos > 0 ? Math.round((data.recurrentes / data.activos) * 100) : 0;
  const gastoTotal = Number(data.gasto_nuevos) + Number(data.gasto_recurrentes);
  const pctRecurrentes = gastoTotal > 0 ? Math.round((Number(data.gasto_recurrentes) / gastoTotal) * 100) : 0;

  return (
    <div>
      <h1 className="font-display text-[26px] font-bold tracking-[-0.01em] text-ink">Reportes</h1>
      <div className="mt-4"><ReportesTabs activo="clientes" rangoQS={rangoQS} suc={sucSel} /></div>

      {sucursales.length > 1 && (
        <div className="mb-3">
          <ReportesSucursalFiltro
            basePath="/admin/reportes/clientes"
            rangoQS={rangoQS}
            sucursales={sucursales.map((s) => ({ id: s.id, nombre: s.nombre }))}
            activaId={sucursalId}
          />
        </div>
      )}

      {/* Rango — control segmentado + personalizado */}
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Rango de fechas" className="inline-flex flex-wrap rounded-full border border-line bg-elevated p-1">
          {PRESETS.map((p) => {
            const activo = preset === p.key;
            return (
              <Link
                key={p.key}
                href={`/admin/reportes/clientes?rango=${p.key}${sucQS}`}
                role="tab"
                aria-selected={activo}
                className={`flex min-h-[42px] items-center rounded-full px-4 text-sm font-semibold transition-colors ${activo ? "bg-accent text-accent-ink shadow-[0_1px_6px_var(--accent-glow)]" : "text-muted hover:text-ink"}`}
              >
                {p.label}
              </Link>
            );
          })}
        </div>
        <RangoPersonalizado basePath="/admin/reportes/clientes" desde={desde} hasta={hasta} extraQS={sucQS} activo={esCustom} />
      </div>

      {/* Métricas */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric value={String(data.activos)} label="Clientes activos" accent />
        <Metric value={String(data.nuevos)} label="Nuevos" />
        <Metric value={`${retencion}%`} label="Retención" />
        <Metric value={fmtQ(Number(data.ticket_cliente))} label="Gasto/cliente" />
      </div>

      {/* Nuevos vs recurrentes */}
      <section className="mt-6">
        <h2 className="mb-3 font-display text-lg font-bold text-ink">Nuevos vs recurrentes <span className="text-sm font-normal text-subtle">· {label.toLowerCase()}</span></h2>
        <div className="rounded-2xl border border-line bg-elevated p-4">
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="text-muted">Recurrentes ({data.recurrentes})</span>
            <span className="font-semibold text-ink tabular-nums">{fmtQ(Number(data.gasto_recurrentes))}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-accent" style={{ width: `${pctRecurrentes}%` }} />
          </div>
          <div className="mt-3 flex items-baseline justify-between text-sm">
            <span className="text-muted">Nuevos ({data.nuevos})</span>
            <span className="font-semibold text-ink tabular-nums">{fmtQ(Number(data.gasto_nuevos))}</span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-muted" style={{ width: `${100 - pctRecurrentes}%` }} />
          </div>
          <p className="mt-3 text-[13px] text-subtle">
            {pctRecurrentes}% de los ingresos vienen de clientes que ya te conocían.
          </p>
        </div>
      </section>

      {/* Top clientes */}
      <section className="mt-6">
        <h2 className="mb-3 font-display text-lg font-bold text-ink">Top clientes por gasto</h2>
        {data.top_clientes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">Sin ventas en este periodo.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.top_clientes.map((c, i) => (
              <div key={c.numero} className="flex items-center gap-4 rounded-xl border border-line bg-elevated px-4 py-3">
                <span className="w-5 text-center text-sm font-semibold text-subtle tabular-nums">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{c.nombre}</p>
                  <p className="text-[13px] text-muted">#{String(c.numero).padStart(5, "0")} · {c.visitas} visita{c.visitas === 1 ? "" : "s"}</p>
                </div>
                <span className="font-display text-lg font-bold text-accent tabular-nums">{fmtQ(Number(c.total))}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
