import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  prefix?: string;
}

export function Input({ label, hint, prefix, className, id, ...props }: Props) {
  const inputId = id ?? props.name;
  return (
    <div className="mb-4">
      <label
        htmlFor={inputId}
        className="mb-2 block text-xs font-medium uppercase tracking-[0.04em] text-subtle"
      >
        {label}
        {hint && <span className="ml-1 normal-case tracking-normal text-[#4a4a4a]">{hint}</span>}
      </label>
      <div
        className={cn(
          "flex items-center rounded-lg border border-line bg-elevated px-4 transition-colors focus-within:border-accent",
          "min-h-[50px]",
        )}
      >
        {prefix && (
          <span className="mr-3 border-r border-line-strong pr-3 text-base text-muted">{prefix}</span>
        )}
        <input
          id={inputId}
          className={cn("w-full bg-transparent text-base text-ink outline-none placeholder:text-muted", className)}
          {...props}
        />
      </div>
    </div>
  );
}
