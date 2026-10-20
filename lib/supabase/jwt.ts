import type { SupabaseClient } from "@supabase/supabase-js";

export interface ClaimsSesion {
  /** Epoch (s) del login de esta sesión: amr se conserva al refrescar, iat no. */
  horaLogin: number;
  sessionId: string | null;
}

/**
 * Lee del access token (cookie) la hora de login y el id de sesión. Llamar
 * DESPUÉS de auth.getUser(), que ya validó el token contra Auth: aquí solo
 * se decodifica, sin red.
 */
export async function claimsSesion(sb: SupabaseClient): Promise<ClaimsSesion | null> {
  try {
    const { data } = await sb.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return null;
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) as {
      iat?: number;
      session_id?: string;
      amr?: { timestamp?: number }[];
    };
    const amr = Array.isArray(payload.amr) ? payload.amr.map((a) => a.timestamp ?? 0) : [];
    return {
      horaLogin: Math.max(0, ...amr) || payload.iat || 0,
      sessionId: payload.session_id ?? null,
    };
  } catch {
    return null;
  }
}
