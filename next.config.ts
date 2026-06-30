import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Imágenes de Supabase Storage. Se usan con `unoptimized` para no
    // generar costos de optimización en Vercel (ver memoria del proyecto).
    remotePatterns: [
      { protocol: "https", hostname: "qbwelatblclhbgpxvpgm.supabase.co" },
    ],
  },
};

export default nextConfig;
