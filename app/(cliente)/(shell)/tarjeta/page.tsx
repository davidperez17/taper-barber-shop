import Link from "next/link";
import QRCode from "qrcode";
import { requireDashboard } from "@/lib/queries/cliente";
import { computeLoyalty, copyMotivacional, memberId, TIER_LABEL, type Tier } from "@/lib/loyalty";
import { fmtDiaMes } from "@/lib/format";
import { LoyaltyCard } from "@/components/cliente/LoyaltyCard";
import { RewardCelebration } from "@/components/cliente/RewardCelebration";
import { IconStats, IconHistory } from "@/components/icons";
import { NotifyBell } from "@/components/cliente/NotifyBell";

const BENEFICIO_CORTO: Record<Tier, string | null> = {
  silver: null,
  gold: "Desc. 10%",
  platinum: "Desc. 15%",
  black: "VIP",
};

export default async function TarjetaPage() {
  const dash = await requireDashboard();
  const loyalty = computeLoyalty(dash.loyalty);
  const motiv = copyMotivacional(loyalty, dash.loyalty.cortes_total);
  const firstName = dash.cliente.nombre.split(" ")[0];

  const qrSvg = await QRCode.toString(dash.cliente.qr_token, {
    type: "svg",
    margin: 1,
    width: 146,
    color: { dark: "#000000", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });

  return (
    <div className="animate-fade-up px-5 pb-6 pt-14">
      {loyalty.recompensaDisponible && <RewardCelebration nombre={dash.cliente.nombre} />}

      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[13px] text-muted">Hola,</p>
          <h1 className="font-display text-[26px] font-bold leading-none text-ink">{firstName}</h1>
        </div>
        <NotifyBell />
      </header>

      <LoyaltyCard
        name={dash.cliente.nombre}
        memberId={memberId(dash.cliente.numero)}
        tier={loyalty.tier}
        tierLabel={TIER_LABEL[loyalty.tier]}
        cortesCiclo={loyalty.cortesCiclo}
        objetivo={loyalty.objetivo}
        motiv={motiv}
        recompensaDisponible={loyalty.recompensaDisponible}
        beneficio={BENEFICIO_CORTO[loyalty.tier]}
        qrSvg={qrSvg}
      />

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-2 gap-3.5">
        <Link href="/stats" className="flex flex-col rounded-xl border border-line bg-elevated p-4">
          <span className="mb-3.5 text-accent"><IconStats /></span>
          <span className="font-display text-[17px] font-semibold text-ink">Mis Stats</span>
          <span className="mt-0.5 text-xs text-muted">{dash.loyalty.cortes_total} cortes totales</span>
        </Link>
        <Link href="/historial" className="flex flex-col rounded-xl border border-line bg-elevated p-4">
          <span className="mb-3.5 text-accent"><IconHistory /></span>
          <span className="font-display text-[17px] font-semibold text-ink">Historial</span>
          <span className="mt-0.5 text-xs text-muted">Último: {fmtDiaMes(dash.loyalty.ultima_visita)}</span>
        </Link>
      </div>
    </div>
  );
}
