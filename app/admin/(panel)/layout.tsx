import { redirect } from "next/navigation";
import { getStaff } from "@/lib/queries/staff";
import { getSucursalActiva, getSucursales } from "@/lib/sucursal";
import { logoutStaff } from "@/app/admin/actions";
import { PanelHeaderNav } from "@/components/admin/PanelHeaderNav";
import { OfflineSync } from "@/components/admin/OfflineSync";
import { AdminSidebar, AdminBottomNav, type SucursalNav } from "@/components/admin/AdminNav";
import { SucursalSwitcher } from "@/components/admin/SucursalSwitcher";

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
    <div className="flex h-dvh w-full overflow-hidden">
      <AdminSidebar rol={staff.rol} nombre={staff.nombre} sucursal={sucursalNav} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-bg">
        <OfflineSync />

        {/* Header solo en móvil/tablet; en desktop la sidebar lo cubre */}
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5 lg:hidden">
          <PanelHeaderNav />
          {mostrarSwitcher && (
            <div className="min-w-0 max-w-[46vw] flex-1">
              <SucursalSwitcher sucursales={sucursalNav.sucursales} activeId={sucursalNav.activeId} canSwitch={sucursalNav.canSwitch} />
            </div>
          )}
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

        <main className="min-h-0 flex-1 overflow-y-auto px-5 py-6 lg:px-8">{children}</main>

        <AdminBottomNav rol={staff.rol} />
      </div>
    </div>
  );
}
