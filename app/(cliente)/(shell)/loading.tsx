// Skeleton instantáneo al navegar entre secciones del cliente (tarjeta/stats/
// perfil). Next lo muestra mientras el server renderiza; evita el shell en
// blanco en redes móviles lentas. Refleja el layout de la tarjeta.
export default function ClienteLoading() {
  return (
    <div aria-busy="true" aria-label="Cargando…" className="px-5 pt-14">
      <div className="skeleton h-8 w-40 rounded-lg" />
      <div className="skeleton mt-2 h-4 w-28 rounded" />
      <div className="skeleton mt-6 w-full rounded-[20px]" style={{ aspectRatio: "3 / 2" }} />
      <div className="skeleton mx-auto mt-4 h-3 w-48 rounded" />
      <div className="mt-8 grid grid-cols-2 gap-3">
        <div className="skeleton h-24 rounded-2xl" />
        <div className="skeleton h-24 rounded-2xl" />
      </div>
    </div>
  );
}
