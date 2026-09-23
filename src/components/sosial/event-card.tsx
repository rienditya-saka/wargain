"use client";

import * as React from "react";
import { MapPin, Clock, Users, Sparkles } from "lucide-react";
import {
  AUDIENCE_META,
  CATEGORY_META,
  SocialEvent,
  SocialRegistration,
  dateBadge,
  formatEventTime,
  relativeDay,
} from "@/lib/sosial/types";

export function EventCard({
  event,
  householdRegs = [],
  onOpen,
  compact = false,
}: {
  event: SocialEvent;
  householdRegs?: SocialRegistration[];
  onOpen: () => void;
  compact?: boolean;
}) {
  const meta = CATEGORY_META[event.category] ?? CATEGORY_META.LAINNYA;
  const badge = dateBadge(event.startAt);
  const rel = relativeDay(event.startAt);
  const active = householdRegs.filter((r) => r.status !== "BATAL");
  const auto = active.some((r) => r.source === "OTOMATIS");
  const cancelled = event.status === "DIBATALKAN";
  const full = !!event.capacity && (event.registeredCount ?? 0) >= event.capacity;

  return (
    <button
      onClick={onOpen}
      className={`group w-full text-left rounded-2xl border bg-white dark:bg-[#131F17] overflow-hidden flex transition-all hover:shadow-lg hover:-translate-y-0.5 ${
        active.length ? "border-emerald-500/50" : "border-neutral-200/80 dark:border-neutral-800/80"
      } ${cancelled ? "opacity-60" : ""}`}
    >
      <div className={`shrink-0 w-[72px] sm:w-20 bg-gradient-to-b ${meta.tone} text-white flex flex-col items-center justify-center py-3 gap-0.5`}>
        <span className="text-[10px] font-bold opacity-90">{badge.weekday}</span>
        <span className="text-2xl font-black leading-none">{badge.day}</span>
        <span className="text-[10px] font-black tracking-wider">{badge.month}</span>
        <span className="text-lg mt-1" aria-hidden>{meta.emoji}</span>
      </div>

      <div className="flex-1 min-w-0 p-3 sm:p-3.5 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{meta.label}</span>
          {rel && !cancelled && (
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${rel === "Hari ini" ? "bg-red-600 text-white" : rel === "Besok" ? "bg-amber-400 text-slate-900" : "bg-neutral-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-300"}`}>
              {rel}
            </span>
          )}
          {cancelled && <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-red-500/10 text-red-600">DIBATALKAN</span>}
          {event.status === "SELESAI" && <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-slate-500/10 text-slate-500">SELESAI</span>}
        </div>
        <p className="text-sm font-extrabold leading-snug text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
          {event.title}
        </p>
        <div className="flex flex-col gap-0.5 text-[11px] text-slate-500">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3 shrink-0" /> {formatEventTime(event.startAt, event.endAt)}</span>
          <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{event.location}</span></span>
        </div>
        {!compact && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <Users className="w-3 h-3" /> {event.registeredCount ?? 0}{event.capacity ? `/${event.capacity}` : ""} peserta
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-300">
              {AUDIENCE_META[event.audience]?.short ?? "Semua"}
            </span>
            {active.length > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white flex items-center gap-1">
                {auto && <Sparkles className="w-3 h-3" />} {active.length} anggota keluarga {auto ? "otomatis " : ""}terdaftar
              </span>
            ) : full ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500/10 text-red-600">Kuota penuh</span>
            ) : null}
          </div>
        )}
      </div>
    </button>
  );
}
