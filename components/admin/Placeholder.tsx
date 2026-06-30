export function Placeholder({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-[26px] font-bold tracking-[-0.01em] text-ink">{titulo}</h1>
      <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-line py-16 text-center">
        <span className="mb-4 size-3 rotate-45 rounded-[3px] bg-accent/60" />
        <p className="max-w-[320px] text-sm text-muted">{descripcion}</p>
      </div>
    </div>
  );
}
