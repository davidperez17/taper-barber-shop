// Manifest de la PWA cliente (tarjeta de lealtad). Enlazado desde el root layout.
export const dynamic = "force-static";

export function GET() {
  const manifest = {
    id: "/",
    name: "Taper Barber Shop",
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
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };

  return Response.json(manifest, {
    headers: { "content-type": "application/manifest+json" },
  });
}
