import { NextResponse, type NextRequest } from "next/server";

// Sesión de cliente inválida (QR regenerado por el staff, cliente borrado):
// requireDashboard no puede borrar la cookie en render, así que redirige aquí.
// Sin esto, /ingresar → Atrás → "/" veía la cookie → /tarjeta → /ingresar…
export function GET(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/ingresar", request.url));
  res.cookies.delete("taper_qr");
  return res;
}
