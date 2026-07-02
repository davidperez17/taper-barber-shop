import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Router cache del cliente: una sección ya visitada se re-muestra al
    // instante desde caché en vez de esperar el round-trip al server en
    // cada navegación. 30s: lo bastante fresco para un POS, instantáneo
    // para el ojo. router.refresh() y revalidatePath la invalidan igual.
    staleTimes: { dynamic: 30, static: 180 },
  },
  images: {
    // Imágenes de Supabase Storage. Se usan con `unoptimized` para no
    // generar costos de optimización en Vercel (ver memoria del proyecto).
    remotePatterns: [
      { protocol: "https", hostname: "qbwelatblclhbgpxvpgm.supabase.co" },
    ],
  },
};

export default nextConfig;
