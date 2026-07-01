import Link from "next/link";
import { redirect } from "next/navigation";
import { getQrToken } from "@/lib/session";

export default async function OnboardingPage() {
  if (await getQrToken()) redirect("/tarjeta");

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden">
      {/* Hero — foto de barbería */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/fondos/onboarding.webp')" }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 z-[1] h-[72%]"
        style={{ background: "linear-gradient(to top,#0d0c0a 6%,rgba(13,12,10,0.82) 42%,transparent 100%)" }}
      />

      {/* Contenido */}
      <div className="relative z-[2] mx-auto mt-auto w-full max-w-[440px] px-6 pb-10">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="size-2.5 rotate-45 rounded-[2px] bg-accent" />
          <span className="font-display text-[15px] font-bold tracking-[0.34em] text-ink">TAPER</span>
        </div>
        <h1 className="font-display text-[46px] font-extrabold leading-[0.96] tracking-[-0.02em] text-ink">
          Tu corte.<br />Tu nivel.<br />
          <span className="text-accent">Tu recompensa.</span>
        </h1>
        <p className="mt-4 max-w-[280px] text-[15px] leading-relaxed text-muted">
          Acumula visitas y gana tu próximo corte gratis. Sube de nivel VIP en cada cita.
        </p>

        <Link
          href="/registro"
          className="mt-7 flex min-h-[54px] items-center justify-center rounded-full bg-accent text-base font-semibold text-accent-ink shadow-[0_0_28px_var(--accent-glow)] transition-colors hover:bg-accent-dark"
        >
          Comenzar gratis
        </Link>
        <Link
          href="/ingresar"
          className="mt-3.5 flex min-h-11 items-center justify-center text-sm text-muted hover:text-ink"
        >
          Ya tengo cuenta
        </Link>
      </div>
    </main>
  );
}
