"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconEye, IconEyeOff } from "@/components/icons";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  prefix?: string;
}

export function Input({ label, hint, prefix, className, id, type, ...props }: Props) {
  const inputId = id ?? props.name;
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (reveal ? "text" : "password") : type;

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
          type={inputType}
          className={cn("w-full bg-transparent text-base text-ink outline-none placeholder:text-muted", className)}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={reveal}
            className="ml-2 flex size-9 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:text-ink"
          >
            {reveal ? <IconEyeOff size={20} /> : <IconEye size={20} />}
          </button>
        )}
      </div>
    </div>
  );
}
