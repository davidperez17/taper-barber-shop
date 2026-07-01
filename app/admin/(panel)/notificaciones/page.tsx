import { redirect } from "next/navigation";
import { getStaff } from "@/lib/queries/staff";
import { DifusionForm } from "@/components/admin/DifusionForm";

export default async function NotificacionesPage() {
  const staff = await getStaff();
  if (staff?.rol !== "admin" && staff?.rol !== "dueno") redirect("/admin");

  return <DifusionForm />;
}
