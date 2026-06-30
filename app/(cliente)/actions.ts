"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setQrToken, clearQrToken } from "@/lib/session";
import type { ClienteInfo } from "@/lib/types";

export interface FormState {
  error?: string;
}

/** Registro rápido: nombre + teléfono → crea cliente, abre sesión, va a la tarjeta. */
export async function registerCliente(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const correo = String(formData.get("correo") ?? "").trim();

  if (!nombre) return { error: "Escribe tu nombre." };
  if (telefono.replace(/\D/g, "").length < 8)
    return { error: "Escribe un teléfono válido." };

  const sb = await createClient();
  const { data, error } = await sb.rpc("register_cliente", {
    p_nombre: nombre,
    p_telefono: telefono,
    p_correo: correo || null,
  });

  if (error) {
    return {
      error: error.message.includes("teléfono")
        ? "Ya existe una cuenta con ese teléfono. Inicia sesión."
        : "No pudimos crear tu cuenta. Intenta de nuevo.",
    };
  }

  await setQrToken((data as ClienteInfo).qr_token);
  redirect("/tarjeta");
}

/** Login por teléfono (cliente existente). */
export async function loginCliente(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const telefono = String(formData.get("telefono") ?? "").trim();
  if (telefono.replace(/\D/g, "").length < 8)
    return { error: "Escribe el teléfono de tu cuenta." };

  const sb = await createClient();
  const { data, error } = await sb.rpc("login_cliente", { p_telefono: telefono });

  if (error) return { error: "No pudimos verificar tu cuenta." };
  if (!data) return { error: "No encontramos una cuenta con ese teléfono." };

  await setQrToken(data as string);
  redirect("/tarjeta");
}

export async function logout(): Promise<void> {
  await clearQrToken();
  redirect("/");
}
