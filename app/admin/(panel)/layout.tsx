import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/queries/staff";
import { getSucursalActiva, getSucursales } from "@/lib/sucursal";
import { PanelHeaderNav } from "@/components/admin/PanelHeaderNav";
import { OfflineSync } from "@/components/admin/OfflineSync";
import { AdminSidebar, AdminBottomNav, type SucursalNav } from "@/components/admin/AdminNav";
import { SucursalSwitcher } from "@/components/admin/SucursalSwitcher";
import { ActualizarApp } from "@/components/ActualizarApp";
import { NotifyOptIn } from "@/components/NotifyOptIn";

// Mantiene el manifest del app admin en todo el panel (instalable aparte del cliente).
export const metadata: Metadata = {
  title: "Taper Admin",
  applicationName: "Taper Admin",
  manifest: "/staff-manifest",
  appleWebApp: { capable: true, statusBarStyle: "black", title: "Taper Admin" },
  icons: {
    icon: [
      { url: "/admin-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/admin-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/admin-icon-192.png",
    apple: { url: "/admin-apple-touch-icon.png", sizes: "180x180" },
  },
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");

  const sucursales = await getSucursales();
  const activeId = await getSucursalActiva(staff);
  const sucursalNav: SucursalNav = {
    sucursales: sucursales.map((s) => ({ id: s.id, nombre: s.nombre })),
    activeId,
    canSwitch: staff.rol === "dueno" || staff.rol === "admin",
  };
  const mostrarSwitcher = sucursales.length > 1;

  return (
    <div data-app-shell className="flex h-full w-full overflow-hidden bg-bg">
      <AdminSidebar rol={staff.rol} nombre={staff.nombre} sucursal={sucursalNav} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-bg">
        <OfflineSync />

        {/* Header solo en móvil/tablet; en desktop la sidebar lo cubre */}
        <div className="lg:hidden">
          {/* Barra = marca + acceso rápido a Actualizar. Identidad y Salir en "Más". */}
          <header className="flex items-center justify-between gap-3 border-b border-line px-5 pb-3.5 pt-[max(env(safe-area-inset-top),1.25rem)]">
            <PanelHeaderNav />
            <ActualizarApp />
          </header>
          {/* Sucursal activa en su propia fila: nombre completo visible y con espacio para tocar */}
          {mostrarSwitcher && (
            <div className="border-b border-line px-5 py-2.5">
              <SucursalSwitcher sucursales={sucursalNav.sucursales} activeId={sucursalNav.activeId} canSwitch={sucursalNav.canSwitch} />
            </div>
          )}
        </div>

        {/* pb móvil = espacio del bottom nav fijo (nav ~60px + margen + inset). En lg el nav se oculta y manda la sidebar. */}
        <main data-shell-scroll className="min-h-0 flex-1 overflow-y-auto px-5 pt-6 pb-[calc(env(safe-area-inset-bottom)+104px)] lg:px-8 lg:py-6">
          <div className="mx-auto max-w-[420px] lg:mx-0">
            <NotifyOptIn />
          </div>
          {children}
        </main>

        <AdminBottomNav
          rol={staff.rol}
          nombre={staff.nombre}
          sucursalNombre={sucursalNav.sucursales.find((s) => s.id === activeId)?.nombre}
        />
      </div>
    </div>
  );
}
