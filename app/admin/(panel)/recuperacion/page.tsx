import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/queries/staff";
import { getInactivos, type InactivoRow } from "@/lib/queries/recuperacion";
import { fmtDiaMes } from "@/lib/format";
import { IconMessage, IconCheck } from "@/components/icons";

const SEGMENTOS = [30, 60, 90];

function waLink(r: InactivoRow): string {
  const tel = r.telefono.replace(/\D/g, "");
  const nombre = r.nombre.split(" ")[0];
  const msg = `Hola ${nombre}, te extrañamos en Taper Barber. Tienes un beneficio esperándote en tu próximo corte — ¡pasa cuando quieras y te lo aplicamos!`;
  return `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
}

export default async function RecuperacionPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const staff = await getStaff();
  if (staff?.rol !== "admin" && staff?.rol !== "dueno") redirect("/admin");

  const sp = await searchParams;
  const dias = SEGMENTOS.includes(Number(sp.dias)) ? Number(sp.dias) : 30;
  const inactivos = await getInactivos(dias);

  return (
    <div>
      <h1 className="font-display text-[26px] font-bold tracking-[-0.01em] text-ink">Recuperar clientes</h1>
      <p className="mt-1 text-sm text-muted">Clientes que no vienen hace tiempo. Mándales un mensaje y reactívalos.</p>

      {/* Segmentos — control segmentado agrupado */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="text-[13px] font-medium text-subtle">Sin visita hace</span>
        <div role="tablist" aria-label="Rango de inactividad" className="inline-flex rounded-full border border-line bg-elevated p-1">
          {SEGMENTOS.map((s) => {
            const activo = dias === s;
            return (
              <Link
                key={s}
                href={`/admin/recuperacion?dias=${s}`}
                role="tab"
                aria-selected={activo}
                className={`flex min-h-[42px] items-center rounded-full px-4 text-sm font-semibold transition-colors ${activo ? "bg-accent text-accent-ink shadow-[0_1px_6px_var(--accent-glow)]" : "text-muted hover:text-ink"}`}
              >
                {s} días
              </Link>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-[13px] text-subtle">
        {inactivos.length} cliente{inactivos.length === 1 ? "" : "s"} sin visita en {dias}+ días
      </p>

      {inactivos.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-line py-16 text-center">
          <span className="mb-4 text-success"><IconCheck size={40} /></span>
          <p className="font-display text-lg font-bold text-ink">Todos al día</p>
          <p className="mt-1 max-w-[280px] text-sm text-muted">Ningún cliente lleva {dias}+ días sin venir. ¡Bien hecho!</p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {inactivos.map((r) => (
            <div key={r.id} className="flex items-center gap-4 rounded-xl border border-line bg-elevated px-4 py-3">
              <Link href={`/admin/clientes/${r.id}`} className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{r.nombre}</p>
                <p className="text-[13px] text-muted">
                  {r.dias_inactivo == null ? "Nunca registró visita" : `Hace ${r.dias_inactivo} días`}
                  {r.ultima_visita ? ` · últ. ${fmtDiaMes(r.ultima_visita)}` : ""} · {r.telefono}
                </p>
              </Link>
              <a
                href={waLink(r)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-success/40 bg-success-dim px-4 text-[13px] font-semibold text-success"
              >
                <IconMessage size={16} /> WhatsApp
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
