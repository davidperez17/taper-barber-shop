import { redirect } from "next/navigation";
import { getQrToken } from "@/lib/session";
import { BottomNav } from "@/components/cliente/BottomNav";
import { AutoRefresh } from "@/components/cliente/AutoRefresh";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  if (!(await getQrToken())) redirect("/");

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[440px] flex-col overflow-hidden bg-bg">
      <AutoRefresh />
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      <BottomNav />
    </div>
  );
}
