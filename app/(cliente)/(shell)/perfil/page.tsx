import { requireDashboard } from "@/lib/queries/cliente";
import { logout } from "@/app/(cliente)/actions";
import { PushToggle } from "@/components/cliente/PushToggle";
import {
  computeLoyalty,
  memberId,
  TIER_BENEFITS,
  TIER_LABEL,
  TIER_MIN_VISITAS,
  TIER_SURFACE,
} from "@/lib/loyalty";

export default async function PerfilPage() {
  const dash = await requireDashboard();
  const loyalty = computeLoyalty(dash.loyalty);
  const tier = loyalty.tier;
  const next = loyalty.siguienteTier;

  const visitas = dash.loyalty.visitas_12m;
  const min = next ? TIER_MIN_VISITAS[next] : visitas;
  const prevMin = TIER_MIN_VISITAS[tier];
  const pct = next ? Math.min(100, Math.round(((visitas - prevMin) / (min - prevMin)) * 100)) : 100;

  return (
    <div className="animate-fade-up px-5 pb-6 pt-14">
      <h1 className="mb-5 font-display text-[30px] font-bold tracking-[-0.01em] text-ink">Mi Perfil</h1>

      {/* Mini tarjeta del tier */}
      <div className={`${TIER_SURFACE[tier]} rounded-2xl border border-white/15 p-[18px]`} style={{ boxShadow: "0 8px 30px var(--tier-glow)" }}>
        <div className="mb-3.5 flex items-start justify-between" style={{ color: "var(--tier-ink)" }}>
          <div>
            <p className="text-[11px] uppercase tracking-[0.1em] opacity-70">Nivel actual</p>
            <p className="font-display text-[26px] font-extrabold leading-none">{TIER_LABEL[tier]}</p>
          </div>
          <span className="text-sm opacity-80">{memberId(dash.cliente.numero)}</span>
        </div>
        <div className="h-[7px] overflow-hidden rounded-full bg-black/25">
          <div className="h-full rounded-full bg-white/85" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs" style={{ color: "var(--tier-ink)", opacity: 0.85 }}>
          {next ? `${visitas} / ${min} visitas para ${TIER_LABEL[next]}` : "Nivel máximo alcanzado"}
        </p>
      </div>

      {/* Beneficios activos */}
      <h2 className="mb-3 mt-6 font-display text-base font-bold text-success">Beneficios activos</h2>
      <ul className="flex flex-col gap-2.5">
        {TIER_BENEFITS[tier].map((b) => (
          <li key={b} className="flex items-center gap-3 rounded-xl border border-line bg-elevated p-3.5">
            <span className="text-[15px] text-success">✓</span>
            <span className="text-sm text-ink">{b}</span>
          </li>
        ))}
      </ul>

      {/* Próximo nivel */}
      {next && (
        <>
          <h2 className="mb-3 mt-6 font-display text-base font-bold text-ink">Próximo: {TIER_LABEL[next]}</h2>
          <ul className="flex flex-col gap-2.5">
            {TIER_BENEFITS[next]
              .filter((b) => !b.startsWith("Todo lo de"))
              .map((b) => (
                <li key={b} className="flex items-center gap-3 rounded-xl border border-white/5 bg-[#1c1c1c] p-3.5">
                  <span className="text-[15px] text-subtle">○</span>
                  <span className="text-sm text-subtle">{b}</span>
                </li>
              ))}
          </ul>
          <span className="mt-4 inline-flex rounded-full border border-accent/30 bg-accent-dim px-4 py-2 text-[13px] font-medium text-accent">
            Te faltan {loyalty.faltanParaSiguienteTier} visitas para {TIER_LABEL[next]}
          </span>
        </>
      )}

      <PushToggle />

      <form action={logout} className="mt-8">
        <button
          type="submit"
          className="min-h-11 text-sm text-muted underline-offset-4 hover:text-danger hover:underline"
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
