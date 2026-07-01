import "server-only";
import { createAdmin } from "@/lib/supabase/admin";
import type { Suscripcion } from "./send";

const COLS = "endpoint, p256dh, auth";

/** Suscripciones de un cliente concreto (todos sus dispositivos). */
export async function subsDeCliente(clienteId: string): Promise<Suscripcion[]> {
  const { data } = await createAdmin()
    .from("push_subscriptions")
    .select(COLS)
    .eq("owner_type", "cliente")
    .eq("owner_id", clienteId);
  return (data as Suscripcion[]) ?? [];
}

/** Suscripciones de un miembro del staff concreto. */
export async function subsDeStaff(staffId: string): Promise<Suscripcion[]> {
  const { data } = await createAdmin()
    .from("push_subscriptions")
    .select(COLS)
    .eq("owner_type", "staff")
    .eq("owner_id", staffId);
  return (data as Suscripcion[]) ?? [];
}

/** Todas las suscripciones de un tipo, opcionalmente filtradas por sucursal. */
export async function subsPorTipo(
  ownerType: "cliente" | "staff",
  sucursalId?: string | null,
): Promise<Suscripcion[]> {
  let q = createAdmin().from("push_subscriptions").select(COLS).eq("owner_type", ownerType);
  if (sucursalId) q = q.eq("sucursal_id", sucursalId);
  const { data } = await q;
  return (data as Suscripcion[]) ?? [];
}
