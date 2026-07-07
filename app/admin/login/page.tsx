import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/queries/staff";
import { LoginForm } from "@/components/admin/LoginForm";
import { InstallPWA } from "@/components/InstallPWA";
import { Isotipo } from "@/components/Isotipo";

// Enlaza el manifest del app admin (instalable aparte del app cliente) + identidad iOS.
export const metadata: Metadata = {
  title: "Taper Admin",
  applicationName: "Taper Admin",
  manifest: "/staff-manifest",
  appleWebApp: { capable: true, statusBarStyle: "black", title: "Taper Admin" },
  icons: { icon: "/icon-admin.svg", shortcut: "/icon-admin.svg", apple: "/icon-admin.svg" },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await getStaff()) redirect("/admin");
  const { next = "/admin" } = await searchParams;

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* Panel foto — solo desktop: luce la barbería */}
      <div className="relative hidden overflow-hidden lg:block">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/fondos/login.webp')" }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top,rgba(15,15,15,0.72) 0%,rgba(15,15,15,0.18) 55%,rgba(15,15,15,0.35) 100%)" }}
        />
        <div className="absolute inset-x-0 bottom-0 p-10">
          <div className="mb-3 flex items-center gap-2.5">
            <Isotipo className="h-[9px] w-[18px] text-accent" />
            <span className="font-display text-[15px] font-bold tracking-[0.28em] text-ink">TAPER BARBER</span>
          </div>
          <p className="max-w-[340px] font-display text-2xl font-bold leading-tight text-ink">
            Cada corte cuenta. Cada cliente vuelve.
          </p>
        </div>
      </div>

      {/* Panel formulario */}
      <div className="relative flex items-center justify-center overflow-hidden px-6 py-16">
        {/* Fondo foto + scrim SOLO en móvil (en desktop el panel es sólido) */}
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center lg:hidden"
          style={{ backgroundImage: "url('/fondos/login.webp')" }}
        />
        <div
          aria-hidden
          className="absolute inset-0 lg:hidden"
          style={{ background: "linear-gradient(to bottom,rgba(15,15,15,0.82),rgba(15,15,15,0.93))" }}
        />

        <div className="relative z-[1] w-full max-w-[380px]">
          <div className="mb-8">
            <div className="mb-5 flex items-center gap-2.5">
              <Isotipo className="h-[9px] w-[18px] text-accent" />
              <span className="font-display text-[15px] font-bold tracking-[0.28em] text-ink">TAPER BARBER</span>
              <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Panel</span>
            </div>
            <h1 className="font-display text-[30px] font-bold tracking-[-0.01em] text-ink">Acceso staff</h1>
            <p className="mt-1.5 text-sm text-muted">Inicia sesión con tu cuenta del equipo.</p>
          </div>

          <LoginForm next={next} />
          <InstallPWA />
        </div>
      </div>
    </main>
  );
}
