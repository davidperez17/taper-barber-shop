"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconChevronLeft } from "@/components/icons";
import { Wordmark } from "@/components/Wordmark";

export function PanelHeaderNav() {
  const pathname = usePathname();
  const enInicio = pathname === "/admin";

  return (
    <div className="flex items-center gap-1.5">
      {!enInicio && (
        <Link
          href="/admin"
          aria-label="Volver al inicio"
          className="-ml-1 flex size-11 items-center justify-center rounded-lg text-muted hover:bg-elevated hover:text-ink"
        >
          <IconChevronLeft size={18} />
        </Link>
      )}
      <Link href="/admin" className="flex items-center gap-2.5" aria-label="Inicio del panel">
        <Wordmark inline />
      </Link>
    </div>
  );
}
