import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/queries/staff";
import { getReporte, getHeatmapHorario } from "@/lib/queries/reportes";
import { fmtQ } from "@/lib/format";
import { TendenciaChart, TopBars } from "@/components/admin/Charts";
import { BusyPeriods, type PeriodoBP } from "@/components/admin/BusyPeriods";
import { ExportCSV } from "@/components/admin/ExportCSV";

const BP_DIAS: Record<PeriodoBP, number> = { semana: 7, mes: 30, anio: 365 };

const PRESETS = [
  { key: "hoy", label: "Hoy" },
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "mes", label: "Este mes" },
] as const;
type Preset = (typeof PRESETS)[number]["key"];

// Fechas en calendario de Guatemala (la DB agrupa en America/Guatemala, ver 0006/0005).
// Anclamos a medianoche UTC del día GT para que la aritmética por días no se desfase.
const ymd = (d: Date) => d.toISOString().slice(0, 10);

function hoyGT(): Date {
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guatemala", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  return new Date(`${s}T00:00:00Z`);
}

function rango(preset: Preset): { desde: string; hasta: string; label: string } {
  const hoy = hoyGT();
  const hasta = ymd(hoy);
  if (preset === "hoy") return { desde: hasta, hasta, label: "Hoy" };
  if (preset === "7d") {
    const d = new Date(hoy); d.setUTCDate(d.getUTCDate() - 6);
    return { desde: ymd(d), hasta, label: "Últimos 7 días" };
  }
  if (preset === "mes") {
    const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));
    return { desde: ymd(d), hasta, label: "Este mes" };
  }
  const d = new Date(hoy); d.setUTCDate(d.getUTCDate() - 29);
  return { desde: ymd(d), hasta, label: "Últimos 30 días" };
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string; bp?: string }>;
}) {
  const staff = await getStaff();
  if (staff?.rol !== "admin" && staff?.rol !== "dueno") redirect("/admin");

  const sp = await searchParams;
  const preset = (PRESETS.some((p) => p.key === sp.rango) ? sp.rango : "30d") as Preset;
  const { desde, hasta, label } = rango(preset);

  // Busy Periods (día × hora) con su propio periodo: semana / mes / año.
  const bp = (["semana", "mes", "anio"].includes(sp.bp ?? "") ? sp.bp : "mes") as PeriodoBP;
  const bpInicio = hoyGT(); bpInicio.setUTCDate(bpInicio.getUTCDate() - BP_DIAS[bp]);

  const [data, heatCells] = await Promise.all([
    getReporte(desde, hasta),
    getHeatmapHorario(ymd(bpInicio), hasta),
  ]);

  return (
    <div className="animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[26px] font-bold tracking-[-0.01em] text-ink">Reportes</h1>
        <ExportCSV reporte={data} rangoLabel={label} />
      </div>

      {/* Rango — control segmentado */}
      <div role="tablist" aria-label="Rango de fechas" className="mt-4 inline-flex flex-wrap rounded-full border border-line bg-elevated p-1">
        {PRESETS.map((p) => {
          const activo = preset === p.key;
          return (
            <Link
              key={p.key}
              href={`/admin/reportes?rango=${p.key}&bp=${bp}`}
              role="tab"
              aria-selected={activo}
              className={`flex min-h-[42px] items-center rounded-full px-4 text-sm font-semibold transition-colors ${activo ? "bg-accent text-accent-ink shadow-[0_1px_6px_var(--accent-glow)]" : "text-muted hover:text-ink"}`}
            >
              {p.label}
            </Link>
          );
        })}
      </div>

      {/* Métricas */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <Metric value={fmtQ(data.total)} label="Ventas" accent />
        <Metric value={String(data.num)} label="N° ventas" />
        <Metric value={fmtQ(data.ticket)} label="Ticket prom." />
      </div>

      {/* Busy Periods — día de semana × hora */}
      <section className="mt-6">
        <h2 className="mb-3 font-display text-lg font-bold text-ink">Horarios concurridos</h2>
        <div className="rounded-2xl border border-line bg-elevated p-4">
          <BusyPeriods cells={heatCells} periodo={bp} rango={preset} />
        </div>
      </section>

      {/* Tendencia */}
      <section className="mt-6">
        <h2 className="mb-3 font-display text-lg font-bold text-ink">Tendencia de ventas <span className="text-sm font-normal text-subtle">· {label.toLowerCase()}</span></h2>
        <div className="rounded-2xl border border-line bg-elevated p-4">
          <TendenciaChart data={data.por_dia} />
        </div>
      </section>

      {/* Tops */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <TopCard titulo="Top servicios" rows={data.top_servicios} />
        <TopCard titulo="Top productos" rows={data.top_productos} />
        <TopCard titulo="Top barberos" rows={data.top_barberos} />
      </div>
    </div>
  );
}

function Metric({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-elevated p-4">
      <p className={`font-display text-[24px] font-extrabold leading-none tabular-nums ${accent ? "text-accent" : "text-ink"}`}>{value}</p>
      <p className="mt-1.5 text-[13px] font-medium text-muted">{label}</p>
    </div>
  );
}

function TopCard({ titulo, rows }: { titulo: string; rows: { nombre: string; n: number; monto: number }[] }) {
  return (
    <div className="rounded-2xl border border-line bg-elevated p-4">
      <h3 className="mb-3 text-sm font-semibold text-ink">{titulo}</h3>
      <TopBars rows={rows} />
    </div>
  );
}
