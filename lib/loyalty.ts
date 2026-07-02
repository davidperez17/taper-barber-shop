// ════════════════════════════════════════════════════════════════
// Lógica de lealtad — única fuente de verdad (cliente y admin).
// Funciones puras sobre los conteos crudos de `cliente_loyalty`.
// ════════════════════════════════════════════════════════════════

export type Tier = "silver" | "gold" | "platinum" | "black";

/** Conteos crudos que devuelve la view `cliente_loyalty` / RPC. */
export interface LoyaltyRaw {
  cortes_total: number;
  visitas_12m: number;
  recompensas_canjeadas: number;
  cortes_objetivo: number;
}

/** Estado de lealtad ya interpretado para la UI. */
export interface LoyaltyState {
  tier: Tier;
  /** Progreso en el ciclo actual (0..objetivo). */
  cortesCiclo: number;
  objetivo: number;
  /** Cortes restantes para la próxima recompensa (0 si lista). */
  faltanParaRecompensa: number;
  /** Hay al menos una recompensa sin canjear. */
  recompensaDisponible: boolean;
  /** Recompensas ganadas y aún no canjeadas. */
  recompensasDisponibles: number;
  /** Próximo tier o null si ya es el máximo. */
  siguienteTier: Tier | null;
  /** Visitas (12m) que faltan para el siguiente tier (0 si máximo). */
  faltanParaSiguienteTier: number;
}

// ── Umbrales de tier por visitas en los últimos 12 meses ────────
const TIER_ORDER: Tier[] = ["silver", "gold", "platinum", "black"];

/** Mínimo de visitas (12m) para alcanzar cada tier. */
export const TIER_MIN_VISITAS: Record<Tier, number> = {
  silver: 0,
  gold: 11,
  platinum: 26,
  black: 51,
};

export function tierFromVisitas(visitas12m: number): Tier {
  if (visitas12m >= TIER_MIN_VISITAS.black) return "black";
  if (visitas12m >= TIER_MIN_VISITAS.platinum) return "platinum";
  if (visitas12m >= TIER_MIN_VISITAS.gold) return "gold";
  return "silver";
}

function nextTier(tier: Tier): Tier | null {
  const i = TIER_ORDER.indexOf(tier);
  return i < TIER_ORDER.length - 1 ? TIER_ORDER[i + 1] : null;
}

/** Interpreta los conteos crudos en un estado de lealtad para la UI. */
export function computeLoyalty(raw: LoyaltyRaw): LoyaltyState {
  const objetivo = raw.cortes_objetivo > 0 ? raw.cortes_objetivo : 6;
  const cortesTotal = Math.max(0, raw.cortes_total);

  const recompensasGanadas = Math.floor(cortesTotal / objetivo);
  const recompensasDisponibles = Math.max(
    0,
    recompensasGanadas - raw.recompensas_canjeadas,
  );
  const recompensaDisponible = recompensasDisponibles > 0;

  // Si hay recompensa lista, el anillo se muestra lleno; si no, el resto del ciclo.
  const cortesCiclo = recompensaDisponible ? objetivo : cortesTotal % objetivo;
  const faltanParaRecompensa = recompensaDisponible ? 0 : objetivo - cortesCiclo;

  const tier = tierFromVisitas(raw.visitas_12m);
  const siguienteTier = nextTier(tier);
  const faltanParaSiguienteTier = siguienteTier
    ? Math.max(0, TIER_MIN_VISITAS[siguienteTier] - raw.visitas_12m)
    : 0;

  return {
    tier,
    cortesCiclo,
    objetivo,
    faltanParaRecompensa,
    recompensaDisponible,
    recompensasDisponibles,
    siguienteTier,
    faltanParaSiguienteTier,
  };
}

// ── Presentación de tiers ───────────────────────────────────────

export const TIER_LABEL: Record<Tier, string> = {
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  black: "Black",
};

/** Clase CSS de superficie (definida en globals.css). */
export const TIER_SURFACE: Record<Tier, string> = {
  silver: "tier-silver",
  gold: "tier-gold",
  platinum: "tier-platinum",
  black: "tier-black",
};

/** Beneficios acumulativos por tier (fuente: plan.md §Sistema VIP). */
export const TIER_BENEFITS: Record<Tier, string[]> = {
  silver: ["Programa de lealtad — 6º corte gratis"],
  gold: [
    "Programa de lealtad — 6º corte gratis",
    "10% de descuento en productos",
    "Promociones exclusivas",
  ],
  platinum: [
    "Todo lo de Gold",
    "Descuentos superiores (15%)",
    "Prioridad en reserva de citas",
    "Regalo de cumpleaños",
  ],
  black: [
    "Todo lo de Platinum",
    "Recompensas exclusivas",
    "Beneficios premium",
    "Experiencia VIP completa",
  ],
};

/** Copy motivacional según el estado del ciclo. */
export function copyMotivacional(s: LoyaltyState, cortesTotal: number): string {
  if (cortesTotal === 0) return "Tu journey empieza hoy";
  if (s.recompensaDisponible) return "¡Reclama tu corte gratis!";
  const n = s.faltanParaRecompensa;
  return `Falta${n === 1 ? "" : "n"} ${n} para tu corte gratis`;
}

/** Id corto de miembro para mostrar (#00847). */
export function memberId(numero: number): string {
  return `#${String(numero).padStart(5, "0")}`;
}
