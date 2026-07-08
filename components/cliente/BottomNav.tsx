"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { IconCard, IconStats, IconUser } from "@/components/icons";

const ITEMS: { href: string; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { href: "/tarjeta", label: "Tarjeta", Icon: IconCard },
  { href: "/stats", label: "Stats", Icon: IconStats },
  { href: "/perfil", label: "Perfil", Icon: IconUser },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-1/2 z-30 flex w-[calc(100%-24px)] max-w-[416px] -translate-x-1/2 items-center justify-around gap-1 rounded-2xl border border-line bg-elevated px-3 py-2.5 shadow-lg shadow-black/40 mb-[max(env(safe-area-inset-bottom),0.875rem)]"
    >
      {ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            aria-label={label}
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
