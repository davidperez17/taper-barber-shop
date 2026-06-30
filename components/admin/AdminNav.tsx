"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { logoutStaff } from "@/app/admin/actions";
import type { RolStaff } from "@/lib/queries/staff";
import { IconScan, IconUsers, IconBox, IconChart, IconRefresh } from "@/components/icons";

interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<{ size?: number }>;
  roles: RolStaff[] | "all";
}

const ITEMS: NavItem[] = [
  { href: "/admin", label: "Inicio", Icon: IconScan, roles: "all" },
  { href: "/admin/clientes", label: "Clientes", Icon: IconUsers, roles: "all" },
  { href: "/admin/recuperacion", label: "Recuperar", Icon: IconRefresh, roles: ["admin", "dueno"] },
  { href: "/admin/catalogo", label: "Catálogo", Icon: IconBox, roles: ["admin", "dueno"] },
  { href: "/admin/reportes", label: "Reportes", Icon: IconChart, roles: ["admin", "dueno"] },
];

const ROL_LABEL: Record<RolStaff, string> = {
  cajero: "Cajero",
  barbero: "Barbero",
  admin: "Admin",
  dueno: "Dueño",
};

function visibles(rol: RolStaff) {
  return ITEMS.filter((i) => i.roles === "all" || i.roles.includes(rol));
}

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

/** Sidebar fija (≥lg). */
export function AdminSidebar({ rol, nombre }: { rol: RolStaff; nombre: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-[224px] shrink-0 flex-col border-r border-line bg-bg lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="size-2.5 rotate-45 rounded-[2px] bg-accent" />
        <span className="font-display text-[15px] font-bold tracking-[0.3em] text-ink">TAPER</span>
        <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Panel</span>
      </div>

      <nav aria-label="Navegación del panel" className="flex flex-1 flex-col gap-1 px-3 py-2">
        {visibles(rol).map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={[
                "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                active ? "bg-accent/12 text-accent" : "text-muted hover:bg-elevated hover:text-ink",
              ].join(" ")}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line p-3">
        <p className="px-2 text-[13px] font-semibold text-ink">{nombre}</p>
        <p className="px-2 text-[11px] text-subtle">{ROL_LABEL[rol]}</p>
        <form action={logoutStaff} className="mt-2">
          <button type="submit" className="min-h-9 w-full rounded-lg border border-line px-3 text-left text-[13px] text-muted hover:border-line-strong hover:text-ink">
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}

/** Bottom nav (móvil/tablet, <lg). */
export function AdminBottomNav({ rol }: { rol: RolStaff }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegación del panel"
      className="flex shrink-0 items-center justify-around border-t border-line bg-elevated px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 lg:hidden"
    >
      {visibles(rol).map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={[
              "flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg px-3 text-[11px] font-medium transition-colors",
              active ? "text-accent" : "text-subtle hover:text-ink",
            ].join(" ")}
          >
            <Icon size={22} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
