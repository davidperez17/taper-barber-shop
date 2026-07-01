import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// URL de admin oculta: solo se accede visitando el slug secreto (env), que
// setea una cookie de "puerta". Sin ella, /admin responde 404. Es oscuridad;
// la protección real sigue siendo el login del staff.
const GATE = process.env.ADMIN_GATE_SLUG;
const GATE_COOKIE = "taper_gate";
const GATE_MAX_AGE = 60 * 60 * 24 * 180; // 180 días

// 404 con estilo de marca y tono de broma para los curiosos.
function paginaOculta() {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Aquí no hay nada</title>
<style>
  :root{color-scheme:dark}
  *{box-sizing:border-box;margin:0}
  body{min-height:100dvh;display:flex;align-items:center;justify-content:center;
    background:#0f0f0f;color:#fff;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
    padding:24px;text-align:center;overflow:hidden}
  .box{max-width:420px}
  .mark{display:inline-flex;align-items:center;gap:10px;margin-bottom:28px;
    letter-spacing:.34em;font-weight:800;font-size:14px}
  .dia{width:10px;height:10px;background:#f5c800;border-radius:2px;transform:rotate(45deg)}
  .emoji{font-size:56px;line-height:1;margin-bottom:18px}
  h1{font-size:30px;font-weight:800;letter-spacing:-.01em;margin-bottom:12px}
  p{color:#a0a0a0;font-size:15px;line-height:1.6;margin-bottom:28px}
  a{display:inline-flex;min-height:48px;align-items:center;padding:0 24px;border-radius:9999px;
    background:#f5c800;color:#0f0f0f;font-weight:700;text-decoration:none}
</style></head>
<body><div class="box">
  <div class="mark"><span class="dia"></span>TAPER</div>
  <div class="emoji">💈✂️</div>
  <h1>Aquí no hay nada, jefe</h1>
  <p>Bonito intento 👀. Esta puerta no existe… o quizá sí, pero no para ti.
     La barbería es para cortes, no para curiosos. Vuelve por donde viniste.</p>
  <a href="/">Salir con dignidad →</a>
</div></body></html>`;
  return new NextResponse(html, {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

// Next 16: el antiguo middleware.ts se renombra a proxy.ts (export `proxy`).
export async function proxy(request: NextRequest) {
  if (GATE) {
    const { pathname } = request.nextUrl;

    // Visitar el slug secreto abre la puerta y lleva al login.
    if (pathname === `/${GATE}`) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      const res = NextResponse.redirect(url);
      res.cookies.set(GATE_COOKIE, "1", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: GATE_MAX_AGE,
      });
      return res;
    }

    // /admin oculto salvo que traiga la cookie de puerta.
    if (pathname.startsWith("/admin") && request.cookies.get(GATE_COOKIE)?.value !== "1") {
      return paginaOculta();
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Todas las rutas excepto assets estáticos e imágenes.
     */
    "/((?!_next/static|_next/image|favicon.ico|cliente-manifest|staff-manifest|icon.*\\.svg|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)",
  ],
};
