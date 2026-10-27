import Link from "next/link";
import { requireDashboard } from "@/lib/queries/cliente";
import { getQrToken } from "@/lib/session";
import { qrVigente } from "@/lib/qr";
import { computeLoyalty, copyMotivacional, memberId, TIER_LABEL } from "@/lib/loyalty";
import { fmtMesAnio } from "@/lib/format";
import { CANJE_HORARIO } from "@/lib/horario";
import { RewardCelebration } from "@/components/cliente/RewardCelebration";
import { TierUpCelebration } from "@/components/cliente/TierUpCelebration";
import { TarjetaCards, type TarjetaVM } from "@/components/cliente/TarjetaCards";
import { IconStats } from "@/components/icons";
import { NotifyBell } from "@/components/cliente/NotifyBell";
import { ActualizarApp } from "@/components/ActualizarApp";
import { VentaLive } from "@/components/cliente/VentaLive";
import { canalCliente } from "@/lib/realtime";
import { QrOfflineCache } from "@/components/cliente/QrOfflineCache";
import { getBandeja } from "@/lib/queries/notificaciones";
import { faseHalloween, renovacionVigente, RENOVACION_SUCURSAL } from "@/lib/promo";
import { HalloweenBanner } from "@/components/cliente/HalloweenPromo";
import { RenovacionBanner, RenovacionPromo } from "@/components/cliente/RenovacionPromo";

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
  const algunaRecompensa = cards.some((c) => c.recompensaDisponible);
  const halloween = faseHalloween();
  // Anuncio de la renovación: solo clientes con cortes en esa sucursal.
  const renovacion =
    renovacionVigente() &&
    dash.loyalty_sucursales.some((s) => s.sucursal_id === RENOVACION_SUCURSAL && s.cortes_total > 0);

  // QR rotativo (0040): sin red, la tarjeta avisa y /offline muestra el número.
  const token = await getQrToken();
  const qrInicial = (token && (await qrVigente(token))) || { svg: "", venceEn: 0 };

  return (
    <div className="px-5 pb-6 pt-14">
      <VentaLive canal={canalCliente(dash.cliente.id)} />
      <QrOfflineCache nombre={dash.cliente.nombre} memberId={memberId(dash.cliente.numero)} />
      {loyalty.recompensaDisponible && <RewardCelebration nombre={dash.cliente.nombre} />}
      {renovacion && <RenovacionPromo />}
      <TierUpCelebration clienteId={dash.cliente.id} tiers={[loyalty.tier, ...cards.map((c) => c.tier)]} />

      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[13px] text-muted">Hola,</p>
          <h1 className="font-display text-[26px] font-bold leading-none text-ink">{firstName}</h1>
          <p className="mt-1.5 text-[11px] text-subtle">Unido al Club desde {fmtMesAnio(dash.cliente.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <ActualizarApp />
          <NotifyBell notisInicial={bandeja.notis} noLeidasInicial={bandeja.noLeidas} />
        </div>
      </header>

      <TarjetaCards
        cards={cards}
        defaultSucursalId={dash.loyalty.sucursal_id}
        name={dash.cliente.nombre}
        memberId={memberId(dash.cliente.numero)}
        qrInicial={qrInicial}
      />

      {/* El canje tiene ventana (0032); el sello se gana a cualquier hora. */}
      {algunaRecompensa && (
        <p className="mt-3.5 text-center text-xs text-muted">
          Canjea tu corte gratis {CANJE_HORARIO}.
        </p>
      )}

      {halloween && <HalloweenBanner fase={halloween} />}
      {renovacion && <RenovacionBanner />}

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
