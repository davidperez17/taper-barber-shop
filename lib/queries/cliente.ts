import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getQrToken } from "@/lib/session";
import type { ClienteDashboard } from "@/lib/types";

/** Dashboard completo del cliente por qr_token (cliente + lealtad + historial). */
export async function getClienteDashboard(
  qrToken: string,
): Promise<ClienteDashboard | null> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("get_cliente_by_qr", {
    p_qr_token: qrToken,
  });
  if (error) throw new Error(error.message);
  return (data as ClienteDashboard | null) ?? null;
}

/**
 * Carga el dashboard del cliente con sesión. Redirige si no hay sesión
 * o el token ya no es válido (no se puede limpiar la cookie en render,
 * así que mandamos a /ingresar para evitar el loop con onboarding).
 */
export async function requireDashboard(): Promise<ClienteDashboard> {
  const token = await getQrToken();
  if (!token) redirect("/");
  const dash = await getClienteDashboard(token);
  if (!dash) redirect("/ingresar");
  return dash;
}
