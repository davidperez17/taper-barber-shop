import type { MetadataRoute } from "next";

// Manifest dinámico: el shortcut de admin apunta al slug secreto (env), que
// abre la "puerta" (cookie) y redirige al login. Se genera en runtime para
// no dejar el slug en el repo. Ver proxy.ts para la lógica de la puerta.
export const dynamic = "force-dynamic";

export default function manifest(): MetadataRoute.Manifest {
  const gate = process.env.ADMIN_GATE_SLUG;

  const shortcuts: MetadataRoute.Manifest["shortcuts"] = gate
    ? [
        {
          name: "Panel Admin",
          short_name: "Admin",
          description: "Acceso staff al panel de administración",
          url: `/${gate}`,
          icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
        },
      ]
    : undefined;

  return {
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
    shortcuts,
  };
}
