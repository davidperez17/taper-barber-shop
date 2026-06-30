import { redirect } from "next/navigation";
import { getStaff } from "@/lib/queries/staff";
import { getCatalogoAdmin } from "@/lib/queries/catalogo";
import { CatalogoManager } from "@/components/admin/CatalogoManager";

export default async function CatalogoPage() {
  const staff = await getStaff();
  if (staff?.rol !== "admin" && staff?.rol !== "dueno") redirect("/admin");

  const catalogo = await getCatalogoAdmin();
  return <CatalogoManager catalogo={catalogo} />;
}
