// Skeleton instantáneo al navegar entre secciones del panel (Next lo muestra
// mientras el server renderiza la página real). Da respuesta inmediata al toque.
export default function PanelLoading() {
  return (
    <div className="animate-fade-up" aria-busy="true" aria-label="Cargando…">
      <div className="skeleton mb-5 h-7 w-40" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-line bg-elevated px-4 py-3">
            <div className="skeleton size-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton mt-2 h-3 w-1/2" />
            </div>
            <div className="skeleton h-8 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
