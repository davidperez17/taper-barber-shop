"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginCliente, type FormState } from "@/app/(cliente)/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { IconChevronLeft } from "@/components/icons";

const initial: FormState = {};

export default function IngresarPage() {
  const [state, action, pending] = useActionState(loginCliente, initial);

  return (
    <main className="min-h-dvh animate-fade-up overflow-auto px-6 pb-8 pt-16">
      <Link href="/" className="mb-7 inline-flex min-h-11 items-center gap-1.5 text-[15px] text-muted hover:text-ink">
        <IconChevronLeft /> Atrás
      </Link>

      <h1 className="font-display text-[32px] font-bold leading-tight tracking-[-0.01em] text-ink">Inicia sesión</h1>
      <p className="mb-7 mt-1.5 text-sm text-muted">Con el teléfono de tu cuenta</p>

      <form action={action}>
        <Input label="Teléfono" name="telefono" prefix="+502" placeholder="0000 0000" inputMode="tel" autoComplete="tel" autoFocus required />

        {state.error && <p role="alert" className="mb-4 text-sm text-danger">{state.error}</p>}

        <Button type="submit" loading={pending}>Entrar</Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold text-accent">Regístrate</Link>
      </p>
    </main>
  );
}
