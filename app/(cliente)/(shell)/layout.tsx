import { redirect } from "next/navigation";
import { getQrToken } from "@/lib/session";
import { BottomNav } from "@/components/cliente/BottomNav";
import { AutoRefresh } from "@/components/cliente/AutoRefresh";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  if (!(await getQrToken())) redirect("/");

  return (
    <div data-app-shell className="mx-auto flex h-full w-full max-w-[440px] flex-col overflow-hidden bg-bg">
      <AutoRefresh />
      {/* pb = espacio del bottom nav fijo (nav ~64px + margen + inset) para no tapar contenido */}
      <div className="min-h-0 flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+92px)]">{children}</div>
      <BottomNav />
    </div>
  );
}
