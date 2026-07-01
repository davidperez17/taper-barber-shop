import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// URL de admin oculta: solo se accede visitando el slug secreto (env), que
// setea una cookie de "puerta". Sin ella, /admin responde 404. Es oscuridad;
// la protección real sigue siendo el login del staff.
const GATE = process.env.ADMIN_GATE_SLUG;
const GATE_COOKIE = "taper_gate";
const GATE_MAX_AGE = 60 * 60 * 24 * 180; // 180 días

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
      return new NextResponse("Not found", { status: 404 });
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Todas las rutas excepto assets estáticos e imágenes.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icon.*\\.svg|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)",
  ],
};
