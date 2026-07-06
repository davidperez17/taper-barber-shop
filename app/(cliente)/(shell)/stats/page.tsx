import { requireDashboard } from "@/lib/queries/cliente";
import { computeLoyalty, TIER_LABEL, TIER_MIN_VISITAS, type Tier } from "@/lib/loyalty";
import { fmtMesCorto } from "@/lib/format";

const STRIP: { tier: Tier; color: string }[] = [
  { tier: "silver", color: "#a1a1aa" },
  { tier: "gold", color: "#f5c800" },
  { tier: "platinum", color: "#3b82f6" },
  { tier: "black", color: "#e4e4e7" },
];

export default async function StatsPage() {
  const dash = await requireDashboard();
  const loyalty = computeLoyalty(dash.loyalty);
  const visitas = dash.loyalty.visitas_12m;

  return (
    <div className="px-5 pb-6 pt-14">
      <h1 className="mb-5 font-display text-[30px] font-bold tracking-[-0.01em] text-ink">Mis Stats</h1>

      <div className="grid grid-cols-2 gap-3.5">
        <Stat value={String(dash.loyalty.cortes_total)} label="Cortes totales" accent />
        <Stat value={TIER_LABEL[loyalty.tier]} label="Nivel actual" />
        <Stat value={fmtMesCorto(dash.cliente.created_at)} label="1ra visita" />
      </div>

      <h2 className="mb-3.5 mt-7 font-display text-xl font-bold text-ink">Mi progreso VIP</h2>
      <div className="flex flex-col gap-3.5">
        {STRIP.map(({ tier, color }) => {
          const min = TIER_MIN_VISITAS[tier];
          const reached = visitas >= min;
          // progreso relativo dentro del tramo hacia ESTE tier
          const pct = reached ? 100 : Math.min(100, Math.round((visitas / Math.max(min, 1)) * 100));
          return (
            <div key={tier} className="flex items-center gap-3">
              <span className={`w-[68px] text-[13px] ${reached ? "text-ink" : "text-subtle"}`}>{TIER_LABEL[tier]}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
              </div>
              <span className={`text-[11px] ${reached ? "text-success" : "text-subtle"}`}>
                {reached ? "✓" : `${visitas}/${min}`}
              </span>
            </div>
          );
        })}
      </div>

      {loyalty.siguienteTier && (
        <div className="mt-6 rounded-2xl border border-accent/25 bg-accent-dim p-4">
          <p className="text-xs uppercase tracking-[0.04em] text-muted">Próximo nivel</p>
          <p className="mt-1 font-display text-xl font-bold text-ink">
            {TIER_LABEL[loyalty.siguienteTier]} ·{" "}
            <span className="text-accent">{TIER_MIN_VISITAS[loyalty.siguienteTier]} visitas</span>
          </p>
          <p className="text-[13px] text-muted">Te faltan {loyalty.faltanParaSiguienteTier} visitas</p>
        </div>
      )}
    </div>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-elevated p-[18px]">
      <p className={`font-display text-[34px] font-extrabold leading-none ${accent ? "text-accent" : "text-ink"}`}>{value}</p>
      <p className="mt-1.5 text-xs uppercase tracking-[0.04em] text-subtle">{label}</p>
    </div>
  );
}
