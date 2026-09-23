import * as React from "react";
import { cn } from "@/lib/utils";

export interface SecurityUser {
  name: string;
  houseBlock: string;
  phone: string;
}

export function Panel({
  title,
  description,
  icon: Icon,
  action,
  className,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] p-4 sm:p-5 space-y-4",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          {Icon && (
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{title}</h3>
            {description && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const PILL_TONES = {
  red: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
  amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  slate: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
} as const;

export type PillTone = keyof typeof PILL_TONES;

export function Pill({ tone, children, className }: { tone: PillTone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap", PILL_TONES[tone], className)}>
      {children}
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center text-xs text-slate-500 dark:text-slate-400 py-8 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
      {children}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full min-h-[40px] px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#0B130E] text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40";

export function StatCard({ label, value, tone = "text-slate-900 dark:text-slate-100" }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] p-3 min-w-0">
      <p className="text-[10px] font-semibold text-slate-500 truncate">{label}</p>
      <p className={cn("text-lg font-black truncate", tone)}>{value}</p>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex rounded-xl border border-neutral-200 dark:border-neutral-800 p-0.5 text-[11px] font-bold overflow-x-auto", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 whitespace-nowrap min-h-[34px] px-3 rounded-lg transition-colors",
            value === o.value ? "bg-emerald-600 text-white" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PhotoInput({
  value,
  onChange,
  label = "Foto",
}: {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  label?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const { fileToResizedDataUrl } = await import("@/lib/keamanan/store");
    onChange(await fileToResizedDataUrl(file));
  };
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-16 h-16 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 overflow-hidden flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0 bg-neutral-50 dark:bg-[#0B130E]"
      >
        {value ? <img src={value} alt="" className="w-full h-full object-cover" /> : "+ " + label}
      </button>
      {value && (
        <button type="button" onClick={() => onChange(undefined)} className="text-[11px] font-bold text-red-600">
          Hapus foto
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handle} className="hidden" />
    </div>
  );
}

export function waLink(text: string, phone?: string) {
  const number = phone ? phone.replace(/\D/g, "").replace(/^0/, "62") : "";
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export const primaryBtn =
  "min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-bold transition-all disabled:opacity-50";
export const ghostBtn =
  "min-h-[40px] px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors";
