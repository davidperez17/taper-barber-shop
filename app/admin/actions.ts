"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStaff } from "@/lib/queries/staff";

export interface AuthState {
  error?: string;
}

export async function loginStaff(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!email || !password) return { error: "Ingresa email y contraseña." };

  const sb = await createClient();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: "Credenciales inválidas." };

  // Verificar que sea staff activo (no cualquier usuario auth).
  const {
    data: { user },
  } = await sb.auth.getUser();
  const { data: staff } = await sb
    .from("staff")
    .select("activo")
    .eq("user_id", user!.id)
    .single();

  if (!staff?.activo) {
    await sb.auth.signOut();
    return { error: "Esta cuenta no tiene acceso al panel." };
  }

  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutStaff(): Promise<void> {
  const sb = await createClient();
  await sb.auth.signOut();
  redirect("/admin/login");
}

// ── Registro de venta (POS) ─────────────────────────────────────
export interface VentaItemInput {
  tipo: "servicio" | "producto";
  servicio_id?: string;
  producto_id?: string;
  nombre: string;
  precio: number;
  cantidad: number;
}

export interface VentaInput {
  clienteId: string;
  barberoId: string | null;
  metodo: "efectivo" | "tarjeta" | "transferencia";
  canjear: boolean;
  items: VentaItemInput[];
}

export type VentaResult = { ok: true; total: number } | { ok: false; error: string };

export async function recordVenta(input: VentaInput): Promise<VentaResult> {
  if (input.items.length === 0) return { ok: false, error: "Agrega al menos un servicio o producto." };

  const sb = await createClient();
  const { data, error } = await sb.rpc("record_venta", {
    p_cliente_id: input.clienteId,
    p_barbero_id: input.barberoId,
    p_metodo: input.metodo,
    p_canjear: input.canjear,
    p_items: input.items,
  });

  if (error) return { ok: false, error: "No se pudo registrar la venta. Intenta de nuevo." };
  return { ok: true, total: Number((data as { total: number }).total) };
}

// ── Alta rápida de cliente desde el panel ───────────────────────
export interface NuevoClienteState {
  error?: string;
}

export async function registrarClienteAdmin(
  _prev: NuevoClienteState,
  formData: FormData,
): Promise<NuevoClienteState> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const correo = String(formData.get("correo") ?? "").trim();

  if (!nombre) return { error: "Escribe el nombre." };
  if (telefono.replace(/\D/g, "").length < 8) return { error: "Teléfono inválido." };

  const sb = await createClient();
  const { data, error } = await sb.rpc("register_cliente", {
    p_nombre: nombre,
    p_telefono: telefono,
    p_correo: correo || null,
  });

  if (error) {
    return {
      error: error.message.includes("teléfono")
        ? "Ya existe un cliente con ese teléfono."
        : "No se pudo registrar. Intenta de nuevo.",
    };
  }

  redirect(`/admin/venta/${(data as { id: string }).id}`);
}

// ── CRM: ficha de cliente ───────────────────────────────────────
export interface ActionResult {
  ok: boolean;
  error?: string;
}

/** Reset del PIN del cliente (dueño/admin). El cliente crea uno nuevo al ingresar. */
export async function resetPinCliente(clienteId: string): Promise<ActionResult> {
  const staff = await getStaff();
  if (staff?.rol !== "dueno" && staff?.rol !== "admin") {
    return { ok: false, error: "No autorizado." };
  }
  const sb = await createClient();
  const { error } = await sb.rpc("reset_cliente_pin", { p_cliente_id: clienteId });
  if (error) return { ok: false, error: "No se pudo reiniciar el PIN." };
  revalidatePath(`/admin/clientes/${clienteId}`);
  return { ok: true };
}

export async function addNota(clienteId: string, texto: string): Promise<ActionResult> {
  const limpio = texto.trim();
  if (!limpio) return { ok: false, error: "Escribe la nota." };

  const sb = await createClient();
  const staff = await getStaff();
  const { error } = await sb.from("cliente_notas").insert({
    cliente_id: clienteId,
    autor_id: staff?.id ?? null,
    texto: limpio,
  });
  if (error) return { ok: false, error: "No se pudo guardar la nota." };
  revalidatePath(`/admin/clientes/${clienteId}`);
  return { ok: true };
}

export async function deleteNota(notaId: string, clienteId: string): Promise<ActionResult> {
  const sb = await createClient();
  const { error } = await sb.from("cliente_notas").delete().eq("id", notaId);
  if (error) return { ok: false, error: "No se pudo borrar." };
  revalidatePath(`/admin/clientes/${clienteId}`);
  return { ok: true };
}

export async function addEtiqueta(clienteId: string, etiqueta: string): Promise<ActionResult> {
  const limpia = etiqueta.trim().toLowerCase();
  if (!limpia) return { ok: false, error: "Etiqueta vacía." };

  const sb = await createClient();
  const { error } = await sb.from("cliente_etiquetas").insert({ cliente_id: clienteId, etiqueta: limpia });
  if (error && !error.message.includes("duplicate")) return { ok: false, error: "No se pudo agregar." };
  revalidatePath(`/admin/clientes/${clienteId}`);
  return { ok: true };
}

export async function removeEtiqueta(clienteId: string, etiqueta: string): Promise<ActionResult> {
  const sb = await createClient();
  const { error } = await sb.from("cliente_etiquetas").delete().eq("cliente_id", clienteId).eq("etiqueta", etiqueta);
  if (error) return { ok: false, error: "No se pudo quitar." };
  revalidatePath(`/admin/clientes/${clienteId}`);
  return { ok: true };
}

export async function updateCliente(
  clienteId: string,
  datos: { nombre: string; telefono: string; correo: string },
): Promise<ActionResult> {
  const nombre = datos.nombre.trim();
  const telefono = datos.telefono.trim();
  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };
  if (telefono.replace(/\D/g, "").length < 8) return { ok: false, error: "Teléfono inválido." };

  const sb = await createClient();
  const { error } = await sb
    .from("clientes")
    .update({ nombre, telefono, correo: datos.correo.trim() || null })
    .eq("id", clienteId);

  if (error) {
    return { ok: false, error: error.message.includes("duplicate") ? "Ese teléfono ya está en uso." : "No se pudo guardar." };
  }
  revalidatePath(`/admin/clientes/${clienteId}`);
  return { ok: true };
}

// ── Cierre de caja ──────────────────────────────────────────────
export async function crearMovimientoCaja(
  tipo: "egreso" | "ingreso",
  monto: number,
  motivo: string,
): Promise<ActionResult> {
  if (!(monto > 0)) return { ok: false, error: "Monto inválido." };
  const sb = await createClient();
  const { error } = await sb.rpc("caja_movimiento_crear", { p_tipo: tipo, p_monto: monto, p_motivo: motivo });
  if (error) return { ok: false, error: error.message.includes("cerrada") ? "La caja del día ya está cerrada." : "No se pudo registrar." };
  revalidatePath("/admin/caja");
  return { ok: true };
}

export async function borrarMovimientoCaja(id: string): Promise<ActionResult> {
  const sb = await createClient();
  const { error } = await sb.rpc("caja_movimiento_borrar", { p_id: id });
  if (error) return { ok: false, error: "No se pudo borrar." };
  revalidatePath("/admin/caja");
  return { ok: true };
}

export async function cerrarCaja(
  fecha: string,
  fondoInicial: number,
  efectivoContado: number,
  notas: string,
): Promise<ActionResult> {
  const sb = await createClient();
  const { error } = await sb.rpc("caja_cerrar", {
    p_fecha: fecha,
    p_fondo_inicial: fondoInicial,
    p_efectivo_contado: efectivoContado,
    p_notas: notas,
  });
  if (error) return { ok: false, error: error.message.includes("cerrada") ? "La caja de ese día ya está cerrada." : "No se pudo cerrar la caja." };
  revalidatePath("/admin/caja");
  return { ok: true };
}

// ── CRM: catálogo (escritura solo admin/dueño vía RLS) ──────────
const RLS_DENY = "No tienes permiso para esta acción.";

function catalogoError(msg: string): string {
  return msg.toLowerCase().includes("row-level") || msg.toLowerCase().includes("policy")
    ? RLS_DENY
    : "No se pudo guardar.";
}

export async function saveServicio(input: {
  id?: string;
  nombre: string;
  precio: number;
  categoria: string;
  duracion_min: number | null;
  cuenta_lealtad: boolean;
  orden: number;
  imagen_url: string | null;
}): Promise<ActionResult> {
  if (!input.nombre.trim()) return { ok: false, error: "El nombre es obligatorio." };
  if (input.precio < 0) return { ok: false, error: "Precio inválido." };

  const sb = await createClient();
  const fila = {
    nombre: input.nombre.trim(),
    precio: input.precio,
    categoria: input.categoria.trim() || null,
    duracion_min: input.duracion_min,
    cuenta_lealtad: input.cuenta_lealtad,
    orden: input.orden,
    imagen_url: input.imagen_url,
  };
  const { error } = input.id
    ? await sb.from("servicios").update(fila).eq("id", input.id)
    : await sb.from("servicios").insert(fila);
  if (error) return { ok: false, error: catalogoError(error.message) };
  revalidatePath("/admin/catalogo");
  return { ok: true };
}

export async function saveProducto(input: {
  id?: string;
  nombre: string;
  precio: number;
  categoria: string;
  imagen_url: string | null;
}): Promise<ActionResult> {
  if (!input.nombre.trim()) return { ok: false, error: "El nombre es obligatorio." };
  if (input.precio < 0) return { ok: false, error: "Precio inválido." };

  const sb = await createClient();
  const fila = { nombre: input.nombre.trim(), precio: input.precio, categoria: input.categoria.trim() || null, imagen_url: input.imagen_url };
  const { error } = input.id
    ? await sb.from("productos").update(fila).eq("id", input.id)
    : await sb.from("productos").insert(fila);
  if (error) return { ok: false, error: catalogoError(error.message) };
  revalidatePath("/admin/catalogo");
  return { ok: true };
}

export async function saveBarbero(input: { id?: string; nombre: string }): Promise<ActionResult> {
  if (!input.nombre.trim()) return { ok: false, error: "El nombre es obligatorio." };
  const sb = await createClient();
  const fila = { nombre: input.nombre.trim() };
  const { error } = input.id
    ? await sb.from("barberos").update(fila).eq("id", input.id)
    : await sb.from("barberos").insert(fila);
  if (error) return { ok: false, error: catalogoError(error.message) };
  revalidatePath("/admin/catalogo");
  return { ok: true };
}

export async function toggleActivo(
  tabla: "servicios" | "productos" | "barberos",
  id: string,
  activo: boolean,
): Promise<ActionResult> {
  const sb = await createClient();
  const { error } = await sb.from(tabla).update({ activo }).eq("id", id);
  if (error) return { ok: false, error: catalogoError(error.message) };
  revalidatePath("/admin/catalogo");
  return { ok: true };
}

export async function updateConfigLealtad(cortes_objetivo: number, ventana_meses: number): Promise<ActionResult> {
  if (cortes_objetivo < 1 || cortes_objetivo > 50) return { ok: false, error: "Cortes objetivo entre 1 y 50." };
  if (ventana_meses < 1 || ventana_meses > 60) return { ok: false, error: "Ventana entre 1 y 60 meses." };

  const sb = await createClient();
  const { error } = await sb.from("config_lealtad").update({ cortes_objetivo, ventana_meses }).eq("id", 1);
  if (error) return { ok: false, error: catalogoError(error.message) };
  revalidatePath("/admin/catalogo");
  return { ok: true };
}
