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
  const admin = createAdmin();
  // Paginado: PostgREST corta en 1000 filas por defecto.
  let filas: (Suscripcion & { owner_id: string })[] = [];
  for (let desde = 0; ; desde += 1000) {
    let q = admin
      .from("push_subscriptions")
      .select(`${COLS}, owner_id`)
      .eq("owner_type", ownerType)
      .order("endpoint")
      .range(desde, desde + 999);
    if (sucursalId) q = q.eq("sucursal_id", sucursalId);
    const { data } = await q;
    const pagina = (data as (Suscripcion & { owner_id: string })[]) ?? [];
    filas = filas.concat(pagina);
    if (pagina.length < 1000) break;
  }
  // Staff desactivado no debe seguir recibiendo avisos internos (stock,
  // difusión, cliente nuevo) aunque su suscripción siga viva.
  if (ownerType === "staff" && filas.length > 0) {
    const { data: activos } = await admin.from("staff").select("id").eq("activo", true);
    const ids = new Set((activos ?? []).map((s) => s.id as string));
    filas = filas.filter((f) => ids.has(f.owner_id));
  }
  return filas.map(({ endpoint, p256dh, auth }) => ({ endpoint, p256dh, auth }));
}
