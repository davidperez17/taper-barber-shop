"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";

interface Props {
  /** Valor actual (string de hasta 6 dígitos). */
  value: string;
  onChange: (v: string) => void;
  /** name del input oculto para enviar en el form. */
  name?: string;
  label?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

const LEN = 6;

/** PIN de 6 dígitos: casillas segmentadas, teclado numérico, auto-avance y pegar. */
export function PinInput({ value, onChange, name, label, autoFocus, disabled }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(LEN).split("").slice(0, LEN);

  // "Peek": el dígito recién escrito se ve ~800ms y luego se enmascara.
  const [peek, setPeek] = useState<number | null>(null);
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revelar = (i: number) => {
    setPeek(i);
    if (peekTimer.current) clearTimeout(peekTimer.current);
    peekTimer.current = setTimeout(() => setPeek(null), 800);
  };
  useEffect(() => () => { if (peekTimer.current) clearTimeout(peekTimer.current); }, []);

  const setDigit = (i: number, d: string) => {
    const arr = value.padEnd(LEN).split("").slice(0, LEN);
    arr[i] = d;
    onChange(arr.join("").replace(/\s/g, "").slice(0, LEN));
  };

  const onCellChange = (i: number, raw: string) => {
    const d = raw.replace(/\D/g, "");
    if (!d) return;
    setDigit(i, d[d.length - 1]);
    revelar(i);
    if (i < LEN - 1) refs.current[i + 1]?.focus();
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]?.trim()) {
        setDigit(i, " ");
      } else if (i > 0) {
        setDigit(i - 1, " ");
        refs.current[i - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < LEN - 1) {
      refs.current[i + 1]?.focus();
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LEN);
    if (!pasted) return;
    onChange(pasted);
    refs.current[Math.min(pasted.length, LEN - 1)]?.focus();
  };

  return (
    <div>
      {label && <span className="mb-2 block text-[13px] font-medium text-muted">{label}</span>}
      <div className="flex justify-between gap-2" role="group" aria-label={label ?? "PIN de 6 dígitos"}>
        {Array.from({ length: LEN }).map((_, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            value={digits[i]?.trim() ?? ""}
            onChange={(e) => onCellChange(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={onPaste}
            onFocus={(e) => e.target.select()}
            type={peek === i ? "text" : "password"}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            disabled={disabled}
            autoFocus={autoFocus && i === 0}
            aria-label={`Dígito ${i + 1}`}
            className="h-14 w-full rounded-xl border border-line bg-elevated text-center font-display text-2xl font-bold text-ink outline-none transition-colors focus:border-accent disabled:opacity-50"
          />
        ))}
      </div>
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}
