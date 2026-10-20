// Reportes de violación de la CSP (lib/csp.ts). Solo se registran en los
// logs de Vercel para detectar algo bloqueado por error; no se guardan.
export async function POST(request: Request) {
  try {
    const texto = (await request.text()).slice(0, 2000);
    console.warn("[csp]", texto);
  } catch {
    /* cuerpo inválido */
  }
  return new Response(null, { status: 204 });
}
