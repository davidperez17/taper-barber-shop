"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { registerCliente, type FormState } from "@/app/(cliente)/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PinInput } from "@/components/ui/PinInput";
import { IconChevronLeft } from "@/components/icons";

const initial: FormState = {};

export default function RegistroPage() {
  const [state, action, pending] = useActionState(registerCliente, initial);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  // Validación local (PIN distinto) antes de ir al servidor.
  const [errLocal, setErrLocal] = useState<string | null>(null);

  const validar = (e: React.FormEvent<HTMLFormElement>) => {
    // preventDefault en onSubmit cancela la action (no hay viaje al servidor).
    if (pin !== pin2) {
      e.preventDefault();
      setErrLocal("Los PIN no coinciden.");
      return;
    }
    setErrLocal(null);
  };
  const error = errLocal ?? state.error;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[440px] animate-fade-up overflow-auto px-6 pb-8 pt-16 sm:pt-24">
      <Link href="/" className="mb-7 inline-flex min-h-11 items-center gap-1.5 text-[15px] text-muted hover:text-ink">
        <IconChevronLeft /> Atrás
      </Link>

      <h1 className="font-display text-[32px] font-bold leading-tight tracking-[-0.01em] text-ink">Crea tu cuenta</h1>
      <p className="mb-7 mt-1.5 text-sm text-muted">Tarda menos de 1 minuto</p>

      {/* key: remonta los inputs con los valores devueltos tras un error
          (React 19 resetea el form tras cada submit). */}
      <form action={action} onSubmit={validar} key={state.error ?? ""}>
        <Input label="Nombre completo" name="nombre" placeholder="Tu nombre" autoComplete="name" maxLength={60} required defaultValue={state.valores?.nombre} />
        <Input label="Teléfono" name="telefono" prefix="+502" placeholder="0000 0000" inputMode="tel" autoComplete="tel" required defaultValue={state.valores?.telefono} />
        <Input label="Correo" hint="· opcional" name="correo" type="email" placeholder="tu@correo.com" inputMode="email" autoComplete="email" defaultValue={state.valores?.correo} />

        <div className="mb-4"><PinInput value={pin} onChange={(v) => { setPin(v); setErrLocal(null); }} name="pin" label="Crea un PIN (6 dígitos)" /></div>
        <div className="mb-5"><PinInput value={pin2} onChange={(v) => { setPin2(v); setErrLocal(null); }} name="pin2" label="Confirma tu PIN" /></div>

        {error && (
          <p role="alert" className="mb-4 text-sm text-danger">{error}</p>
        )}

        <Button type="submit" loading={pending} disabled={pin.length < 6 || pin2.length < 6}>Crear mi cuenta</Button>
      </form>

      <p className="mt-4 text-center text-xs leading-relaxed text-subtle">
        Al continuar aceptas los términos de uso<br />y la política de privacidad.
      </p>
    </main>
  );
}
