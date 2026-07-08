import { redirect } from "next/navigation";
import { getClienteFicha } from "@/lib/queries/clientes";
import { getStaff } from "@/lib/queries/staff";
import { getSucursalActiva } from "@/lib/sucursal";
import { ClienteFicha } from "@/components/admin/ClienteFicha";

export default async function ClienteFichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  const sucursalId = await getSucursalActiva(staff);
  const ficha = await getClienteFicha(id, sucursalId);
  if (!ficha) redirect("/admin/clientes");

  const puedeGestionar = staff?.rol === "dueno" || staff?.rol === "admin";
  return <ClienteFicha ficha={ficha} puedeResetPin={puedeGestionar} puedeGestionar={puedeGestionar} />;
}
