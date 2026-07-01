"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { logoutStaff } from "@/app/admin/actions";
import type { RolStaff } from "@/lib/queries/staff";
import {
  IconScan, IconUsers, IconBox, IconChart, IconRefresh, IconCard,
  IconTag, IconStack, IconCalendar, IconStats, IconGrid,
} from "@/components/icons";
import { useModalA11y } from "@/components/admin/useModalA11y";

type Roles = RolStaff[] | "all";
interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<{ size?: number }>;
  roles: Roles;
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

const ADMIN: RolStaff[] = ["admin", "dueno"];

// Estructura agrupada del panel (una sola fuente para sidebar y hoja "Más").
const GROUPS: NavGroup[] = [
  {
    label: "Principal",
    items: [{ href: "/admin/dashboard", label: "Resumen", Icon: IconStats, roles: ADMIN }],
  },
  {
    label: "Operación",
    items: [
      { href: "/admin", label: "Punto de venta", Icon: IconScan, roles: "all" },
      { href: "/admin/agenda", label: "Agenda", Icon: IconCalendar, roles: "all" },
      { href: "/admin/clientes", label: "Clientes", Icon: IconUsers, roles: "all" },
      { href: "/admin/caja", label: "Cierre de caja", Icon: IconCard, roles: "all" },
      { href: "/admin/inventario", label: "Inventario", Icon: IconStack, roles: ADMIN },
      { href: "/admin/recuperacion", label: "Recuperación", Icon: IconRefresh, roles: ADMIN },
    ],
  },
  {
    label: "Catálogo",
    items: [{ href: "/admin/catalogo", label: "Productos y servicios", Icon: IconBox, roles: ADMIN }],
  },
  {
    label: "Promociones",
    items: [{ href: "/admin/cupones", label: "Cupones", Icon: IconTag, roles: ADMIN }],
  },
  {
    label: "Reportes",
    items: [
      { href: "/admin/reportes", label: "Ventas", Icon: IconChart, roles: ADMIN },
      { href: "/admin/reportes/clientes", label: "Clientes", Icon: IconUsers, roles: ADMIN },
    ],
  },
];

// Accesos primarios del bottom nav (móvil). El resto vive en la hoja "Más".
const PRIMARY: NavItem[] = [
  { href: "/admin", label: "Venta", Icon: IconScan, roles: "all" },
  { href: "/admin/agenda", label: "Agenda", Icon: IconCalendar, roles: "all" },
  { href: "/admin/clientes", label: "Clientes", Icon: IconUsers, roles: "all" },
  { href: "/admin/caja", label: "Caja", Icon: IconCard, roles: "all" },
];

const ROL_LABEL: Record<RolStaff, string> = {
  cajero: "Cajero",
  barbero: "Barbero",
  admin: "Admin",
  dueno: "Dueño",
};

const puede = (rol: RolStaff, roles: Roles) => roles === "all" || roles.includes(rol);
const ALL_HREFS = GROUPS.flatMap((g) => g.items.map((i) => i.href));

/** Href activo = el más específico (prefijo más largo) que casa con la ruta. */
function useActiveHref(): string | null {
  const pathname = usePathname();
  let best: string | null = null;
  for (const href of ALL_HREFS) {
    const match = pathname === href || pathname.startsWith(href + "/");
    if (match && (best === null || href.length > best.length)) best = href;
  }
  return best;
}

// ── Sidebar fija (≥lg) ──────────────────────────────────────────
export function AdminSidebar({ rol, nombre }: { rol: RolStaff; nombre: string }) {
  const active = useActiveHref();
  return (
    <aside className="hidden w-[224px] shrink-0 flex-col border-r border-line bg-bg lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="size-2.5 rotate-45 rounded-[2px] bg-accent" />
        <span className="font-display text-[15px] font-bold tracking-[0.3em] text-ink">TAPER</span>
        <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Panel</span>
      </div>

      <nav aria-label="Navegación del panel" className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-2">
        {GROUPS.map((g) => {
          const items = g.items.filter((i) => puede(rol, i.roles));
          if (items.length === 0) return null;
          return (
            <div key={g.label}>
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-subtle">{g.label}</p>
              <div className="flex flex-col gap-0.5">
                {items.map(({ href, label, Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active === href ? "page" : undefined}
                    className={[
                      "flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                      active === href ? "bg-accent/12 text-accent" : "text-muted hover:bg-elevated hover:text-ink",
                    ].join(" ")}
                  >
                    <Icon size={19} />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
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

// ── Bottom nav (móvil/tablet, <lg): 4 primarios + Más ───────────
export function AdminBottomNav({ rol }: { rol: RolStaff }) {
  const active = useActiveHref();
  const [masAbierto, setMasAbierto] = useState(false);
  const primarios = PRIMARY.filter((i) => puede(rol, i.roles));
  const primarioHrefs = new Set(primarios.map((i) => i.href));
  // "Más" queda resaltado cuando la ruta activa no es un primario.
  const masActivo = active !== null && !primarioHrefs.has(active);

  return (
    <>
      <nav
        aria-label="Navegación del panel"
        className="flex shrink-0 items-center justify-around border-t border-line bg-elevated px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 lg:hidden"
      >
        {primarios.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={active === href ? "page" : undefined}
            className={[
              "flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg px-3 text-[11px] font-medium transition-colors",
              active === href ? "text-accent" : "text-subtle hover:text-ink",
            ].join(" ")}
          >
            <Icon size={22} />
            {label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setMasAbierto(true)}
          aria-haspopup="dialog"
          className={[
            "flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg px-3 text-[11px] font-medium transition-colors",
            masActivo ? "text-accent" : "text-subtle hover:text-ink",
          ].join(" ")}
        >
          <IconGrid size={22} />
          Más
        </button>
      </nav>

      {masAbierto && <MasSheet rol={rol} active={active} onClose={() => setMasAbierto(false)} />}
    </>
  );
}

function MasSheet({ rol, active, onClose }: { rol: RolStaff; active: string | null; onClose: () => void }) {
  const ref = useModalA11y(onClose);
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end lg:hidden" role="dialog" aria-modal="true" aria-label="Menú del panel">
      <button aria-label="Cerrar" tabIndex={-1} className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div ref={ref} className="animate-fade-up relative max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl border border-line bg-bg px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong" />
        <div className="flex flex-col gap-4">
          {GROUPS.map((g) => {
            const items = g.items.filter((i) => puede(rol, i.roles));
            if (items.length === 0) return null;
            return (
              <div key={g.label}>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-subtle">{g.label}</p>
                <div className="grid grid-cols-2 gap-2">
                  {items.map(({ href, label, Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={onClose}
                      aria-current={active === href ? "page" : undefined}
                      className={[
                        "flex min-h-12 items-center gap-2.5 rounded-xl border px-3 text-sm font-medium transition-colors",
                        active === href ? "border-accent/50 bg-accent-dim text-accent" : "border-line bg-elevated text-ink hover:border-line-strong",
                      ].join(" ")}
                    >
                      <Icon size={20} />
                      <span className="min-w-0 truncate">{label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
