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
    letter-spacing:.28em;font-weight:800;font-size:14px}
  .dia{width:22px;height:11px;fill:#f5c800}
  .emoji{font-size:56px;line-height:1;margin-bottom:18px}
  h1{font-size:30px;font-weight:800;letter-spacing:-.01em;margin-bottom:12px}
  p{color:#a0a0a0;font-size:15px;line-height:1.6;margin-bottom:28px}
  a{display:inline-flex;min-height:48px;align-items:center;padding:0 24px;border-radius:9999px;
    background:#f5c800;color:#0f0f0f;font-weight:700;text-decoration:none}
</style></head>
<body><div class="box">
  <div class="mark"><svg class="dia" viewBox="0 0 1000 500" fill-rule="evenodd" aria-hidden="true"><path d="M196.0,178.5 184.0,185.5 165.5,204.0 152.5,220.0 144.0,227.5 124.0,227.5 122.0,226.5 120.5,225.0 116.5,199.0 112.5,186.0 105.0,179.5 92.0,180.5 86.5,186.0 82.5,195.0 81.5,205.0 78.5,216.0 78.5,227.0 76.5,237.0 76.5,273.0 77.5,274.0 78.5,293.0 83.5,318.0 87.5,325.0 91.0,328.5 103.0,329.5 106.0,328.5 111.5,323.0 115.5,313.0 119.5,286.0 123.0,281.5 143.0,281.5 149.5,286.0 153.5,292.0 175.0,315.5 189.0,327.5 196.0,330.5 207.0,330.5 220.0,323.5 230.5,314.0 252.5,288.0 260.0,281.5 281.0,281.5 283.5,284.0 287.5,310.0 290.5,320.0 295.0,326.5 301.0,329.5 310.0,329.5 317.5,323.0 321.5,313.0 325.5,286.0 329.0,281.5 444.0,281.5 446.5,283.0 455.5,297.0 469.0,308.5 483.0,314.5 499.0,315.5 500.0,316.5 513.0,315.5 534.0,305.5 542.5,298.0 554.0,281.5 670.0,281.5 672.5,284.0 673.5,288.0 673.5,294.0 678.5,318.0 680.5,322.0 687.0,328.5 690.0,329.5 701.0,328.5 706.5,323.0 711.5,308.0 714.5,285.0 718.0,281.5 738.0,281.5 745.5,287.0 755.5,300.0 776.0,321.5 783.0,326.5 793.0,330.5 805.0,329.5 815.0,323.5 828.5,311.0 853.0,282.5 855.0,281.5 876.0,281.5 878.5,284.0 881.5,298.0 882.5,310.0 886.5,322.0 893.0,328.5 904.0,329.5 907.0,328.5 911.5,324.0 916.5,313.0 920.5,294.0 921.5,269.0 922.5,268.0 921.5,225.0 920.5,224.0 920.5,215.0 919.5,214.0 917.5,198.0 912.5,185.0 908.0,180.5 901.0,178.5 893.0,180.5 887.5,186.0 884.5,192.0 882.5,199.0 879.5,222.0 877.0,227.5 857.0,227.5 853.0,225.5 823.0,191.5 815.0,184.5 803.0,178.5 792.0,178.5 785.0,181.5 778.0,186.5 760.5,204.0 747.5,220.0 739.0,227.5 719.0,227.5 715.5,225.0 711.5,199.0 707.5,186.0 702.0,180.5 695.0,178.5 687.0,180.5 679.5,189.0 675.5,203.0 673.5,222.0 670.0,227.5 556.0,227.5 552.5,225.0 541.5,209.0 534.0,202.5 520.0,195.5 505.0,192.5 487.0,193.5 471.0,199.5 465.0,203.5 452.5,216.0 445.0,227.5 330.0,227.5 326.5,225.0 325.5,222.0 321.5,195.0 317.5,185.0 311.0,179.5 304.0,178.5 298.0,180.5 292.5,186.0 289.5,192.0 282.5,227.0 262.0,227.5 258.0,225.5 253.5,221.0 238.5,202.0 221.0,185.5 208.0,178.5 197.0,178.5Z M79.0,4.5 74.0,6.5 68.5,13.0 68.5,69.0 75.0,72.5 80.5,78.0 83.5,83.0 84.5,94.0 81.5,101.0 77.0,105.5 67.0,109.5 16.0,109.5 11.0,111.5 4.5,117.0 0.5,127.0 0.5,333.0 1.5,334.0 1.5,384.0 5.5,391.0 9.0,394.5 16.0,398.5 20.0,399.5 70.0,399.5 76.0,401.5 82.5,408.0 84.5,413.0 83.5,427.0 74.0,437.5 70.0,438.5 67.5,442.0 67.5,449.0 68.5,450.0 68.5,487.0 67.5,488.0 67.5,493.0 69.0,494.5 930.0,494.5 930.5,440.0 924.0,436.5 917.5,430.0 914.5,424.0 914.5,416.0 916.5,410.0 922.0,403.5 931.0,399.5 978.0,399.5 987.0,397.5 995.5,390.0 998.5,381.0 997.5,125.0 992.5,115.0 982.0,109.5 931.0,109.5 922.0,105.5 916.5,100.0 914.5,95.0 915.5,82.0 921.0,74.5 930.5,69.0 930.5,14.0 928.5,10.0 923.0,5.5 920.0,4.5 80.0,4.5Z"/></svg>TAPER BARBER</div>
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
