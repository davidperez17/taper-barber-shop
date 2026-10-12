import { NextResponse, type NextRequest } from "next/server";
import { createAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// El SW llama aquí desde `pushsubscriptionchange`: el navegador rotó o expiró
// la suscripción y no hay página abierta para usar las server actions. No hay
// sesión fiable en ese contexto: la prueba de propiedad es la suscripción
// vieja (endpoint + secreto `auth`, que solo conocen el navegador y la DB).
// La fila conserva su dueño; solo cambian endpoint y llaves.

interface Body {
  vieja?: { endpoint?: string; auth?: string };
  nueva?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;
  const vieja = body?.vieja;
  const nueva = body?.nueva;
  if (
    !vieja?.endpoint || !vieja.auth ||
    !nueva?.endpoint?.startsWith("https://") || !nueva.keys?.p256dh || !nueva.keys.auth
  ) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const admin = createAdmin();
  const { data, error } = await admin
    .from("push_subscriptions")
    .update({
      endpoint: nueva.endpoint,
      p256dh: nueva.keys.p256dh,
      auth: nueva.keys.auth,
      last_seen: new Date().toISOString(),
    })
    .eq("endpoint", vieja.endpoint)
    .eq("auth", vieja.auth)
    .select("id");

  // 23505: la nueva ya estaba guardada (la app la re-sincronizó antes) →
  // basta con quitar la vieja, que ya no recibe nada.
  if (error?.code === "23505") {
    await admin.from("push_subscriptions").delete().eq("endpoint", vieja.endpoint).eq("auth", vieja.auth);
    return NextResponse.json({ ok: true });
  }
  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: (data?.length ?? 0) > 0 });
}
