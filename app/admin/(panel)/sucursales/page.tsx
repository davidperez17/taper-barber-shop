import { redirect } from "next/navigation";
import { getStaff } from "@/lib/queries/staff";
import { getSucursalesAdmin, getMaxSucursales } from "@/lib/queries/sucursales";
import { SucursalesManager } from "@/components/admin/SucursalesManager";

export default async function SucursalesPage() {
  const staff = await getStaff();
  if (staff?.rol !== "dueno") redirect("/admin");

  const [sucursales, max] = await Promise.all([getSucursalesAdmin(), getMaxSucursales()]);
  return <SucursalesManager sucursales={sucursales} max={max} />;
}
