import { redirect } from "next/navigation";
import { getQrToken } from "@/lib/session";
import { BottomNav } from "@/components/cliente/BottomNav";
import { AutoRefresh } from "@/components/cliente/AutoRefresh";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  if (!(await getQrToken())) redirect("/");

  return (
    <div data-app-shell className="mx-auto flex h-full w-full max-w-[440px] flex-col overflow-hidden bg-bg">
      <AutoRefresh />
      {/* pt safe-area: separa el contenido de la status bar/notch en la PWA */}
      <div className="min-h-0 flex-1 overflow-y-auto pt-[env(safe-area-inset-top)]">{children}</div>
      <BottomNav />
    </div>
  );
}
