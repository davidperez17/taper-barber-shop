import { NextResponse, type NextRequest } from "next/server";
import { createAdmin } from "@/lib/supabase/admin";
import { pushRecordatorioCita, pushReactivacion } from "@/lib/push/eventos";

// web-push necesita runtime Node (no Edge). Nunca cachear.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIAS_INACTIVO = 45; // umbral para reactivación
const THROTTLE_DIAS = 30; // no reactivar al mismo cliente antes de N días
const REACT_MAX = 100; // tope de reactivaciones por corrida
const VENTANA_MIN = 90; // recordar citas que empiezan dentro de esta ventana

/** Recordatorios de cita: confirmadas y próximas, una sola vez. */
async function recordatorios(admin: ReturnType<typeof createAdmin>): Promise<number> {
  const ahora = new Date();
  const limite = new Date(ahora.getTime() + VENTANA_MIN * 60_000);
  const { data } = await admin
    .from("citas")
    .select("id, cliente_id, inicia_en")
    .eq("estado", "confirmada")
    .eq("recordatorio_enviado", false)
    .not("cliente_id", "is", null)
    .gte("inicia_en", ahora.toISOString())
    .lte("inicia_en", limite.toISOString());

  let enviados = 0;
  for (const c of data ?? []) {
    await pushRecordatorioCita(c.cliente_id as string, c.inicia_en as string);
    await admin.from("citas").update({ recordatorio_enviado: true }).eq("id", c.id);
    enviados++;
  }
  return enviados;
}

/** Reactivación: clientes inactivos con suscripción, con throttle. */
async function reactivacion(admin: ReturnType<typeof createAdmin>): Promise<number> {
  const [{ data: inactivos }, { data: subs }, { data: logs }] = await Promise.all([
    admin.rpc("clientes_inactivos", { p_dias: DIAS_INACTIVO }),
    admin.from("push_subscriptions").select("owner_id").eq("owner_type", "cliente"),
    admin
      .from("notificaciones_log")
      .select("owner_id")
      .eq("tipo", "reactivacion")
      .gte("created_at", new Date(Date.now() - THROTTLE_DIAS * 86_400_000).toISOString()),
  ]);

  const conSub = new Set((subs ?? []).map((s) => s.owner_id as string));
  const yaAvisados = new Set((logs ?? []).map((l) => l.owner_id as string));

  let enviados = 0;
  for (const cl of (inactivos ?? []) as { id: string; nombre: string; ultima_visita: string | null }[]) {
    if (enviados >= REACT_MAX) break;
    if (!cl.ultima_visita) continue; // nunca visitó → no es reactivación
    if (!conSub.has(cl.id) || yaAvisados.has(cl.id)) continue;

    const n = await pushReactivacion(cl.id, cl.nombre);
    if (n > 0) {
      await admin.from("notificaciones_log").insert({ owner_type: "cliente", owner_id: cl.id, tipo: "reactivacion" });
      enviados++;
    }
  }
  return enviados;
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdmin();
  const [recordatoriosEnviados, reactivados] = await Promise.all([recordatorios(admin), reactivacion(admin)]);

  return NextResponse.json({ ok: true, recordatoriosEnviados, reactivados });
}
