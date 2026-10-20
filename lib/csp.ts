// Content-Security-Policy con nonce por request (la arma proxy.ts).
//
// script-src: solo scripts con el nonce de este request ('strict-dynamic'
// deja pasar los chunks que esos scripts cargan). Next pone el nonce en sus
// propios scripts al verlo en el header de la petición; los inline nuestros
// (el de /offline) lo leen de x-nonce. Por eso todas las páginas se
// renderizan dinámicas (connection() en el layout raíz): una página estática
// tendría scripts sin nonce y quedaría rota.
//
// style-src lleva 'unsafe-inline': la UI usa style={…} en todos lados y los
// atributos style no admiten nonce. El riesgo real (inyección de scripts)
// lo cubre script-src.
//
// CSP_REPORT_ONLY=1 (env) manda la política como Report-Only: no bloquea,
// solo reporta a /api/csp. Sirve para probar un cambio sin romper nada.

export const NONCE_HEADER = "x-nonce";

export function nuevoNonce(): string {
  return btoa(crypto.randomUUID());
}

export function politicaCsp(nonce: string): string {
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseWs = supabase.replace(/^https:/, "wss:");
  const dev = process.env.NODE_ENV === "development";

  const directivas: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'unsafe-eval' solo en dev (React lo usa para el overlay de errores).
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", supabase],
    "font-src": ["'self'", "data:"],
    // Supabase REST + Realtime (websocket).
    "connect-src": ["'self'", supabase, supabaseWs, ...(dev ? ["ws:"] : [])],
    "media-src": ["'self'", "blob:"],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "frame-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "report-uri": ["/api/csp"],
  };
  const texto = Object.entries(directivas)
    .map(([k, v]) => `${k} ${v.filter(Boolean).join(" ")}`)
    .join("; ");
  return dev ? texto : `${texto}; upgrade-insecure-requests`;
}

export function cabeceraCsp(): string {
  return process.env.CSP_REPORT_ONLY === "1"
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";
}
