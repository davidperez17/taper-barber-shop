"use client";

import { useActionState } from "react";
import { loginStaff, type AuthState } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const initial: AuthState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginStaff, initial);

  return (
    <form action={action}>
      <input type="hidden" name="next" value={next} />
      <Input label="Email" name="email" type="email" placeholder="staff@taper.com" autoComplete="email" autoFocus required />
      <Input label="Contraseña" name="password" type="password" placeholder="••••••••" autoComplete="current-password" required />

      {state.error && <p role="alert" className="mb-4 text-sm text-danger">{state.error}</p>}

      <Button type="submit" loading={pending}>Entrar al panel</Button>
    </form>
  );
}
