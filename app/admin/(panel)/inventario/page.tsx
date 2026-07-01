import { redirect } from "next/navigation";
import { getStaff } from "@/lib/queries/staff";
import { getInventario } from "@/lib/queries/inventario";
import { InventarioManager } from "@/components/admin/InventarioManager";

export default async function InventarioPage() {
  const staff = await getStaff();
  if (staff?.rol !== "admin" && staff?.rol !== "dueno") redirect("/admin");

  const productos = await getInventario();
  return <InventarioManager productos={productos} />;
}
