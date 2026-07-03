import { redirect } from "next/navigation";
import { getStaff } from "@/lib/queries/staff";
import { getSucursalActiva } from "@/lib/sucursal";
import { getCatalogoAdmin } from "@/lib/queries/catalogo";
import { CatalogoManager } from "@/components/admin/CatalogoManager";
import { LimpiezaImagenes } from "@/components/admin/LimpiezaImagenes";

export default async function CatalogoPage() {
  const staff = await getStaff();
  if (staff?.rol !== "admin" && staff?.rol !== "dueno") redirect("/admin");

  const sucursalId = await getSucursalActiva(staff);
  const catalogo = await getCatalogoAdmin(sucursalId);
  return (
    <>
      <CatalogoManager catalogo={catalogo} />
      {staff.rol === "dueno" && <LimpiezaImagenes />}
    </>
  );
}
