import "server-only";
import { enviarPush } from "./send";
import { subsDeCliente, subsPorTipo } from "./targets";

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
  try {
    await enviarPush(await subsDeCliente(clienteId), {
      title: "¡Recompensa lista! 🎉",
      body: "Tu próximo corte va por la casa. Pásalo a canjear.",
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
  try {
    const t = CITA_TEXTO[evento];
    await enviarPush(await subsDeCliente(clienteId), {
      title: t.title,
      body: t.body(cuandoGT(iniciaIso)),
      url: "/perfil",
      tag: `cita-${evento}`,
    });
  } catch {}
}

/** Aviso al staff: un cliente se registró solo desde la app. */
export async function pushNuevoClienteStaff(nombre: string): Promise<void> {
  try {
    await enviarPush(await subsPorTipo("staff"), {
      title: "Nuevo cliente 🙌",
      body: `${nombre} acaba de crear su cuenta.`,
      url: "/admin/clientes",
      tag: "nuevo-cliente",
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
    });
  } catch {}
}
