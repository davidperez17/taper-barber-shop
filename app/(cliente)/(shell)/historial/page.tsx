import { requireDashboard } from "@/lib/queries/cliente";
import { fmtDiaMes, fmtMesAnio, fmtQ } from "@/lib/format";
import type { HistorialVenta } from "@/lib/types";

export default async function HistorialPage() {
  const dash = await requireDashboard();

  // Agrupar por mes
  const grupos = new Map<string, HistorialVenta[]>();
  for (const v of dash.historial) {
    const key = fmtMesAnio(v.created_at);
    const arr = grupos.get(key) ?? [];
    arr.push(v);
    grupos.set(key, arr);
  }

  return (
    <div className="animate-fade-up px-5 pb-6 pt-14">
      <h1 className="mb-5 font-display text-[30px] font-bold tracking-[-0.01em] text-ink">Historial</h1>

      {dash.historial.length === 0 ? (
        <EmptyState />
      ) : (
        [...grupos.entries()].map(([mes, ventas]) => (
          <section key={mes} className="mb-6">
            <p className="mb-3 text-xs uppercase tracking-[0.06em] text-subtle">{mes}</p>
            <div className="flex flex-col gap-3">
              {ventas.map((v) => (
                <article key={v.id} className="rounded-xl border border-line bg-elevated p-[15px]">
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-sm font-medium text-ink">
                      {fmtDiaMes(v.created_at)}
                      {v.barbero && <span className="text-muted"> · {v.barbero}</span>}
                    </span>
                    <span className="font-display text-lg font-bold text-accent">{fmtQ(v.total)}</span>
                  </div>
                  <p className="text-[13px] text-muted">
                    {v.items.map((it) => it.nombre).join(" · ") || "Venta"}
                  </p>
                  {v.recompensa_canjeada && (
                    <span className="mt-2 inline-block rounded-full bg-success-dim px-2.5 py-1 text-[11px] font-semibold text-success">
                      Corte gratis canjeado
                    </span>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-16 flex flex-col items-center text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-full border border-line bg-elevated">
        <span className="size-3 rotate-45 rounded-[3px] bg-accent" />
      </div>
      <p className="font-display text-xl font-bold text-ink">Aún no tienes visitas</p>
      <p className="mt-2 max-w-[260px] text-sm text-muted">
        Tu primer corte empieza tu journey. Muéstrale tu QR al cajero en tu próxima visita.
      </p>
    </div>
  );
}
