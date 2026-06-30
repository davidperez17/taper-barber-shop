import { redirect } from "next/navigation";
import { getStaff } from "@/lib/queries/staff";
import { LoginForm } from "@/components/admin/LoginForm";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await getStaff()) redirect("/admin");
  const { next = "/admin" } = await searchParams;

  return (
    <main className="relative flex min-h-dvh w-full flex-col justify-center overflow-hidden px-6">
      {/* Fondo + scrim para legibilidad del texto */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/fondos/login.webp')" }}
      />
      <div
        aria-hidden
        className="absolute inset-0 z-0"
        style={{ background: "linear-gradient(to bottom,rgba(15,15,15,0.82),rgba(15,15,15,0.93))" }}
      />

      <div className="relative z-[1] mx-auto w-full max-w-[400px]">
      <div className="mb-8">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="size-2.5 rotate-45 rounded-[2px] bg-accent" />
          <span className="font-display text-[15px] font-bold tracking-[0.34em] text-ink">TAPER</span>
          <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Panel</span>
        </div>
        <h1 className="font-display text-[30px] font-bold tracking-[-0.01em] text-ink">Acceso staff</h1>
        <p className="mt-1.5 text-sm text-muted">Inicia sesión con tu cuenta del equipo.</p>
      </div>

      <LoginForm next={next} />
      </div>
    </main>
  );
}
