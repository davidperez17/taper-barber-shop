import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";

/** QR que muestra la tarjeta: SVG + segundos hasta que cambie (null = fijo). */
export interface QrVigente {
  svg: string;
  venceEn: number | null;
}

// Sin width/height fijos en el <svg> → escala al contenedor (tile responsive en la card).
async function svgDe(texto: string): Promise<string> {
  return (
    await QRCode.toString(texto, {
      type: "svg",
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
  )
    .replace(/(<svg[^>]*?)\s+width="[^"]*"/, "$1")
    .replace(/(<svg[^>]*?)\s+height="[^"]*"/, "$1");
}

/**
 * Código rotativo (0040) para la sesión: cambia cada 30 s y no contiene el
 * token, así que una foto del QR ya no abre la cuenta. Sin 0040 cae al QR
 * viejo (el token) para no dejar la tarjeta en blanco.
 */
export async function qrVigente(token: string): Promise<QrVigente | null> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("cliente_qr_codigo", { p_qr_token: token });
  if (error?.code === "PGRST202") return { svg: await svgDe(token), venceEn: null };
  if (error || !data) return null;
  const { codigo, vence_en } = data as { codigo: string; vence_en: number };
  return { svg: await svgDe(codigo), venceEn: vence_en };
}
