"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { Wordmark } from "@/components/Wordmark";
import { logoutStaff } from "@/app/admin/actions";
import type { RolStaff } from "@/lib/queries/staff";
import {
  IconScan, IconUsers, IconBox, IconChart, IconRefresh, IconCard,
  IconTag, IconStack, IconCalendar, IconStats, IconGrid, IconId, IconStore, IconBell,
} from "@/components/icons";
import { useModalA11y } from "@/components/admin/useModalA11y";
import { SucursalSwitcher } from "@/components/admin/SucursalSwitcher";

export interface SucursalNav {
  sucursales: { id: string; nombre: string }[];
  activeId: string | null;
  canSwitch: boolean;
}

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
    items: [
      { href: "/admin/cupones", label: "Cupones", Icon: IconTag, roles: ADMIN },
      { href: "/admin/notificaciones", label: "Notificaciones", Icon: IconBell, roles: ADMIN },
    ],
  },
  {
    label: "Reportes",
    items: [
      { href: "/admin/reportes", label: "Ventas", Icon: IconChart, roles: ADMIN },
      { href: "/admin/reportes/clientes", label: "Clientes", Icon: IconUsers, roles: ADMIN },
    ],
  },
  {
    label: "Administración",
    items: [
      { href: "/admin/sucursales", label: "Sucursales", Icon: IconStore, roles: ["dueno"] },
      { href: "/admin/personal", label: "Personal", Icon: IconId, roles: ["dueno"] },
    ],
  },
];

// Accesos primarios del bottom nav (móvil). El resto vive en la hoja "Más".
const PRIMARY: NavItem[] = [
  { href: "/admin/dashboard", label: "Resumen", Icon: IconStats, roles: ADMIN },
  { href: "/admin/clientes", label: "Clientes", Icon: IconUsers, roles: "all" },
  { href: "/admin", label: "Ventas", Icon: IconScan, roles: "all" },
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

/** Iniciales para el avatar de cuenta en la hoja "Más" (máx. 2 letras). */
const iniciales = (n: string) =>
  n.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";

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
export function AdminSidebar({ rol, nombre, sucursal }: { rol: RolStaff; nombre: string; sucursal?: SucursalNav }) {
  const active = useActiveHref();
  return (
    <aside className="hidden w-[224px] shrink-0 flex-col border-r border-line bg-bg lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Wordmark />
        <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Panel</span>
      </div>

      {sucursal && sucursal.sucursales.length > 1 && (
        <div className="px-3 pb-2">
          <SucursalSwitcher sucursales={sucursal.sucursales} activeId={sucursal.activeId} canSwitch={sucursal.canSwitch} />
        </div>
      )}

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
export function AdminBottomNav({
  rol,
  nombre,
  sucursalNombre,
}: {
  rol: RolStaff;
  nombre: string;
  sucursalNombre?: string;
}) {
  const active = useActiveHref();
  const pathname = usePathname();
  const [masAbierto, setMasAbierto] = useState(false);
  // En la pantalla de venta (checkout) el bottom nav estorba con la barra fija
  // "Total / Confirmar"; se oculta y se sale por el botón "atrás" del header.
  if (pathname.startsWith("/admin/venta/")) return null;
  const primarios = PRIMARY.filter((i) => puede(rol, i.roles));
  const primarioHrefs = new Set(primarios.map((i) => i.href));
  // "Más" queda resaltado cuando la ruta activa no es un primario.
  const masActivo = active !== null && !primarioHrefs.has(active);

  return (
    <>
      <nav
        aria-label="Navegación del panel"
        className="fixed inset-x-0 bottom-0 z-30 mx-3 mb-[max(env(safe-area-inset-bottom),0.875rem)] flex items-stretch rounded-2xl border border-line bg-elevated px-1.5 py-2 shadow-lg shadow-black/40 lg:hidden"
      >
        {primarios.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={active === href ? "page" : undefined}
            className={[
              "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-medium transition-colors",
              active === href ? "text-accent" : "text-subtle hover:text-ink",
            ].join(" ")}
          >
            <Icon size={22} />
            <span className="max-w-full truncate">{label}</span>
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setMasAbierto(true)}
          aria-haspopup="dialog"
          className={[
            "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-medium transition-colors",
            masActivo ? "text-accent" : "text-subtle hover:text-ink",
          ].join(" ")}
        >
          <IconGrid size={22} />
          <span className="max-w-full truncate">Más</span>
        </button>
      </nav>

      {masAbierto && (
        <MasSheet
          rol={rol}
          nombre={nombre}
          sucursalNombre={sucursalNombre}
          active={active}
          onClose={() => setMasAbierto(false)}
        />
      )}
    </>
  );
}

function MasSheet({
  rol,
  nombre,
  sucursalNombre,
  active,
  onClose,
}: {
  rol: RolStaff;
  nombre: string;
  sucursalNombre?: string;
  active: string | null;
  onClose: () => void;
}) {
  const ref = useModalA11y(onClose);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);

  if (typeof document === "undefined") return null;

  // Arrastrar el handle hacia abajo cierra la hoja; poco recorrido regresa.
  const onTouchStart = (e: React.TouchEvent) => {
    setDragging(true);
    startY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setDragY(dy);
  };
  const onTouchEnd = () => {
    setDragging(false);
    if (dragY > 100) onClose();
    else setDragY(0);
  };

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end lg:hidden" role="dialog" aria-modal="true" aria-label="Menú del panel">
      <button aria-label="Cerrar" tabIndex={-1} className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        ref={ref}
        className="animate-fade-up relative max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl border border-line bg-bg px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-1"
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragging ? "none" : "transform 200ms ease-out",
        }}
      >
        {/* Handle: tócalo y deslízalo hacia abajo para cerrar */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="-mx-5 mb-2 flex touch-none cursor-grab justify-center px-5 pb-2 pt-2 active:cursor-grabbing"
          aria-hidden
        >
          <div className="h-1.5 w-11 rounded-full bg-line-strong" />
        </div>
        {/* Cuenta: quién está dentro */}
        <div className="mb-4 flex items-center gap-3">
          <span
            aria-hidden
            className="grid size-11 shrink-0 place-items-center rounded-full bg-accent/15 text-sm font-bold text-accent"
          >
            {iniciales(nombre)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{nombre}</p>
            <p className="truncate text-xs text-muted">
              {ROL_LABEL[rol]}
              {sucursalNombre ? ` · ${sucursalNombre}` : ""}
            </p>
          </div>
        </div>

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

          {/* Sesión: separada del resto; "Salir" en peligro */}
          <div className="border-t border-line pt-4">
            <form action={logoutStaff}>
              <button
                type="submit"
                className="flex min-h-12 w-full items-center gap-2.5 rounded-2xl border border-danger/40 px-3.5 text-sm font-semibold text-danger transition-colors hover:border-danger"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-5 shrink-0"
                  aria-hidden
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" x2="9" y1="12" y2="12" />
                </svg>
                Salir
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
