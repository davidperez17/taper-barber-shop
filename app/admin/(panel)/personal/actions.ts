"use server";

import { revalidatePath } from "next/cache";
import { getStaff, type RolStaff } from "@/lib/queries/staff";
import { createAdmin } from "@/lib/supabase/admin";

export interface PersonalResult {
  ok: boolean;
  error?: string;
}

const ROLES: RolStaff[] = ["cajero", "barbero", "admin", "dueno"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASS = 8;

/** Devuelve el staff actual solo si es dueño, o null. */
async function soloDueno() {
  const yo = await getStaff();
  return yo?.rol === "dueno" ? yo : null;
}

function validaBase(nombre: string, rol: RolStaff): string | null {
  if (!nombre.trim()) return "El nombre es obligatorio.";
  if (!ROLES.includes(rol)) return "Rol inválido.";
  return null;
}

export async function crearStaff(input: {
  nombre: string;
  email: string;
  password: string;
  rol: RolStaff;
}): Promise<PersonalResult> {
  if (!(await soloDueno())) return { ok: false, error: "Solo el dueño puede gestionar el personal." };

  const nombre = input.nombre.trim();
  const email = input.email.trim().toLowerCase();
  const base = validaBase(nombre, input.rol);
  if (base) return { ok: false, error: base };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Email inválido." };
  if (input.password.length < MIN_PASS) return { ok: false, error: `La contraseña debe tener al menos ${MIN_PASS} caracteres.` };

  const admin = createAdmin();
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  });
  if (authErr || !created?.user) {
    const msg = (authErr?.message ?? "").toLowerCase();
    if (msg.includes("registered") || msg.includes("already")) return { ok: false, error: "Ya existe una cuenta con ese email." };
    return { ok: false, error: "No se pudo crear el usuario." };
  }

  const { error: insErr } = await admin.from("staff").insert({
    user_id: created.user.id,
    nombre,
    email,
    rol: input.rol,
    activo: true,
  });
  if (insErr) {
    // Rollback: no dejar un usuario Auth huérfano sin fila de staff.
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: "No se pudo registrar al integrante." };
  }

  revalidatePath("/admin/personal");
  return { ok: true };
}

export async function actualizarStaff(
  id: string,
  input: { nombre: string; rol: RolStaff },
): Promise<PersonalResult> {
  const yo = await soloDueno();
  if (!yo) return { ok: false, error: "Solo el dueño puede gestionar el personal." };

  const nombre = input.nombre.trim();
  const base = validaBase(nombre, input.rol);
  if (base) return { ok: false, error: base };
  if (id === yo.id && input.rol !== "dueno") {
    return { ok: false, error: "No puedes quitarte a ti mismo el rol de dueño." };
  }

  const admin = createAdmin();
  const { error } = await admin.from("staff").update({ nombre, rol: input.rol }).eq("id", id);
  if (error) {
    if (error.message.includes("dueño")) return { ok: false, error: "Debe quedar al menos un dueño activo." };
    return { ok: false, error: "No se pudo guardar." };
  }
  revalidatePath("/admin/personal");
  return { ok: true };
}

export async function cambiarActivoStaff(id: string, activo: boolean): Promise<PersonalResult> {
  const yo = await soloDueno();
  if (!yo) return { ok: false, error: "Solo el dueño puede gestionar el personal." };
  if (id === yo.id && !activo) return { ok: false, error: "No puedes desactivar tu propia cuenta." };

  const admin = createAdmin();
  const { error } = await admin.from("staff").update({ activo }).eq("id", id);
  if (error) {
    if (error.message.includes("dueño")) return { ok: false, error: "Debe quedar al menos un dueño activo." };
    return { ok: false, error: "No se pudo actualizar." };
  }
  revalidatePath("/admin/personal");
  return { ok: true };
}

export async function resetPasswordStaff(id: string, password: string): Promise<PersonalResult> {
  if (!(await soloDueno())) return { ok: false, error: "Solo el dueño puede gestionar el personal." };
  if (password.length < MIN_PASS) return { ok: false, error: `La contraseña debe tener al menos ${MIN_PASS} caracteres.` };

  const admin = createAdmin();
  const { data: fila } = await admin.from("staff").select("user_id").eq("id", id).single();
  if (!fila?.user_id) return { ok: false, error: "Integrante sin usuario de acceso." };

  const { error } = await admin.auth.admin.updateUserById(fila.user_id, { password });
  if (error) return { ok: false, error: "No se pudo cambiar la contraseña." };
  return { ok: true };
}
