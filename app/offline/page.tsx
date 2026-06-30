export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-8 text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-full border border-line bg-elevated">
        <span className="size-3 rotate-45 rounded-[3px] bg-accent" />
      </div>
      <h1 className="font-display text-2xl font-bold text-ink">Sin conexión</h1>
      <p className="mt-2 max-w-[280px] text-sm text-muted">
        No hay internet ahora mismo. Tu tarjeta y progreso vuelven en cuanto recuperes la red.
      </p>
    </main>
  );
}
