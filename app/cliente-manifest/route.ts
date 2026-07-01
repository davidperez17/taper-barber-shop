// Manifest de la PWA cliente (tarjeta de lealtad). Enlazado desde el root layout.
export const dynamic = "force-static";

export function GET() {
  const manifest = {
    id: "/",
    name: "Taper Barbershop",
    short_name: "Taper",
    description: "Tu tarjeta de lealtad digital.",
    lang: "es",
    dir: "ltr",
    theme_color: "#181818",
    background_color: "#0f0f0f",
    display: "standalone",
    orientation: "portrait",
    start_url: "/",
    scope: "/",
    categories: ["lifestyle", "shopping"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };

  return Response.json(manifest, {
    headers: { "content-type": "application/manifest+json" },
  });
}
