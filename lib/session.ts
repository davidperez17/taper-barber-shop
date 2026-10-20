import { cookies } from "next/headers";
import { SESION_KEY, SESION_V2_KEY } from "@/lib/sesion-cliente";

// Identidad de la PWA cliente = qr_token en cookie httpOnly.
// El cliente no tiene auth de Supabase; su sesión es el token. Desde 0040 el
// token ya no sale en el QR (que es un código rotativo): solo vive aquí.
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function getQrToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESION_KEY)?.value ?? null;
}

export async function setQrToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESION_KEY, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });
  // Token recién emitido por login/registro: puede ser uno viejo (salió en
  // QRs antes de 0040). Sin la marca, proxy.ts lo revisa y rota si hace falta.
  store.delete(SESION_V2_KEY);
}

export async function clearQrToken(): Promise<void> {
  const store = await cookies();
  store.delete(SESION_KEY);
  store.delete(SESION_V2_KEY);
}
