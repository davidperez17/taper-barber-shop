"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import {
  estadoTelefono,
  loginCliente,
  crearPin,
  type FormState,
} from "@/app/(cliente)/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PinInput } from "@/components/ui/PinInput";
import { IconChevronLeft } from "@/components/icons";
import { InstallPWA } from "@/components/InstallPWA";

const initial: FormState = {};
type Paso = "telefono" | "pin" | "setup";

export default function IngresarPage() {
  const [paso, setPaso] = useState<Paso>("telefono");
  const [telefono, setTelefono] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [errTel, setErrTel] = useState<string | null>(null);
  const [checando, startCheck] = useTransition();

  const [loginState, loginAction, loginPending] = useActionState(loginCliente, initial);
  const [setupState, setupAction, setupPending] = useActionState(crearPin, initial);

  const continuar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrTel(null);
    const tel = new FormData(e.currentTarget).get("telefono")?.toString().trim() ?? "";
    if (tel.replace(/\D/g, "").length < 8) { setErrTel("Escribe un teléfono válido."); return; }
    startCheck(async () => {
      const estado = await estadoTelefono(tel);
      if (estado === "con_pin") { setTelefono(tel); setPin(""); setPaso("pin"); }
      else if (estado === "necesita_pin") { setTelefono(tel); setPin(""); setPin2(""); setPaso("setup"); }
      else if (estado === "no_existe") setErrTel("No encontramos una cuenta con ese teléfono.");
      else setErrTel("No pudimos verificar. Intenta de nuevo.");
    });
  };

  const volver = () => { setPaso("telefono"); setPin(""); setPin2(""); };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[440px] animate-fade-up overflow-auto px-6 pb-8 pt-16 sm:pt-24">
      {paso === "telefono" ? (
        <>
          <Link href="/" className="mb-7 inline-flex min-h-11 items-center gap-1.5 text-[15px] text-muted hover:text-ink">
            <IconChevronLeft /> Atrás
          </Link>
          <h1 className="font-display text-[32px] font-bold leading-tight tracking-[-0.01em] text-ink">Inicia sesión</h1>
          <p className="mb-7 mt-1.5 text-sm text-muted">Con el teléfono de tu cuenta</p>

          <form onSubmit={continuar}>
            <Input label="Teléfono" name="telefono" prefix="+502" placeholder="0000 0000" inputMode="tel" autoComplete="tel" required />
            {errTel && <p role="alert" className="mb-4 text-sm text-danger">{errTel}</p>}
            <Button type="submit" loading={checando}>Continuar</Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted">
            ¿No tienes cuenta?{" "}
            <Link href="/registro" className="font-semibold text-accent">Regístrate</Link>
          </p>
        </>
      ) : paso === "pin" ? (
        <>
          <div className="mb-7 flex items-center justify-between">
            <Link href="/" className="inline-flex min-h-11 items-center gap-1.5 text-[15px] text-muted hover:text-ink">
              <IconChevronLeft /> Atrás
            </Link>
            <button onClick={volver} className="inline-flex min-h-11 items-center text-[15px] text-muted hover:text-ink">
              Cambiar número
            </button>
          </div>
          <h1 className="font-display text-[32px] font-bold leading-tight tracking-[-0.01em] text-ink">Ingresa tu PIN</h1>
          <p className="mb-7 mt-1.5 text-sm text-muted">6 dígitos de tu cuenta</p>

          <form action={loginAction}>
            <input type="hidden" name="telefono" value={telefono} />
            <div className="mb-5"><PinInput value={pin} onChange={setPin} name="pin" autoFocus /></div>
            {loginState.error && <p role="alert" className="mb-4 text-sm text-danger">{loginState.error}</p>}
            <Button type="submit" loading={loginPending} disabled={pin.length < 6}>Entrar</Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted">
            ¿Olvidaste tu PIN? Pídele a la barbería que lo reinicie.
          </p>
        </>
      ) : (
        <>
          <div className="mb-7 flex items-center justify-between">
            <Link href="/" className="inline-flex min-h-11 items-center gap-1.5 text-[15px] text-muted hover:text-ink">
              <IconChevronLeft /> Atrás
            </Link>
            <button onClick={volver} className="inline-flex min-h-11 items-center text-[15px] text-muted hover:text-ink">
              Cambiar número
            </button>
          </div>
          <h1 className="font-display text-[32px] font-bold leading-tight tracking-[-0.01em] text-ink">Protege tu cuenta</h1>
          <p className="mb-7 mt-1.5 text-sm text-muted">Crea un PIN de 6 dígitos para tu próximo ingreso</p>

          <form action={setupAction}>
            <input type="hidden" name="telefono" value={telefono} />
            <div className="mb-4"><PinInput value={pin} onChange={setPin} name="pin" label="Nuevo PIN" autoFocus /></div>
            <div className="mb-5"><PinInput value={pin2} onChange={setPin2} name="pin2" label="Confirma tu PIN" /></div>
            {setupState.error && <p role="alert" className="mb-4 text-sm text-danger">{setupState.error}</p>}
            <Button type="submit" loading={setupPending} disabled={pin.length < 6 || pin2.length < 6}>Guardar PIN</Button>
          </form>
        </>
      )}

      <InstallPWA />
    </main>
  );
}
