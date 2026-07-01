"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStaff } from "@/lib/queries/staff";
import { getSucursalActiva } from "@/lib/sucursal";

/** Sucursal activa del staff actual (o null). Se resuelve en el servidor. */
async function sucursalActiva(): Promise<string | null> {
  const staff = await getStaff();
  return staff ? getSucursalActiva(staff) : null;
}

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
  cuponId?: string | null;
}

export type VentaResult = { ok: true; total: number } | { ok: false; error: string };

export async function recordVenta(input: VentaInput): Promise<VentaResult> {
  if (input.items.length === 0) return { ok: false, error: "Agrega al menos un servicio o producto." };

  const sb = await createClient();
  const sucursalId = await sucursalActiva();
  const params: Record<string, unknown> = {
    p_cliente_id: input.clienteId,
    p_barbero_id: input.barberoId,
    p_metodo: input.metodo,
    p_canjear: input.canjear,
    p_items: input.items,
    p_cupon_id: input.cuponId ?? null,
  };
  if (sucursalId) params.p_sucursal_id = sucursalId;
  const { data, error } = await sb.rpc("record_venta", params);

  if (error) return { ok: false, error: "No se pudo registrar la venta. Intenta de nuevo." };
  return { ok: true, total: Number((data as { total: number }).total) };
}

// ── Cupones: validación (preview en el POS) ─────────────────────
export type CuponResult =
  | { ok: true; cuponId: string; codigo: string; descuento: number }
  | { ok: false; error: string };

export async function validarCupon(codigo: string, subtotal: number): Promise<CuponResult> {
  const limpio = codigo.trim();
  if (!limpio) return { ok: false, error: "Escribe un código." };

  const sb = await createClient();
  const { data, error } = await sb.rpc("cupon_validar", { p_codigo: limpio, p_subtotal: subtotal });
  if (error) return { ok: false, error: "No se pudo validar el cupón." };

  const r = data as { ok: boolean; error?: string; cupon_id?: string; codigo?: string; descuento?: number };
  if (!r.ok) return { ok: false, error: r.error ?? "Cupón inválido." };
  return { ok: true, cuponId: r.cupon_id!, codigo: r.codigo!, descuento: Number(r.descuento) };
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
  const sucursalId = await sucursalActiva();
  const params: Record<string, unknown> = { p_tipo: tipo, p_monto: monto, p_motivo: motivo };
  if (sucursalId) params.p_sucursal_id = sucursalId;
  const { error } = await sb.rpc("caja_movimiento_crear", params);
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
  const sucursalId = await sucursalActiva();
  const params: Record<string, unknown> = {
    p_fecha: fecha,
    p_fondo_inicial: fondoInicial,
    p_efectivo_contado: efectivoContado,
    p_notas: notas,
  };
  if (sucursalId) params.p_sucursal_id = sucursalId;
  const { error } = await sb.rpc("caja_cerrar", params);
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
  const fila: Record<string, unknown> = {
    nombre: input.nombre.trim(),
    precio: input.precio,
    categoria: input.categoria.trim() || null,
    duracion_min: input.duracion_min,
    cuenta_lealtad: input.cuenta_lealtad,
    orden: input.orden,
    imagen_url: input.imagen_url,
  };
  if (!input.id) {
    const sucursalId = await sucursalActiva();
    if (sucursalId) fila.sucursal_id = sucursalId;
  }
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
  controla_stock: boolean;
  stock_min: number;
  stock_inicial?: number;
}): Promise<ActionResult> {
  if (!input.nombre.trim()) return { ok: false, error: "El nombre es obligatorio." };
  if (input.precio < 0) return { ok: false, error: "Precio inválido." };
  if (input.stock_min < 0) return { ok: false, error: "Stock mínimo inválido." };

  const sb = await createClient();
  const fila: Record<string, unknown> = {
    nombre: input.nombre.trim(),
    precio: input.precio,
    categoria: input.categoria.trim() || null,
    imagen_url: input.imagen_url,
    controla_stock: input.controla_stock,
    stock_min: input.stock_min,
  };
  // El stock se gestiona con movimientos; solo se fija el inicial al crear.
  if (!input.id) {
    fila.stock = Math.max(0, Math.round(input.stock_inicial ?? 0));
    const sucursalId = await sucursalActiva();
    if (sucursalId) fila.sucursal_id = sucursalId;
  }

  const { error } = input.id
    ? await sb.from("productos").update(fila).eq("id", input.id)
    : await sb.from("productos").insert(fila);
  if (error) return { ok: false, error: catalogoError(error.message) };
  revalidatePath("/admin/catalogo");
  revalidatePath("/admin/inventario");
  return { ok: true };
}

// ── Inventario: movimiento manual (entrada/salida/ajuste) ───────
export async function movimientoInventario(
  productoId: string,
  tipo: "entrada" | "salida" | "ajuste",
  cantidad: number,
  motivo: string,
): Promise<ActionResult> {
  if (!Number.isFinite(cantidad) || cantidad < 0) return { ok: false, error: "Cantidad inválida." };
  const sb = await createClient();
  const { error } = await sb.rpc("inventario_movimiento_crear", {
    p_producto_id: productoId,
    p_tipo: tipo,
    p_cantidad: Math.round(cantidad),
    p_motivo: motivo.trim() || null,
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("suficiente")) return { ok: false, error: "No hay stock suficiente para esa salida." };
    if (msg.includes("no controla")) return { ok: false, error: "Este producto no controla stock." };
    if (msg.includes("autorizado") || msg.includes("row-level")) return { ok: false, error: RLS_DENY };
    return { ok: false, error: "No se pudo registrar el movimiento." };
  }
  revalidatePath("/admin/inventario");
  revalidatePath("/admin/catalogo");
  return { ok: true };
}

export async function saveBarbero(input: { id?: string; nombre: string }): Promise<ActionResult> {
  if (!input.nombre.trim()) return { ok: false, error: "El nombre es obligatorio." };
  const sb = await createClient();
  const fila: Record<string, unknown> = { nombre: input.nombre.trim() };
  if (!input.id) {
    const sucursalId = await sucursalActiva();
    if (sucursalId) fila.sucursal_id = sucursalId;
  }
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

// ── Cupones: gestión (escritura solo admin/dueño vía RLS) ───────
export async function saveCupon(input: {
  id?: string;
  codigo: string;
  tipo: "porcentaje" | "monto";
  valor: number;
  min_compra: number;
  vigencia_desde: string | null;
  vigencia_hasta: string | null;
  usos_max: number | null;
  activo: boolean;
}): Promise<ActionResult> {
  const codigo = input.codigo.trim().toUpperCase();
  if (!codigo) return { ok: false, error: "El código es obligatorio." };
  if (!(input.valor > 0)) return { ok: false, error: "El valor debe ser mayor que 0." };
  if (input.tipo === "porcentaje" && input.valor > 100) return { ok: false, error: "El porcentaje no puede superar 100." };
  if (input.min_compra < 0) return { ok: false, error: "Mínimo de compra inválido." };
  if (input.usos_max != null && input.usos_max < 1) return { ok: false, error: "El límite de usos debe ser al menos 1." };
  if (input.vigencia_desde && input.vigencia_hasta && input.vigencia_hasta < input.vigencia_desde) {
    return { ok: false, error: "La vigencia final no puede ser antes de la inicial." };
  }

  const sb = await createClient();
  const fila = {
    codigo,
    tipo: input.tipo,
    valor: input.valor,
    min_compra: input.min_compra,
    vigencia_desde: input.vigencia_desde,
    vigencia_hasta: input.vigencia_hasta,
    usos_max: input.usos_max,
    activo: input.activo,
  };
  const { error } = input.id
    ? await sb.from("cupones").update(fila).eq("id", input.id)
    : await sb.from("cupones").insert(fila);
  if (error) {
    if (error.message.includes("duplicate")) return { ok: false, error: "Ya existe un cupón con ese código." };
    return { ok: false, error: catalogoError(error.message) };
  }
  revalidatePath("/admin/cupones");
  return { ok: true };
}

export async function toggleCuponActivo(id: string, activo: boolean): Promise<ActionResult> {
  const sb = await createClient();
  const { error } = await sb.from("cupones").update({ activo }).eq("id", id);
  if (error) return { ok: false, error: catalogoError(error.message) };
  revalidatePath("/admin/cupones");
  return { ok: true };
}

export async function deleteCupon(id: string): Promise<ActionResult> {
  const sb = await createClient();
  const { error } = await sb.from("cupones").delete().eq("id", id);
  if (error) return { ok: false, error: catalogoError(error.message) };
  revalidatePath("/admin/cupones");
  return { ok: true };
}

// ── Agenda: citas (gestión del staff) ───────────────────────────
export async function saveCita(input: {
  id?: string;
  clienteId: string | null;
  clienteNombre: string;
  barberoId: string | null;
  servicioId: string | null;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
  duracionMin: number;
  ubicacion: "barberia" | "domicilio";
  direccion: string;
  nota: string;
}): Promise<ActionResult> {
  const nombre = input.clienteNombre.trim();
  if (!input.clienteId && !nombre) return { ok: false, error: "Elige un cliente o escribe un nombre." };
  if (!input.fecha || !input.hora) return { ok: false, error: "Falta la fecha u hora." };
  if (input.duracionMin <= 0) return { ok: false, error: "Duración inválida." };
  if (input.ubicacion === "domicilio" && !input.direccion.trim()) {
    return { ok: false, error: "Escribe la dirección del domicilio/evento." };
  }

  // Hora local de Guatemala (UTC-6, sin horario de verano).
  const inicia = new Date(`${input.fecha}T${input.hora}:00-06:00`);
  if (Number.isNaN(inicia.getTime())) return { ok: false, error: "Fecha u hora inválida." };

  const sb = await createClient();
  const staff = await getStaff();
  const fila = {
    cliente_id: input.clienteId,
    cliente_nombre: input.clienteId ? null : nombre,
    barbero_id: input.barberoId,
    servicio_id: input.servicioId,
    inicia_en: inicia.toISOString(),
    duracion_min: input.duracionMin,
    ubicacion: input.ubicacion,
    direccion: input.ubicacion === "domicilio" ? input.direccion.trim() : null,
    nota: input.nota.trim() || null,
  };
  const sucursalId = input.id ? null : await sucursalActiva();
  const { error } = input.id
    ? await sb.from("citas").update(fila).eq("id", input.id)
    : await sb.from("citas").insert({ ...fila, creada_por: staff?.id ?? null, ...(sucursalId ? { sucursal_id: sucursalId } : {}) });
  if (error) return { ok: false, error: catalogoError(error.message) };
  revalidatePath("/admin/agenda");
  return { ok: true };
}

export async function updateEstadoCita(
  id: string,
  estado: "pendiente" | "confirmada" | "completada" | "cancelada",
): Promise<ActionResult> {
  const sb = await createClient();
  const { error } = await sb.from("citas").update({ estado }).eq("id", id);
  if (error) return { ok: false, error: catalogoError(error.message) };
  revalidatePath("/admin/agenda");
  return { ok: true };
}

export async function deleteCita(id: string): Promise<ActionResult> {
  const sb = await createClient();
  const { error } = await sb.from("citas").delete().eq("id", id);
  if (error) return { ok: false, error: catalogoError(error.message) };
  revalidatePath("/admin/agenda");
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
