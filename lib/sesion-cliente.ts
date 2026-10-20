import type { NextRequest, NextResponse } from "next/server";

// Rotación de sesiones viejas (0040). Hasta 0040 el QR de la tarjeta era el
// propio token de sesión, así que cualquier foto del QR abría la cuenta. La
// primera vez que un teléfono vuelve con un token así, el proxy lo cambia por
// uno nuevo que nunca se mostró, y deja la marca taper_ses=2 para no volver a
// consultar la base en cada request.
export const SESION_KEY = "taper_qr";
export const SESION_V2_KEY = "taper_ses";
const V2 = "2";
const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Si la cookie de sesión aún no está verificada, la renueva en la base.
 * Devuelve el token a guardar (y ya lo pone en `request` para que la página
 * de este mismo request lo vea), o null si no hay nada que cambiar.
 */
export async function renovarSesionCliente(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(SESION_KEY)?.value;
  if (!token || request.cookies.get(SESION_V2_KEY)?.value === V2) return null;

  let nuevo: string | null = null;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/renovar_sesion_cliente`, {
      method: "POST",
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_token: token }),
      signal: AbortSignal.timeout(3000),
    });
    // Sin 0040 (404) o base caída: no marcar, se reintenta en el próximo request.
    if (!res.ok) return null;
    nuevo = (await res.json()) as string | null;
  } catch {
    return null;
  }
  // Token inválido: requireDashboard lo manda a /salir.
  if (!nuevo) return null;

  request.cookies.set(SESION_KEY, nuevo);
  request.cookies.set(SESION_V2_KEY, V2);
  return nuevo;
}

export function aplicarSesionRenovada(response: NextResponse, token: string): void {
  const opts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  };
  response.cookies.set(SESION_KEY, token, opts);
  response.cookies.set(SESION_V2_KEY, V2, opts);
}
