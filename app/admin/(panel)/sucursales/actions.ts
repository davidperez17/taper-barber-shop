"use server";

import { revalidatePath } from "next/cache";
import { getStaff } from "@/lib/queries/staff";
import { createClient } from "@/lib/supabase/server";
import { getMaxSucursales } from "@/lib/queries/sucursales";

export interface SucursalResult {
  ok: boolean;
  error?: string;
  limite?: boolean; // true = alcanzó el límite del plan (mostrar upsell)
}

async function soloDueno() {
  const yo = await getStaff();
  return yo?.rol === "dueno" ? yo : null;
}

async function activas(sb: Awaited<ReturnType<typeof createClient>>): Promise<number> {
  const { count } = await sb.from("sucursales").select("id", { count: "exact", head: true }).eq("activo", true);
  return count ?? 0;
}

export async function crearSucursal(input: {
  nombre: string;
  direccion: string;
  telefono: string;
}): Promise<SucursalResult> {
  if (!(await soloDueno())) return { ok: false, error: "Solo el dueño gestiona las sucursales." };
  if (!input.nombre.trim()) return { ok: false, error: "El nombre es obligatorio." };

  const sb = await createClient();
  const [max, count] = await Promise.all([getMaxSucursales(), activas(sb)]);
  if (count >= max) {
    return { ok: false, limite: true, error: `Tu plan permite ${max} sucursales activas.` };
  }

  const { error } = await sb.from("sucursales").insert({
    nombre: input.nombre.trim(),
    direccion: input.direccion.trim() || null,
    telefono: input.telefono.trim() || null,
    orden: count,
  });
  if (error) return { ok: false, error: "No se pudo crear la sucursal." };
  revalidatePath("/admin/sucursales");
  return { ok: true };
}

export async function actualizarSucursal(
  id: string,
  input: { nombre: string; direccion: string; telefono: string },
): Promise<SucursalResult> {
  if (!(await soloDueno())) return { ok: false, error: "Solo el dueño gestiona las sucursales." };
  if (!input.nombre.trim()) return { ok: false, error: "El nombre es obligatorio." };

  const sb = await createClient();
  const { error } = await sb.from("sucursales").update({
    nombre: input.nombre.trim(),
    direccion: input.direccion.trim() || null,
    telefono: input.telefono.trim() || null,
  }).eq("id", id);
  if (error) return { ok: false, error: "No se pudo guardar." };
  revalidatePath("/admin/sucursales");
  return { ok: true };
}

export async function toggleSucursalActiva(id: string, activo: boolean): Promise<SucursalResult> {
  if (!(await soloDueno())) return { ok: false, error: "Solo el dueño gestiona las sucursales." };

  const sb = await createClient();
  if (activo) {
    const [max, count] = await Promise.all([getMaxSucursales(), activas(sb)]);
    if (count >= max) return { ok: false, limite: true, error: `Tu plan permite ${max} sucursales activas.` };
  } else {
    const count = await activas(sb);
    if (count <= 1) return { ok: false, error: "Debe quedar al menos una sucursal activa." };
  }

  const { error } = await sb.from("sucursales").update({ activo }).eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar." };
  revalidatePath("/admin/sucursales");
  return { ok: true };
}
