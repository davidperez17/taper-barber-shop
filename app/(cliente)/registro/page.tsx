"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerCliente, type FormState } from "@/app/(cliente)/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { IconChevronLeft } from "@/components/icons";

const initial: FormState = {};

export default function RegistroPage() {
  const [state, action, pending] = useActionState(registerCliente, initial);

  return (
    <main className="min-h-dvh animate-fade-up overflow-auto px-6 pb-8 pt-16">
      <Link href="/" className="mb-7 inline-flex min-h-11 items-center gap-1.5 text-[15px] text-muted hover:text-ink">
        <IconChevronLeft /> Atrás
      </Link>

      <h1 className="font-display text-[32px] font-bold leading-tight tracking-[-0.01em] text-ink">Crea tu cuenta</h1>
      <p className="mb-7 mt-1.5 text-sm text-muted">Tarda menos de 1 minuto</p>

      <form action={action}>
        <Input label="Nombre completo" name="nombre" placeholder="Tu nombre" autoFocus autoComplete="name" required />
        <Input label="Teléfono" name="telefono" prefix="+502" placeholder="0000 0000" inputMode="tel" autoComplete="tel" required />
        <Input label="Correo" hint="· opcional" name="correo" placeholder="tu@correo.com" inputMode="email" autoComplete="email" />

        {state.error && (
          <p role="alert" className="mb-4 text-sm text-danger">{state.error}</p>
        )}

        <Button type="submit" loading={pending}>Crear mi cuenta</Button>
      </form>

      <p className="mt-4 text-center text-xs leading-relaxed text-subtle">
        Al continuar aceptas los términos de uso<br />y la política de privacidad.
      </p>
    </main>
  );
}
