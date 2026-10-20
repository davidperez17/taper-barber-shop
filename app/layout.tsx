import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { PWARegister } from "@/components/PWARegister";

const barlow = Barlow({
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-barlow",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Taper Barber Shop",
  description: "Tu tarjeta de lealtad digital.",
  manifest: "/cliente-manifest",
  applicationName: "Taper Barber Shop",
  appleWebApp: { capable: true, statusBarStyle: "black", title: "Taper Barber Shop" },
  icons: {
    icon: [
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon-48.png",
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
};

export const viewport: Viewport = {
  themeColor: "#181818",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // CSP con nonce (lib/csp.ts): toda página se renderiza por request para
  // que sus scripts lleven el nonce de ese request.
  await connection();
  return (
    <html lang="es">
      <body
        suppressHydrationWarning
        className={`${barlow.variable} ${barlowCondensed.variable} antialiased`}
      >
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
