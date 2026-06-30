import { redirect } from "next/navigation";
import { getQrToken } from "@/lib/session";
import { BottomNav } from "@/components/cliente/BottomNav";
import { AutoRefresh } from "@/components/cliente/AutoRefresh";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  if (!(await getQrToken())) redirect("/");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-bg">
      <AutoRefresh />
      <div className="flex-1 overflow-y-auto">{children}</div>
      <BottomNav />
    </div>
  );
}
