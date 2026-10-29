"use client";

import * as React from "react";
import { AppSheet } from "@/components/ui/app-sheet";

// Bottom sheet on phones (drag up to full screen), centered dialog on tablet/desktop. See AppSheet.
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <AppSheet open={open} onClose={onClose} title={title} footer={footer} size={wide ? "lg" : "md"}>
      {children}
    </AppSheet>
  );
}

export function Stepper({ value, onChange, min = 1, max }: { value: number; onChange: (v: number) => void; min?: number; max?: number | null }) {
  return (
    <div className="inline-flex items-center rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="w-9 h-9 text-lg font-black disabled:opacity-30" aria-label="Kurangi">−</button>
      <span className="w-9 text-center text-sm font-black tabular-nums">{value}</span>
      <button type="button" onClick={() => onChange(max ? Math.min(max, value + 1) : value + 1)} disabled={!!max && value >= max} className="w-9 h-9 text-lg font-black disabled:opacity-30" aria-label="Tambah">+</button>
    </div>
  );
}

export function Stars({ value, size = "w-3.5 h-3.5" }: { value: number; size?: string }) {
  return (
    <span className="inline-flex" aria-label={`${value.toFixed(1)} bintang`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 20 20" className={`${size} ${i <= Math.round(value) ? "fill-amber-400" : "fill-neutral-300 dark:fill-neutral-700"}`}>
          <path d="M10 1.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L1.4 7.8l6-.8z" />
        </svg>
      ))}
    </span>
  );
}
