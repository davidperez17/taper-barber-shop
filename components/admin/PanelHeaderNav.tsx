"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconChevronLeft } from "@/components/icons";

export function PanelHeaderNav() {
  const pathname = usePathname();
  const enInicio = pathname === "/admin";

  return (
    <div className="flex items-center gap-1.5">
      {!enInicio && (
        <Link
          href="/admin"
          aria-label="Volver al inicio"
          className="-ml-1 flex size-9 items-center justify-center rounded-lg text-muted hover:bg-elevated hover:text-ink"
        >
          <IconChevronLeft size={18} />
        </Link>
      )}
      <Link href="/admin" className="flex items-center gap-2.5" aria-label="Inicio del panel">
        <span className="size-2.5 rotate-45 rounded-[2px] bg-accent" />
        <span className="font-display text-[14px] font-bold tracking-[0.3em] text-ink">TAPER</span>
        <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Panel</span>
      </Link>
    </div>
  );
}
