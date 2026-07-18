// Manifest de la PWA admin (panel staff), app instalable APARTE de la del cliente.
// start_url = slug secreto: abre la "puerta" (cookie) y redirige a /admin/login
// (ver proxy.ts). Se lee de env en runtime para no dejar el slug en el repo.
export const dynamic = "force-dynamic";

export function GET() {
  const gate = process.env.ADMIN_GATE_SLUG;
  const startUrl = gate ? `/${gate}` : "/admin/login";

  const manifest = {
    id: "/panel",
    name: "Taper Admin",
    short_name: "Admin",
    description: "Panel de administración — staff.",
    lang: "es",
    dir: "ltr",
    theme_color: "#101418",
    background_color: "#0f0f0f",
    display: "standalone",
    orientation: "portrait",
    start_url: startUrl,
    scope: "/",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };

  return Response.json(manifest, {
    headers: { "content-type": "application/manifest+json" },
  });
}
