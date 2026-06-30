"use client";

import { useActionState } from "react";
import { registrarClienteAdmin, type NuevoClienteState } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const initial: NuevoClienteState = {};

export default function RegistrarClientePage() {
  const [state, action, pending] = useActionState(registrarClienteAdmin, initial);

  return (
    <div className="animate-fade-up max-w-[440px]">
      <h1 className="font-display text-[26px] font-bold tracking-[-0.01em] text-ink">Cliente nuevo</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Alta rápida — luego registras su venta.</p>

      <form action={action}>
        <Input label="Nombre completo" name="nombre" placeholder="Nombre del cliente" autoComplete="off" autoFocus required />
        <Input label="Teléfono" name="telefono" prefix="+502" placeholder="0000 0000" inputMode="tel" required />
        <Input label="Correo" hint="· opcional" name="correo" placeholder="correo@cliente.com" inputMode="email" />

        {state.error && <p role="alert" className="mb-4 text-sm text-danger">{state.error}</p>}

        <Button type="submit" loading={pending}>Registrar y continuar</Button>
      </form>
    </div>
  );
}
