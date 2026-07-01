import { redirect } from "next/navigation";
import { getStaff } from "@/lib/queries/staff";
import { getSucursalActiva } from "@/lib/sucursal";
import { getInventario } from "@/lib/queries/inventario";
import { InventarioManager } from "@/components/admin/InventarioManager";

export default async function InventarioPage() {
  const staff = await getStaff();
  if (staff?.rol !== "admin" && staff?.rol !== "dueno") redirect("/admin");

  const sucursalId = await getSucursalActiva(staff);
  const productos = await getInventario(sucursalId);
  return <InventarioManager productos={productos} />;
}
