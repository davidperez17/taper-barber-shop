import "server-only";
import { enviarPush, ICONO_STAFF } from "./send";
import { subsDeCliente, subsDeClientes, subsPorTipo } from "./targets";
import { registrarNoti, registrarNotiClientes, registrarNotiTodosClientes } from "./inbox";
import { CANJE_HORARIO } from "@/lib/horario";
import { AVISO_RENOVACION, RENOVACION_SUCURSAL, avisoRenovacionDelMomento, avisosHalloweenDelMomento } from "@/lib/promo";
import { createAdmin } from "@/lib/supabase/admin";

// Eventos transaccionales → notificación. Cada función se aísla: nunca lanza,
// para que un fallo de push jamás rompa la operación principal (venta, cita…).

/** Fecha+hora amigable en hora local de Guatemala. */
function cuandoGT(iso: string): string {
  return new Intl.DateTimeFormat("es-GT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Guatemala",
  }).format(new Date(iso));
}

/** El cliente ganó una nueva recompensa (corte gratis disponible). */
export async function pushRecompensaLista(clienteId: string): Promise<void> {
  const titulo = "¡Recompensa lista! 🎉";
  const cuerpo = `Tu próximo corte va por la casa. Canjéalo ${CANJE_HORARIO}.`;
  await registrarNoti(clienteId, { tipo: "recompensa", titulo, cuerpo, url: "/tarjeta" });
  try {
    await enviarPush(await subsDeCliente(clienteId), {
      title: titulo,
      body: cuerpo,
      url: "/tarjeta",
      tag: "recompensa",
    });
  } catch {}
}

type CitaEvento = "creada" | "confirmada" | "cancelada";

const CITA_TEXTO: Record<CitaEvento, { title: string; body: (c: string) => string }> = {
  creada: { title: "Cita agendada 📅", body: (c) => `Te esperamos el ${c}.` },
  confirmada: { title: "Cita confirmada ✅", body: (c) => `Nos vemos el ${c}.` },
  cancelada: { title: "Cita cancelada", body: (c) => `Se canceló tu cita del ${c}. Escríbenos para reagendar.` },
};

/** Aviso al cliente registrado sobre su cita. */
export async function pushCitaCliente(clienteId: string, evento: CitaEvento, iniciaIso: string): Promise<void> {
  const t = CITA_TEXTO[evento];
  const cuerpo = t.body(cuandoGT(iniciaIso));
  await registrarNoti(clienteId, { tipo: "cita", titulo: t.title, cuerpo, url: "/perfil" });
  try {
    await enviarPush(await subsDeCliente(clienteId), {
      title: t.title,
      body: cuerpo,
      url: "/perfil",
      tag: `cita-${evento}`,
    });
  } catch {}
}

/** Recordatorio programado: la cita del cliente es hoy/próxima. */
export async function pushRecordatorioCita(clienteId: string, iniciaIso: string): Promise<number> {
  const titulo = "Recordatorio de tu cita ⏰";
  const cuerpo = `Te esperamos el ${cuandoGT(iniciaIso)}.`;
  await registrarNoti(clienteId, { tipo: "recordatorio", titulo, cuerpo, url: "/perfil" });
  try {
    const { enviadas } = await enviarPush(await subsDeCliente(clienteId), {
      title: titulo,
      body: cuerpo,
      url: "/perfil",
      tag: "recordatorio-cita",
    });
    return enviadas;
  } catch {
    return 0;
  }
}

/** Reactivación programada: cliente inactivo, invitarlo a volver. */
export async function pushReactivacion(clienteId: string, nombre: string): Promise<number> {
  const primer = nombre.trim().split(/\s+/)[0] || "";
  const titulo = "Te extrañamos 💈";
  const cuerpo = `${primer}, ¿listo para tu próximo corte? Pasa cuando quieras.`;
  await registrarNoti(clienteId, { tipo: "reactivacion", titulo, cuerpo, url: "/tarjeta" });
  try {
    const { enviadas } = await enviarPush(await subsDeCliente(clienteId), {
      title: titulo,
      body: cuerpo,
      url: "/tarjeta",
      tag: "reactivacion",
    });
    return enviadas;
  } catch {
    return 0;
  }
}

/** Aviso al staff: un cliente se registró solo desde la app. */
export async function pushNuevoClienteStaff(nombre: string): Promise<void> {
  try {
    await enviarPush(await subsPorTipo("staff"), {
      title: "Nuevo cliente 🙌",
      body: `${nombre} acaba de crear su cuenta.`,
      url: "/admin/clientes",
      tag: "nuevo-cliente",
      icon: ICONO_STAFF,
    });
  } catch {}
}

/** Aviso al staff: productos que quedaron en o bajo su mínimo tras una venta. */
export async function pushStockBajoStaff(nombres: string[]): Promise<void> {
  if (nombres.length === 0) return;
  try {
    const lista = nombres.slice(0, 3).join(", ") + (nombres.length > 3 ? "…" : "");
    await enviarPush(await subsPorTipo("staff"), {
      title: "Stock bajo ⚠️",
      body: `Revisa inventario: ${lista}.`,
      url: "/admin/inventario",
      tag: "stock-bajo",
      icon: ICONO_STAFF,
    });
  } catch {}
}

/**
 * Difusión programada que sale una sola vez: se reclama `tipo` en
 * notificaciones_log ANTES de enviar (si el envío falla no se reintenta: mejor
 * perder uno que mandarlo doble). Va a la bandeja + push de todos los clientes,
 * o solo de `clienteIds` si se pasa. Devuelve cuántos push salieron.
 */
async function difusionUnica(
  tipo: string,
  a: { titulo: string; cuerpo: string; tag: string },
  clienteIds?: string[],
): Promise<number> {
  try {
    const admin = createAdmin();
    const { data: ya } = await admin.from("notificaciones_log").select("id").eq("tipo", tipo).limit(1);
    if (ya && ya.length > 0) return 0;
    // owner_id nil = difusión global (no es de un cliente concreto).
    const { error } = await admin
      .from("notificaciones_log")
      .insert({ owner_type: "cliente", owner_id: "00000000-0000-0000-0000-000000000000", tipo });
    if (error) return 0;

    const noti = { tipo: "promo", titulo: a.titulo, cuerpo: a.cuerpo, url: "/tarjeta" };
    if (clienteIds) await registrarNotiClientes(clienteIds, noti);
    else await registrarNotiTodosClientes(noti);
    const subs = clienteIds ? await subsDeClientes(clienteIds) : await subsPorTipo("cliente");
    const r = await enviarPush(subs, {
      title: a.titulo,
      body: a.cuerpo,
      url: "/tarjeta",
      tag: a.tag,
    });
    return r.enviadas;
  } catch {
    return 0;
  }
}

/** Avisos programados de la promo de Halloween 2026 (lib/promo.ts). Borrar tras el 31-oct. */
export async function pushAvisosHalloween(): Promise<number> {
  let enviados = 0;
  for (const a of avisosHalloweenDelMomento()) {
    enviados += await difusionUnica(`halloween_2026_${a.id}`, { ...a, tag: "halloween" });
  }
  return enviados;
}

/**
 * Aviso único "barbería renovada" (lib/promo.ts), solo a clientes con cortes en
 * la sucursal renovada — mismo criterio que el banner de la tarjeta.
 * Borrar tras RENOVACION_HASTA.
 */
export async function pushAvisoRenovacion(): Promise<number> {
  if (!avisoRenovacionDelMomento()) return 0;
  const { data, error } = await createAdmin()
    .from("cliente_loyalty")
    .select("cliente_id")
    .eq("sucursal_id", RENOVACION_SUCURSAL)
    .gt("cortes_total", 0)
    .range(0, 9999);
  // Sin destinatarios fiables no se reclama el aviso: se reintenta en la próxima corrida.
  if (error || !data || data.length === 0) return 0;
  const ids = (data as { cliente_id: string }[]).map((r) => r.cliente_id);
  return difusionUnica(AVISO_RENOVACION.tipo, { ...AVISO_RENOVACION, tag: "renovacion" }, ids);
}
