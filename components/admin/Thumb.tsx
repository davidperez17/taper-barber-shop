import Image from "next/image";

/** Miniatura con fallback a la inicial del nombre. unoptimized (sin costo Vercel). */
export function Thumb({ src, nombre, size = 40 }: { src: string | null; nombre: string; size?: number }) {
  const dim = { width: size, height: size };
  if (!src) {
    return (
      <div
        style={dim}
        className="flex shrink-0 items-center justify-center rounded-md bg-surface font-display text-sm font-bold text-muted"
        aria-hidden
      >
        {nombre.trim().charAt(0).toUpperCase() || "·"}
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      unoptimized
      style={dim}
      className="shrink-0 rounded-md object-cover"
    />
  );
}
