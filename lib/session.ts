import { cookies } from "next/headers";

// Identidad de la PWA cliente = qr_token en cookie httpOnly.
// El cliente no tiene auth de Supabase; su sesión es el token.
const KEY = "taper_qr";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function getQrToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(KEY)?.value ?? null;
}

export async function setQrToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(KEY, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });
}

export async function clearQrToken(): Promise<void> {
  const store = await cookies();
  store.delete(KEY);
}
