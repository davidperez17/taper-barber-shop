import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next 16: el antiguo middleware.ts se renombra a proxy.ts (export `proxy`).
export async function proxy(request: NextRequest) {
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
