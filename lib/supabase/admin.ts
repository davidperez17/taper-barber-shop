import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase con service-role. SOLO servidor (server actions / queries).
 * NUNCA importar desde componentes cliente: expondría la llave maestra.
 * Salta la RLS, así que cada uso debe validar el rol antes de operar.
 */
export function createAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY para la gestión de personal.");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
