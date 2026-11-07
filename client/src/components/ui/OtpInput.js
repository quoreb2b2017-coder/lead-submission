"use client";

import { useEffect, useRef } from "react";

/**
 * Six single-digit boxes for authenticator codes. Supports typing, paste of the whole code,
 * backspace/arrow navigation and the browser's one-time-code autofill.
 * Calls onComplete(code) when all six digits are filled.
 */
export default function OtpInput({ value, onChange, onComplete, disabled, error, autoFocus = true, length = 6 }) {
  const refs = useRef([]);
  // Empty boxes are kept as spaces in the value so later digits don't shift left
  const digits = Array.from({ length }, (_, i) => (value[i] && value[i] !== " " ? value[i] : ""));
  const isComplete = (code) => code.length === length && /^\d+$/.test(code);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const setAt = (i, d) => {
    const next = digits.slice();
    next[i] = d;
    const code = next.map((x) => x || " ").join("").trimEnd();
    onChange(code);
    if (isComplete(code)) onComplete?.(code);
  };

  const handleInput = (i, e) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) return;
    if (raw.length > 1) {
      // autofill / paste into one box
      const code = raw.slice(0, length);
      onChange(code);
      refs.current[Math.min(code.length, length - 1)]?.focus();
      if (code.length === length) onComplete?.(code);
      return;
    }
    setAt(i, raw);
    if (i < length - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) setAt(i, "");
      else if (i > 0) {
        refs.current[i - 1]?.focus();
        setAt(i - 1, "");
      }
    } else if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    const code = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!code) return;
    e.preventDefault();
    onChange(code);
    refs.current[Math.min(code.length, length - 1)]?.focus();
    if (code.length === length) onComplete?.(code);
  };

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="6-digit code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={i === 0 ? length : 1}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => handleInput(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={`h-12 w-full min-w-0 rounded-lg border bg-white text-center text-xl font-semibold tabular-nums text-slate-900 outline-none transition focus:ring-4 disabled:opacity-60 sm:h-14 ${
            error
              ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
              : d
                ? "border-indigo-300 focus:border-indigo-500 focus:ring-indigo-500/10"
                : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10"
          }`}
        />
      ))}
    </div>
  );
}
