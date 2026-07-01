import { redirect } from "next/navigation";
import { getQrToken } from "@/lib/session";
import { BottomNav } from "@/components/cliente/BottomNav";
import { AutoRefresh } from "@/components/cliente/AutoRefresh";
import { NotifyOptIn } from "@/components/NotifyOptIn";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  if (!(await getQrToken())) redirect("/");

  return (
    <div className="fixed inset-0 mx-auto flex w-full max-w-[440px] flex-col overflow-hidden bg-bg pt-[env(safe-area-inset-top)]">
      <AutoRefresh />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-5">
          <NotifyOptIn />
        </div>
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
