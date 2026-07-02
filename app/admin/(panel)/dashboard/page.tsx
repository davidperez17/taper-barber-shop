import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/queries/staff";
import { getSucursalActiva, getSucursales } from "@/lib/sucursal";
import { getDashboardMetrics, getVentasPorSucursal, type VentaSucursal } from "@/lib/queries/admin";
import { hoyGT } from "@/lib/queries/caja";
import { fmtQ } from "@/lib/format";
import { Metric } from "@/components/admin/Metric";

export default async function DashboardPage() {
  const staff = await getStaff();
  if (staff?.rol !== "dueno" && staff?.rol !== "admin") redirect("/admin");

  const sucursalId = await getSucursalActiva(staff);
  const sucursales = await getSucursales();
  const nombreSucursal = sucursales.find((s) => s.id === sucursalId)?.nombre ?? null;
  const multi = sucursales.length > 1;

  const hoy = hoyGT();
  const mesInicio = `${hoy.slice(0, 7)}-01`;
  const [m, porSucursal] = await Promise.all([
    getDashboardMetrics(sucursalId),
    multi ? getVentasPorSucursal(mesInicio, hoy) : Promise.resolve([] as VentaSucursal[]),
  ]);

  return (
    <div>
      <h1 className="font-display text-[26px] font-bold tracking-[-0.01em] text-ink">Dashboard</h1>
      <p className="mb-5 mt-1 text-sm text-muted">
        {multi && nombreSucursal ? <>Sucursal <span className="font-semibold text-ink">{nombreSucursal}</span> · estado en tiempo real.</> : "Estado del negocio en tiempo real."}
      </p>

      {multi && porSucursal.length > 0 && <PorSucursal filas={porSucursal} />}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Metric value={fmtQ(m.ventas_hoy)} label="Ventas hoy" sub={`${m.num_ventas_hoy} ventas`} accent />
        <Metric value={fmtQ(m.ventas_mes)} label="Ventas del mes" />
        <Metric value={fmtQ(m.ticket_promedio)} label="Ticket promedio" />
        <Metric value={String(m.clientes_total)} label="Clientes totales" />
        <Metric value={String(m.clientes_activos)} label="Activos (30d)" />
        <Metric value={String(m.clientes_inactivos)} label="Inactivos (30d)" warn={m.clientes_inactivos > 0} />
      </div>

      {m.productos_bajo_stock > 0 && (
        <Link
          href="/admin/inventario"
          className="mt-4 flex items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 transition-colors hover:bg-warning/15"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning/20 font-display text-lg font-bold tabular-nums text-warning">
            {m.productos_bajo_stock}
          </span>
          <span className="text-sm text-ink">
            {m.productos_bajo_stock === 1 ? "1 producto bajo el mínimo o agotado" : `${m.productos_bajo_stock} productos bajo el mínimo o agotados`}
            <span className="block text-[13px] text-muted">Toca para revisar el inventario.</span>
          </span>
        </Link>
      )}

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

function PorSucursal({ filas }: { filas: VentaSucursal[] }) {
  const max = Math.max(1, ...filas.map((f) => Number(f.total)));
  const total = filas.reduce((s, f) => s + Number(f.total), 0);
  return (
    <div className="mb-6 rounded-xl border border-line bg-elevated p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-sm font-semibold text-ink">Ventas por sucursal · este mes</p>
        <p className="text-[13px] font-semibold tabular-nums text-muted">{fmtQ(total)}</p>
      </div>
      <ul className="flex flex-col gap-3">
        {filas.map((f) => (
          <li key={f.sucursal_id}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="truncate text-sm text-ink">{f.nombre}</span>
              <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">
                {fmtQ(Number(f.total))} <span className="font-normal text-subtle">· {f.num}</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface">
              <div className="h-full rounded-full bg-accent" style={{ width: `${(Number(f.total) / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
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
