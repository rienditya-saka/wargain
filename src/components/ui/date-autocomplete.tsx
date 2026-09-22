"use client";

import * as React from "react";
import { Calendar, Clock, SunMedium } from "lucide-react";
import { Autocomplete, AutocompleteOption } from "@/components/ui/autocomplete";

export const INDONESIAN_DAYS: AutocompleteOption<number>[] = [
  { value: 1, label: "Senin", sublabel: "Awal pekan kerja" },
  { value: 2, label: "Selasa", sublabel: "Hari kerja ke-2" },
  { value: 3, label: "Rabu", sublabel: "Tengah pekan" },
  { value: 4, label: "Kamis", sublabel: "Hari kerja ke-4" },
  { value: 5, label: "Jumat", sublabel: "Jumat berkah" },
  { value: 6, label: "Sabtu", sublabel: "Akhir pekan" },
  { value: 7, label: "Minggu", sublabel: "Hari libur warga" },
];

export const INDONESIAN_MONTHS: AutocompleteOption<number>[] = [
  { value: 1, label: "Januari", sublabel: "Bulan ke-1" },
  { value: 2, label: "Februari", sublabel: "Bulan ke-2" },
  { value: 3, label: "Maret", sublabel: "Bulan ke-3" },
  { value: 4, label: "April", sublabel: "Bulan ke-4" },
  { value: 5, label: "Mei", sublabel: "Bulan ke-5" },
  { value: 6, label: "Juni", sublabel: "Bulan ke-6" },
  { value: 7, label: "Juli", sublabel: "Bulan ke-7" },
  { value: 8, label: "Agustus", sublabel: "Bulan ke-8" },
  { value: 9, label: "September", sublabel: "Bulan ke-9" },
  { value: 10, label: "Oktober", sublabel: "Bulan ke-10" },
  { value: 11, label: "November", sublabel: "Bulan ke-11" },
  { value: 12, label: "Desember", sublabel: "Bulan ke-12" },
];

export const DAYS_OF_MONTH: AutocompleteOption<number>[] = Array.from(
  { length: 31 },
  (_, i) => ({
    value: i + 1,
    label: `Tanggal ${i + 1}`,
    sublabel: i === 0 ? "Awal bulan" : i === 30 ? "Akhir bulan (maks 31)" : undefined,
  })
);

export interface DayAutocompleteProps {
  value?: number;
  onChange?: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Standard Autocomplete for Indonesian Day Names (Senin - Minggu).
 * Strictly replaces numeric 1-7 inputs with friendly day names.
 */
export function DayAutocomplete({
  value = 1,
  onChange,
  placeholder = "Pilih Hari...",
  className,
  disabled = false,
}: DayAutocompleteProps) {
  return (
    <Autocomplete<number>
      options={INDONESIAN_DAYS.map((d) => ({
        ...d,
        icon: <SunMedium className="w-3.5 h-3.5" />,
      }))}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Cari nama hari (cth: Senin, Jumat)..."
      emptyText="Hari tidak ditemukan."
      className={className}
      disabled={disabled}
    />
  );
}

export interface MonthAutocompleteProps {
  value?: number;
  onChange?: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Standard Autocomplete for Indonesian Month Names (Januari - Desember).
 * Strictly replaces numeric 1-12 inputs with friendly month names.
 */
export function MonthAutocomplete({
  value = 1,
  onChange,
  placeholder = "Pilih Bulan...",
  className,
  disabled = false,
}: MonthAutocompleteProps) {
  return (
    <Autocomplete<number>
      options={INDONESIAN_MONTHS.map((m) => ({
        ...m,
        icon: <Calendar className="w-3.5 h-3.5" />,
      }))}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Cari nama bulan (cth: Januari, Agustus)..."
      emptyText="Bulan tidak ditemukan."
      className={className}
      disabled={disabled}
    />
  );
}

export interface DayOfMonthAutocompleteProps {
  value?: number;
  onChange?: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Standard Autocomplete for Day of Month (Tanggal 1 - 31).
 */
export function DayOfMonthAutocomplete({
  value = 1,
  onChange,
  placeholder = "Pilih Tanggal...",
  className,
  disabled = false,
}: DayOfMonthAutocompleteProps) {
  return (
    <Autocomplete<number>
      options={DAYS_OF_MONTH.map((d) => ({
        ...d,
        icon: <Clock className="w-3.5 h-3.5" />,
      }))}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Cari tanggal (cth: 1, 15, 25)..."
      emptyText="Tanggal tidak ditemukan."
      className={className}
      disabled={disabled}
    />
  );
}
