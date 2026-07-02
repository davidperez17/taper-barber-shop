import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca la sesión de Supabase en cada request y protege rutas /admin.
 * El cliente (PWA) no usa sesión de auth; su identidad es el QR.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Un refresh token rotado/revocado hace fallar getUser() en CADA request
  // (AuthApiError: refresh_token_not_found). Sin manejo, la cookie envenenada
  // rompe el sitio hasta que el usuario la borre a mano. Aquí: tratar como
  // sin sesión y borrar las cookies sb-* para que el navegador sane solo.
  let user = null;
  let authRota = false;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) authRota = error.status === 400 || error.code === "refresh_token_not_found";
    else user = data.user;
  } catch {
    authRota = true;
  }

  if (authRota) {
    for (const c of request.cookies.getAll()) {
      if (c.name.startsWith("sb-")) response.cookies.delete(c.name);
    }
  }

  // Proteger panel admin: sin sesión → login
  const { pathname } = request.nextUrl;
  const isAdmin = pathname.startsWith("/admin");
  const isLogin = pathname === "/admin/login";

  if (isAdmin && !isLogin && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    const res = NextResponse.redirect(url);
    if (authRota) {
      for (const c of request.cookies.getAll()) {
        if (c.name.startsWith("sb-")) res.cookies.delete(c.name);
      }
    }
    return res;
  }

  return response;
}
