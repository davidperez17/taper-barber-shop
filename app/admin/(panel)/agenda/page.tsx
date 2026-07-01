import { redirect } from "next/navigation";
import { getStaff } from "@/lib/queries/staff";
import { getCatalogo } from "@/lib/queries/admin";
import { getCitasDelDia, hoyGT } from "@/lib/queries/agenda";
import { AgendaManager } from "@/components/admin/AgendaManager";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");

  const sp = await searchParams;
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(sp.d ?? "") ? sp.d! : hoyGT();

  const [citas, catalogo] = await Promise.all([getCitasDelDia(fecha), getCatalogo()]);

  return (
    <AgendaManager
      fecha={fecha}
      hoy={hoyGT()}
      citas={citas}
      barberos={catalogo.barberos}
      servicios={catalogo.servicios}
    />
  );
}
