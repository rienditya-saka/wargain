"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: number | string;
  onValueChange?: (numericValue: number) => void;
  prefix?: string;
  allowNegative?: boolean;
}

/**
 * Format raw number/string into IDR formatted currency (e.g. 150000 -> 150.000)
 */
export function formatCurrencyDisplay(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "") return "";
  const numericString = String(val).replace(/\D/g, "");
  if (!numericString) return "";
  const num = parseInt(numericString, 10);
  if (isNaN(num)) return "";
  return new Intl.NumberFormat("id-ID").format(num);
}

/**
 * Standard WargaIn Currency Input component.
 * Automatically formats numeric inputs with Indonesian thousand separators (Rp xx.xxx.xxx)
 * while emitting the pure integer numeric value to onChange/onValueChange.
 */
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      className,
      value,
      onValueChange,
      prefix = "Rp",
      allowNegative = false,
      placeholder = "0",
      disabled,
      ...props
    },
    ref
  ) => {
    const [displayValue, setDisplayValue] = React.useState<string>(() =>
      formatCurrencyDisplay(value)
    );

    // Synchronize internal display when external value prop changes
    React.useEffect(() => {
      setDisplayValue(formatCurrencyDisplay(value));
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawInput = e.target.value;
      
      // Strip non-digits
      const digitsOnly = rawInput.replace(/\D/g, "");
      
      if (!digitsOnly) {
        setDisplayValue("");
        if (onValueChange) onValueChange(0);
        return;
      }

      const numericValue = parseInt(digitsOnly, 10);
      const formatted = new Intl.NumberFormat("id-ID").format(numericValue);
      setDisplayValue(formatted);

      if (onValueChange) {
        onValueChange(numericValue);
      }
    };

    return (
      <div className="relative flex items-center w-full">
        {prefix && (
          <div className="absolute left-3 pointer-events-none flex items-center justify-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 select-none">
            {prefix}
          </div>
        )}
        <input
          {...props}
          ref={ref}
          type="text"
          inputMode="numeric"
          disabled={disabled}
          value={displayValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={cn(
            "flex h-9 w-full rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] px-3 py-1 text-xs font-medium shadow-sm transition-colors",
            "file:border-0 file:bg-transparent file:text-xs file:font-medium",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50",
            prefix ? "pl-9 text-right font-mono" : "text-left",
            className
          )}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
