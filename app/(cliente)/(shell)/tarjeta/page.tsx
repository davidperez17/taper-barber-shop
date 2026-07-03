import Link from "next/link";
import QRCode from "qrcode";
import { requireDashboard } from "@/lib/queries/cliente";
import { computeLoyalty, copyMotivacional, memberId, TIER_LABEL } from "@/lib/loyalty";
import { RewardCelebration } from "@/components/cliente/RewardCelebration";
import { TierUpCelebration } from "@/components/cliente/TierUpCelebration";
import { TarjetaCards, type TarjetaVM } from "@/components/cliente/TarjetaCards";
import { IconStats } from "@/components/icons";
import { NotifyBell } from "@/components/cliente/NotifyBell";
import { VentaLive } from "@/components/cliente/VentaLive";
import { getBandeja } from "@/lib/queries/notificaciones";

export default async function TarjetaPage() {
  const dash = await requireDashboard();
  const bandeja = await getBandeja(dash.cliente.id);
  // La lealtad es por sucursal: una tarjeta por sucursal (el cliente elige).
  // Las celebraciones se disparan según la sucursal primaria (dash.loyalty).
  const loyalty = computeLoyalty(dash.loyalty);
  const firstName = dash.cliente.nombre.split(" ")[0];

  const cards: TarjetaVM[] = dash.loyalty_sucursales.map((s) => {
    const st = computeLoyalty(s);
    return {
      sucursalId: s.sucursal_id,
      sucursalNombre: s.sucursal_nombre,
      tier: st.tier,
      tierLabel: TIER_LABEL[st.tier],
      cortesCiclo: st.cortesCiclo,
      objetivo: st.objetivo,
      motiv: copyMotivacional(st, s.cortes_total),
      recompensaDisponible: st.recompensaDisponible,
    };
  });
  const cortesGlobal = dash.loyalty_sucursales.reduce((sum, s) => sum + s.cortes_total, 0);

  // Sin width/height fijos en el <svg> → escala al contenedor (tile responsive en la card).
  const qrSvg = (
    await QRCode.toString(dash.cliente.qr_token, {
      type: "svg",
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
  )
    .replace(/(<svg[^>]*?)\s+width="[^"]*"/, "$1")
    .replace(/(<svg[^>]*?)\s+height="[^"]*"/, "$1");

  return (
    <div className="px-5 pb-6 pt-14">
      <VentaLive clienteId={dash.cliente.id} />
      {loyalty.recompensaDisponible && <RewardCelebration nombre={dash.cliente.nombre} />}
      <TierUpCelebration tier={loyalty.tier} tierLabel={TIER_LABEL[loyalty.tier]} />

      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[13px] text-muted">Hola,</p>
          <h1 className="font-display text-[26px] font-bold leading-none text-ink">{firstName}</h1>
        </div>
        <NotifyBell notisInicial={bandeja.notis} noLeidasInicial={bandeja.noLeidas} />
      </header>

      <TarjetaCards
        cards={cards}
        defaultSucursalId={dash.loyalty.sucursal_id}
        name={dash.cliente.nombre}
        memberId={memberId(dash.cliente.numero)}
        qrSvg={qrSvg}
      />

      {/* Quick actions */}
      <div className="mt-6">
        <Link href="/stats" className="flex flex-col rounded-xl border border-line bg-elevated p-4">
          <span className="mb-3.5 text-accent"><IconStats /></span>
          <span className="font-display text-[17px] font-semibold text-ink">Mis Stats</span>
          <span className="mt-0.5 text-xs text-muted">{cortesGlobal} cortes totales</span>
        </Link>
      </div>
    </div>
  );
}
