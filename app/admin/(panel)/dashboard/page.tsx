import { redirect } from "next/navigation";
import { getStaff } from "@/lib/queries/staff";
import { getDashboardMetrics } from "@/lib/queries/admin";
import { fmtQ } from "@/lib/format";

export default async function DashboardPage() {
  const staff = await getStaff();
  if (staff?.rol !== "dueno" && staff?.rol !== "admin") redirect("/admin");

  const m = await getDashboardMetrics();

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-[26px] font-bold tracking-[-0.01em] text-ink">Dashboard</h1>
      <p className="mb-5 mt-1 text-sm text-muted">Estado del negocio en tiempo real.</p>

      <div className="grid grid-cols-2 gap-3">
        <Metric value={fmtQ(m.ventas_hoy)} label="Ventas hoy" sub={`${m.num_ventas_hoy} ventas`} accent />
        <Metric value={fmtQ(m.ventas_mes)} label="Ventas del mes" />
        <Metric value={fmtQ(m.ticket_promedio)} label="Ticket promedio" />
        <Metric value={String(m.clientes_total)} label="Clientes totales" />
        <Metric value={String(m.clientes_activos)} label="Activos (30d)" />
        <Metric value={String(m.clientes_inactivos)} label="Inactivos (30d)" warn={m.clientes_inactivos > 0} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <TopList title="Servicios más vendidos" rows={m.top_servicios} />
        <TopList title="Productos más vendidos" rows={m.top_productos} />
      </div>

      <div className="mt-4 rounded-xl border border-line bg-elevated p-4">
        <p className="text-sm font-semibold text-ink">Barbero del mes</p>
        <p className="mt-1 font-display text-xl font-bold text-accent">{m.top_barbero ?? "Sin datos aún"}</p>
      </div>
    </div>
  );
}

function Metric({ value, label, sub, accent, warn }: { value: string; label: string; sub?: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-elevated p-4">
      <p className={`font-display text-[28px] font-extrabold leading-none tabular-nums ${accent ? "text-accent" : warn ? "text-warning" : "text-ink"}`}>{value}</p>
      <p className="mt-1.5 text-[13px] font-medium text-muted">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted">{sub}</p>}
    </div>
  );
}

function TopList({ title, rows }: { title: string; rows: { nombre: string; n: number }[] }) {
  return (
    <div className="rounded-xl border border-line bg-elevated p-4">
      <p className="mb-3 text-sm font-semibold text-ink">{title}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Sin ventas aún.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <li key={r.nombre} className="flex items-center justify-between text-sm">
              <span className="text-ink"><span className="mr-2 text-subtle">{i + 1}.</span>{r.nombre}</span>
              <span className="font-semibold text-muted">{r.n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
