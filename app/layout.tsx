import type { Metadata, Viewport } from "next";
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
  title: "Taper Barber",
  description: "Tu tarjeta de lealtad digital.",
  manifest: "/cliente-manifest",
  applicationName: "Taper",
  appleWebApp: { capable: true, statusBarStyle: "black", title: "Taper" },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#181818",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
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
