"use client";

import * as React from "react";
import Link from "next/link";
import { Clock, MapPin, Users, Repeat, ChevronRight } from "lucide-react";
import type { FeedPost } from "@/lib/feed/types";
import { AUDIENCE_META, CATEGORY_META, SocialCategory, dateBadge, formatEventTime, relativeDay } from "@/lib/sosial/types";

// Feed body for SOCIAL_EVENT posts (published by the Sosial module).
export function SocialEventFeedBody({ post }: { post: FeedPost }) {
  const p = post.payload as {
    eventId: string; category: SocialCategory; startAt: string; endAt?: string | null; location: string; audience: keyof typeof AUDIENCE_META;
    autoEnroll?: boolean; services?: string[]; coverUrl?: string | null; status?: string; cancelReason?: string | null; occurrences?: string[];
  };
  const meta = CATEGORY_META[p.category] ?? CATEGORY_META.LAINNYA;
  // For a series, point at the next occurrence that hasn't passed.
  const upcoming = (p.occurrences ?? [p.startAt]).find((d) => new Date(d).getTime() > Date.now() - 6 * 3_600_000) ?? p.startAt;
  const badge = dateBadge(upcoming);
  const rel = relativeDay(upcoming);
  const cancelled = p.status === "DIBATALKAN";
  const endAt = p.endAt && p.startAt ? new Date(new Date(upcoming).getTime() + (new Date(p.endAt).getTime() - new Date(p.startAt).getTime())).toISOString() : null;

  return (
    <div className="space-y-3">
      <Link href={`/sosial?event=${encodeURIComponent(p.eventId)}`} className="block rounded-2xl overflow-hidden group">
        <div className={`relative bg-gradient-to-br ${meta.tone} text-white p-4 flex gap-4 items-center ${cancelled ? "grayscale" : ""}`}>
          {p.coverUrl && <img src={p.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
          <span className="absolute -right-3 -bottom-6 text-8xl opacity-15 select-none" aria-hidden>{meta.emoji}</span>
          <div className="relative shrink-0 w-16 rounded-xl bg-white/20 backdrop-blur text-center py-2">
            <p className="text-[10px] font-bold">{badge.weekday}</p>
            <p className="text-2xl font-black leading-none">{badge.day}</p>
            <p className="text-[10px] font-black">{badge.month}</p>
          </div>
          <div className="relative min-w-0 space-y-1">
            <div className="flex flex-wrap gap-1">
              {cancelled ? (
                <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-black">DIBATALKAN</span>
              ) : (
                rel && <span className="px-1.5 py-0.5 rounded bg-white text-slate-900 text-[10px] font-black">{rel}</span>
              )}
              {(p.occurrences?.length ?? 0) > 1 && (
                <span className="px-1.5 py-0.5 rounded bg-black/20 text-[10px] font-bold flex items-center gap-1"><Repeat className="w-3 h-3" /> {p.occurrences!.length}x jadwal</span>
              )}
            </div>
            <h3 className="text-base font-black leading-snug group-hover:underline">{post.title}</h3>
            <p className="text-[11px] opacity-95 flex items-center gap-1"><Clock className="w-3 h-3" /> {formatEventTime(upcoming, endAt)}</p>
            <p className="text-[11px] opacity-95 flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" /> {p.location}</p>
          </div>
        </div>
      </Link>
      {cancelled && p.cancelReason && <p className="text-xs font-semibold text-red-600">Alasan: {p.cancelReason}</p>}
      {post.content && <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line line-clamp-4">{post.content}</p>}
      <div className="flex flex-wrap gap-1.5">
        <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[10px] font-bold flex items-center gap-1">
          <Users className="w-3 h-3" /> {AUDIENCE_META[p.audience]?.label ?? "Semua warga"}{p.autoEnroll ? " · otomatis terdaftar" : ""}
        </span>
        {(p.services ?? []).slice(0, 4).map((s) => (
          <span key={s} className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">{s}</span>
        ))}
      </div>
      {!cancelled && (
        <Link href={`/sosial?event=${encodeURIComponent(p.eventId)}`} className="min-h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          Lihat & daftar <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
