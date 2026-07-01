import { redirect } from "next/navigation";
import { getQrToken } from "@/lib/session";
import { BottomNav } from "@/components/cliente/BottomNav";
import { AutoRefresh } from "@/components/cliente/AutoRefresh";
import { NotifyOptIn } from "@/components/NotifyOptIn";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  if (!(await getQrToken())) redirect("/");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-bg pt-[env(safe-area-inset-top)]">
      <AutoRefresh />
      <div className="flex-1 pb-[calc(env(safe-area-inset-bottom)+80px)]">
        <div className="px-5">
          <NotifyOptIn />
        </div>
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
