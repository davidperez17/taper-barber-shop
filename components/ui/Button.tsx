import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export function Button({ className, variant = "primary", loading, disabled, children, ...props }: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full px-6 text-base font-semibold transition-[transform,background-color,border-color] duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-accent text-accent-ink shadow-[0_0_28px_var(--accent-glow)] hover:bg-accent-dark",
        variant === "secondary" && "border border-line bg-elevated text-ink hover:border-line-strong",
        variant === "ghost" && "text-muted hover:text-ink",
        className,
      )}
      {...props}
    >
      {loading && (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80"
        />
      )}
      {children}
    </button>
  );
}
