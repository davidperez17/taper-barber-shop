import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/queries/staff";
import { getSucursalActiva, getSucursales } from "@/lib/sucursal";
import { logoutStaff } from "@/app/admin/actions";
import { PanelHeaderNav } from "@/components/admin/PanelHeaderNav";
import { OfflineSync } from "@/components/admin/OfflineSync";
import { AdminSidebar, AdminBottomNav, type SucursalNav } from "@/components/admin/AdminNav";
import { SucursalSwitcher } from "@/components/admin/SucursalSwitcher";
import { NotifyOptIn } from "@/components/NotifyOptIn";

// Mantiene el manifest del app admin en todo el panel (instalable aparte del cliente).
export const metadata: Metadata = {
  title: "Taper Admin",
  applicationName: "Taper Admin",
  manifest: "/staff-manifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Taper Admin" },
  icons: { icon: "/icon-admin.svg", shortcut: "/icon-admin.svg", apple: "/icon-admin.svg" },
};

const ROL_LABEL: Record<string, string> = {
  cajero: "Cajero",
  barbero: "Barbero",
  admin: "Admin",
  dueno: "Dueño",
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
    <div className="flex w-full bg-bg lg:h-dvh lg:overflow-hidden">
      <AdminSidebar rol={staff.rol} nombre={staff.nombre} sucursal={sucursalNav} />

      <div className="flex min-w-0 flex-1 flex-col bg-bg lg:min-h-0">
        <OfflineSync />

        {/* Header solo en móvil/tablet; en desktop la sidebar lo cubre */}
        <div className="sticky top-0 z-[var(--z-sticky)] bg-bg pt-[env(safe-area-inset-top)] lg:hidden">
          <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
            <PanelHeaderNav />
            <div className="flex items-center gap-3">
              <div className="text-right leading-tight">
                <p className="text-[13px] font-semibold text-ink">{staff.nombre}</p>
                <p className="text-[11px] text-subtle">{ROL_LABEL[staff.rol] ?? staff.rol}</p>
              </div>
              <form action={logoutStaff}>
                <button type="submit" className="min-h-9 rounded-lg border border-line px-3 text-[13px] text-muted hover:border-line-strong hover:text-ink">
                  Salir
                </button>
              </form>
            </div>
          </header>
          {/* Sucursal activa en su propia fila: nombre completo visible y con espacio para tocar */}
          {mostrarSwitcher && (
            <div className="border-b border-line px-5 py-2.5">
              <SucursalSwitcher sucursales={sucursalNav.sucursales} activeId={sucursalNav.activeId} canSwitch={sucursalNav.canSwitch} />
            </div>
          )}
        </div>

        <main className="flex-1 px-5 pt-6 pb-[calc(env(safe-area-inset-bottom)+84px)] lg:min-h-0 lg:overflow-y-auto lg:px-8 lg:pb-6">
          <div className="mx-auto max-w-[420px] lg:mx-0">
            <NotifyOptIn />
          </div>
          {children}
        </main>

        <AdminBottomNav rol={staff.rol} />
      </div>
    </div>
  );
}
