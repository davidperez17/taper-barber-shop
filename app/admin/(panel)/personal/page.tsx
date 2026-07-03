import { redirect } from "next/navigation";
import { getStaff } from "@/lib/queries/staff";
import { getPersonal, getBarberosParaVinculo } from "@/lib/queries/personal";
import { getSucursales } from "@/lib/sucursal";
import { PersonalManager } from "@/components/admin/PersonalManager";

export default async function PersonalPage() {
  const staff = await getStaff();
  if (staff?.rol !== "dueno") redirect("/admin");

  const [personal, sucursales, barberos] = await Promise.all([
    getPersonal(), getSucursales(), getBarberosParaVinculo(),
  ]);
  return (
    <PersonalManager
      personal={personal}
      yoId={staff.id}
      sucursales={sucursales.map((s) => ({ id: s.id, nombre: s.nombre }))}
      barberos={barberos}
    />
  );
}
