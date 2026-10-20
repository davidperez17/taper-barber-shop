import { NextResponse, type NextRequest } from "next/server";
import { SESION_KEY, SESION_V2_KEY } from "@/lib/sesion-cliente";

// Sesión de cliente inválida (sesiones cerradas por el staff, cliente borrado):
// requireDashboard no puede borrar la cookie en render, así que redirige aquí.
// Sin esto, /ingresar → Atrás → "/" veía la cookie → /tarjeta → /ingresar…
export function GET(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/ingresar", request.url));
  res.cookies.delete(SESION_KEY);
  res.cookies.delete(SESION_V2_KEY);
  return res;
}
