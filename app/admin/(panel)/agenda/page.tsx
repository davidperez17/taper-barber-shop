import { redirect } from "next/navigation";
import { getStaff } from "@/lib/queries/staff";
import { getSucursalActiva } from "@/lib/sucursal";
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
  const fecha = fechaValida(sp.d) ? sp.d : hoyGT();

  const sucursalId = await getSucursalActiva(staff);
  const [citas, catalogo] = await Promise.all([getCitasDelDia(fecha, sucursalId), getCatalogo(sucursalId)]);

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

// "2026-13-01" pasa el regex pero revienta en toISOString(): validar que exista.
function fechaValida(d: string | undefined): d is string {
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const t = new Date(`${d}T12:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d;
}
