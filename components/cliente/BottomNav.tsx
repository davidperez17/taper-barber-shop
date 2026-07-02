"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { IconCard, IconStats, IconHistory, IconUser } from "@/components/icons";

const ITEMS: { href: string; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { href: "/tarjeta", label: "Tarjeta", Icon: IconCard },
  { href: "/stats", label: "Stats", Icon: IconStats },
  { href: "/historial", label: "Historial", Icon: IconHistory },
  { href: "/perfil", label: "Perfil", Icon: IconUser },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="flex shrink-0 items-center justify-around gap-1 border-t border-line bg-elevated px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2.5"
    >
      {ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={[
              "flex min-h-11 items-center justify-center rounded-full font-semibold transition-colors duration-200",
              active ? "gap-2 bg-accent px-4 text-accent-ink" : "px-3 text-subtle hover:text-muted",
            ].join(" ")}
          >
            <Icon size={22} />
            {active && <span className="text-sm">{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
