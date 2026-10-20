"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdmin } from "@/lib/supabase/admin";
import { setQrToken, clearQrToken, getQrToken } from "@/lib/session";
import { pushNuevoClienteStaff } from "@/lib/push/eventos";
import type { ClienteInfo } from "@/lib/types";

export interface FormState {
  error?: string;
  // Eco de lo escrito (registro): React 19 resetea el form tras cada submit y
  // sin esto un error (teléfono duplicado, PIN) borraba todos los campos.
  valores?: { nombre: string; telefono: string; correo: string };
}

const esPinValido = (pin: string) => /^\d{6}$/.test(pin);

/** Registro rápido: nombre + teléfono + PIN → crea cuenta, abre sesión. */
export async function registerCliente(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const correo = String(formData.get("correo") ?? "").trim();
  const pin = String(formData.get("pin") ?? "");
  const pin2 = String(formData.get("pin2") ?? "");
  const valores = { nombre, telefono, correo };
  // Largo máximo del nombre (evita spam en el push "cliente nuevo" al staff).
  const NOMBRE_MAX = 60;

  if (!nombre) return { error: "Escribe tu nombre.", valores };
  if (nombre.length > NOMBRE_MAX) return { error: `El nombre admite máximo ${NOMBRE_MAX} caracteres.`, valores };
  if (telefono.replace(/\D/g, "").length < 8) return { error: "Escribe un teléfono válido.", valores };
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return { error: "Escribe un correo válido.", valores };
  if (!esPinValido(pin)) return { error: "El PIN debe ser de 6 dígitos.", valores };
  if (pin !== pin2) return { error: "Los PIN no coinciden.", valores };

  const sb = await createClient();
  const { data, error } = await sb.rpc("register_cliente", {
    p_nombre: nombre,
    p_telefono: telefono,
    p_correo: correo || null,
    p_pin: pin,
  });

  if (error) {
    return {
      error: error.message.includes("teléfono")
        ? "Ya existe una cuenta con ese teléfono. Inicia sesión."
        : "No pudimos crear tu cuenta. Intenta de nuevo.",
      valores,
    };
  }

  await setQrToken((data as ClienteInfo).qr_token);
  await pushNuevoClienteStaff(nombre);
  redirect("/tarjeta");
}

/** Paso 1 del login: decide si la cuenta pide PIN o necesita configurarlo. */
export async function estadoTelefono(
  telefono: string,
): Promise<"no_existe" | "necesita_pin" | "con_pin" | "error"> {
  if (telefono.replace(/\D/g, "").length < 8) return "no_existe";
  const sb = await createClient();
  const { data, error } = await sb.rpc("cliente_login_estado", { p_telefono: telefono });
  if (error) return "error";
  return (data as "no_existe" | "necesita_pin" | "con_pin") ?? "error";
}

/** Paso 2 del login: teléfono + PIN, con lockout. */
export async function loginCliente(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const telefono = String(formData.get("telefono") ?? "").trim();
  const pin = String(formData.get("pin") ?? "");
  if (!esPinValido(pin)) return { error: "Ingresa tu PIN de 6 dígitos." };

  const sb = await createClient();
  const { data, error } = await sb.rpc("login_cliente", { p_telefono: telefono, p_pin: pin });
  if (error) return { error: "No pudimos verificar tu cuenta." };

  const res = data as
    | { ok: true; qr_token: string }
    | { ok: false; error: string; restantes?: number; segundos?: number };

  if (!res.ok) {
    if (res.error === "bloqueado") {
      const min = Math.max(1, Math.ceil((res.segundos ?? 300) / 60));
      return { error: `Demasiados intentos. Espera ${min} min e intenta de nuevo.` };
    }
    if (res.error === "pin_incorrecto") {
      const r = res.restantes ?? 0;
      return { error: `PIN incorrecto. Te queda${r === 1 ? "" : "n"} ${r} intento${r === 1 ? "" : "s"}.` };
    }
    if (res.error === "necesita_pin") return { error: "Configura tu PIN para continuar." };
    return { error: "No encontramos una cuenta con ese teléfono." };
  }

  await setQrToken(res.qr_token);
  redirect("/tarjeta");
}

/** Setup de PIN para cuentas existentes sin PIN. */
export async function crearPin(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const telefono = String(formData.get("telefono") ?? "").trim();
  const pin = String(formData.get("pin") ?? "");
  const pin2 = String(formData.get("pin2") ?? "");
  if (!esPinValido(pin)) return { error: "El PIN debe ser de 6 dígitos." };
  if (pin !== pin2) return { error: "Los PIN no coinciden." };

  const sb = await createClient();
  const { data, error } = await sb.rpc("set_cliente_pin", { p_telefono: telefono, p_pin: pin });
  if (error || !data) return { error: "No pudimos configurar tu PIN. Intenta de nuevo." };

  await setQrToken(data as string);
  redirect("/tarjeta");
}

/** endpoint: suscripción push de este teléfono, para que deje de ser de este cliente. */
export async function logout(endpoint?: string | null): Promise<void> {
  const token = await getQrToken();
  if (endpoint && token) {
    const admin = createAdmin();
    const { data } = await admin.from("clientes").select("id").eq("qr_token", token).maybeSingle();
    if (data) {
      await admin
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", endpoint)
        .eq("owner_type", "cliente")
        .eq("owner_id", data.id);
    }
  }
  await clearQrToken();
  redirect("/");
}
