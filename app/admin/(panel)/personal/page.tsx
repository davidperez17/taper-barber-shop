import { redirect } from "next/navigation";
import { getStaff } from "@/lib/queries/staff";
import { getPersonal } from "@/lib/queries/personal";
import { getSucursales } from "@/lib/sucursal";
import { PersonalManager } from "@/components/admin/PersonalManager";

export default async function PersonalPage() {
  const staff = await getStaff();
  if (staff?.rol !== "dueno") redirect("/admin");

  const [personal, sucursales] = await Promise.all([getPersonal(), getSucursales()]);
  return (
    <PersonalManager
      personal={personal}
      yoId={staff.id}
      sucursales={sucursales.map((s) => ({ id: s.id, nombre: s.nombre }))}
    />
  );
}
