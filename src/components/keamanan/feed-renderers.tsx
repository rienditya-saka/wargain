"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, MapPin, Phone, Siren, ShieldAlert } from "lucide-react";
import type { FeedPost } from "@/lib/feed/types";
import { LOST_FOUND_CATEGORY_META, LostFoundCategory } from "@/lib/keamanan/types";

function ago(iso?: string | null) {
  if (!iso) return null;
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 60) return `${Math.max(1, min)} mnt lalu`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h} jam lalu` : `${Math.floor(h / 24)} hari lalu`;
}

export function SecurityAlertFeedBody({ post }: { post: FeedPost }) {
  const p = post.payload as { level?: string; kind?: string; plate?: string; lastSeenAt?: string; lastSeenLocation?: string };
  const danger = p.level === "BAHAYA";
  return (
    <div className={`rounded-2xl border-2 p-3.5 space-y-2.5 ${danger ? "border-red-500/60 bg-red-500/5" : "border-amber-500/50 bg-amber-500/5"}`}>
      <div className="flex gap-3">
        {post.images[0] ? (
          <img src={post.images[0]} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0" />
        ) : (
          <div className={`w-14 h-14 rounded-xl shrink-0 flex items-center justify-center text-3xl ${danger ? "bg-red-500/15" : "bg-amber-500/15"}`}>
            {p.kind === "KENDARAAN" ? "🚘" : "🕵️"}
          </div>
        )}
        <div className="min-w-0 space-y-1">
          <p className={`text-[10px] font-black tracking-wider flex items-center gap-1 ${danger ? "text-red-600" : "text-amber-700 dark:text-amber-400"}`}>
            <ShieldAlert className="w-3.5 h-3.5" /> {danger ? "BAHAYA" : "WASPADA"}
          </p>
          <p className="text-sm font-extrabold leading-snug">{post.title?.replace(/^(⚠️ BAHAYA|Waspada): /, "")}</p>
          {p.plate && <p className="font-mono text-base font-black tracking-widest">{p.plate}</p>}
        </div>
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-300">{post.content}</p>
      {(p.lastSeenAt || p.lastSeenLocation) && (
        <p className="text-[11px] text-slate-500 flex items-center gap-1">
          <Eye className="w-3.5 h-3.5" /> Terakhir terlihat {ago(p.lastSeenAt) ?? ""}{p.lastSeenLocation ? ` · ${p.lastSeenLocation}` : ""}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Link href="/keamanan?tab=waspada" className="min-h-[40px] rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center justify-center">Detail waspada</Link>
        <a href="tel:081200001111" className="min-h-[40px] rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold flex items-center justify-center gap-1"><Phone className="w-3.5 h-3.5" /> Pos satpam</a>
      </div>
    </div>
  );
}

export function LostFoundFeedBody({ post }: { post: FeedPost }) {
  const p = post.payload as { kind?: string; category?: LostFoundCategory; lastSeenLocation?: string; contactName?: string; contactPhone?: string; reward?: number; status?: string };
  const meta = p.category ? LOST_FOUND_CATEGORY_META[p.category] : undefined;
  const done = p.status === "SELESAI";
  const lost = p.kind === "HILANG";
  return (
    <div className="space-y-2.5">
      <div className="relative rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 aspect-[16/9] flex items-center justify-center text-6xl">
        {post.images[0] ? <img src={post.images[0]} alt="" className={`absolute inset-0 w-full h-full object-cover ${done ? "grayscale" : ""}`} /> : meta?.emoji}
        <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black text-white ${done ? "bg-slate-600" : lost ? (meta?.urgent ? "bg-fuchsia-600 animate-pulse" : "bg-violet-600") : "bg-sky-600"}`}>
          {done ? "SUDAH KETEMU" : lost ? (meta?.urgent ? "DICARI SEGERA" : "HILANG") : "DITEMUKAN"}
        </span>
        {!!p.reward && !done && <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-900">🎁 Rp {p.reward.toLocaleString("id-ID")}</span>}
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-300">{post.content}</p>
      <p className="text-[11px] text-slate-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {p.lastSeenLocation}</p>
      {!done && p.contactPhone && (
        <a href={`tel:${p.contactPhone}`} className="min-h-[40px] rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center justify-center gap-1.5">
          <Phone className="w-4 h-4" /> {lost ? "Saya melihat" : "Ini milik saya"} · {p.contactName}
        </a>
      )}
    </div>
  );
}

export function DisasterFeedBody({ post }: { post: FeedPost }) {
  const p = post.payload as { active?: boolean; posts?: string[]; endedAt?: string };
  return (
    <div className={`rounded-2xl p-4 text-white space-y-2 ${p.active ? "bg-gradient-to-br from-blue-700 to-indigo-800" : "bg-slate-600"}`}>
      <p className="text-xs font-black flex items-center gap-1.5"><Siren className={`w-4 h-4 ${p.active ? "animate-pulse" : ""}`} /> {p.active ? "MODE SIAGA AKTIF" : "SIAGA SUDAH DICABUT"}</p>
      <p className="text-sm">{post.content}</p>
      {p.active && (
        <Link href="/keamanan?tab=bencana" className="block text-center min-h-[40px] leading-[40px] rounded-xl bg-white text-blue-800 text-xs font-black">
          Lapor kondisi keluarga
        </Link>
      )}
    </div>
  );
}
