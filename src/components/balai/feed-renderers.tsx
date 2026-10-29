"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarClock, HandHeart, MapPin, MessageCircle, Phone, Video } from "lucide-react";
import type { FeedPost } from "@/lib/feed/types";
import type { PollWithResult } from "@/lib/balai/types";
import { FUND_META, KABAR_META, KabarCategory, MEETING_STATUS_META, fmtDate, fmtDateTime, rupiah } from "@/lib/balai/types";
import { balaiGet } from "@/lib/balai/client";
import { getClientSession } from "@/lib/auth-session";
import { PollCard } from "./poll-card";

const waNumber = (p: string) => p.replace(/\D/g, "").replace(/^0/, "62");

export function KabarFeedBody({ post }: { post: FeedPost }) {
  const p = post.payload as { category?: KabarCategory; person?: string; eventDate?: string; location?: string; contactPhone?: string; official?: boolean };
  const meta = KABAR_META[p.category ?? "INFO"] ?? KABAR_META.INFO;
  const duka = p.category === "DUKA";
  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${meta.gradient} p-4 space-y-2.5`}>
      <div className="flex items-center justify-between gap-2">
        <p className={`text-[10px] font-black tracking-widest ${meta.tone}`}>{meta.emoji} {meta.label.toUpperCase()}{p.official ? " · RESMI RT" : ""}</p>
      </div>
      {duka && <p className="text-xs font-semibold italic text-slate-600 dark:text-slate-300">Innalillahi wa inna ilaihi raji&apos;un</p>}
      {post.title && <h3 className={`font-extrabold leading-snug ${duka ? "text-lg" : "text-base"}`}>{post.title}</h3>}
      {p.person && <p className="text-sm font-bold">{duka ? "Alm./Almh. " : ""}{p.person}</p>}
      {post.content && <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">{post.content}</p>}
      {(p.eventDate || p.location) && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
          {p.eventDate && <span className="flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> {p.eventDate.length > 10 ? fmtDateTime(p.eventDate) : fmtDate(p.eventDate)}</span>}
          {p.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {p.location}</span>}
        </div>
      )}
      {post.images.length > 0 && (
        <div className={`grid ${post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"} gap-1.5 rounded-xl overflow-hidden`}>
          {post.images.slice(0, 4).map((src, i) => <img key={i} src={src} alt="" className={`w-full object-cover ${post.images.length === 1 ? "max-h-[380px]" : "aspect-square"}`} />)}
        </div>
      )}
      {p.contactPhone && (duka || p.category === "SAKIT") && (
        <a href={`https://wa.me/${waNumber(p.contactPhone)}`} target="_blank" rel="noopener noreferrer" className="min-h-[40px] rounded-xl border border-neutral-300/70 dark:border-neutral-700 bg-white/60 dark:bg-black/20 text-xs font-bold flex items-center justify-center gap-1.5">
          <Phone className="w-4 h-4" /> Hubungi keluarga / narahubung
        </a>
      )}
    </div>
  );
}

export function PollFeedBody({ post }: { post: FeedPost }) {
  const pollId = (post.payload as { pollId?: string }).pollId;
  const [poll, setPoll] = React.useState<PollWithResult | null>(null);
  const [pengurus, setPengurus] = React.useState(false);
  const [userId, setUserId] = React.useState<string>();
  React.useEffect(() => {
    const s = getClientSession();
    setUserId(s?.userId);
    if (!s?.userId || !pollId) return;
    balaiGet<{ poll: PollWithResult; isPengurus: boolean }>(s.userId, { view: "poll", pollId })
      .then((r) => {
        setPoll(r.poll);
        setPengurus(r.isPengurus);
      })
      .catch(() => {});
  }, [pollId, post.updatedAt]);

  return (
    <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-sky-500/5 p-4 space-y-3">
      <p className="text-[10px] font-black tracking-widest text-violet-700 dark:text-violet-300">🗳️ POLLING WARGA</p>
      {post.title && <h3 className="text-base font-extrabold leading-snug">{post.title}</h3>}
      {post.content && <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{post.content}</p>}
      {poll ? (
        <PollCard poll={poll} userId={userId} isPengurus={pengurus} onChange={setPoll} compact />
      ) : (
        <div className="space-y-2">{(post.payload.options ?? []).map((o: any) => <div key={o.id} className="h-11 rounded-xl bg-white/50 dark:bg-white/5 animate-pulse" />)}</div>
      )}
      <Link href={`/balai?tab=polling&poll=${pollId}`} className="block text-center text-[11px] font-bold text-violet-700 dark:text-violet-300">Buka di Balai Warga →</Link>
    </div>
  );
}

export function MeetingFeedBody({ post }: { post: FeedPost }) {
  const p = post.payload as { meetingId: string; startAt: string; location: string; onlineUrl?: string; agenda?: { id: string; title: string }[]; status: keyof typeof MEETING_STATUS_META; decisions?: { text: string; done: boolean }[] };
  const st = MEETING_STATUS_META[p.status] ?? MEETING_STATUS_META.TERJADWAL;
  const d = new Date(p.startAt);
  return (
    <div className="rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-500/10 to-emerald-500/5 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black tracking-widest text-sky-700 dark:text-sky-300">🏛️ MUSYAWARAH WARGA</p>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${st.tone}`}>{st.label}</span>
      </div>
      <div className="flex gap-3">
        <div className="w-14 shrink-0 rounded-2xl bg-white dark:bg-[#0B130E] border border-sky-500/30 text-center py-1.5">
          <p className="text-[10px] font-black text-sky-600 uppercase">{d.toLocaleDateString("id-ID", { month: "short", timeZone: "Asia/Jakarta" })}</p>
          <p className="text-xl font-black leading-none">{d.toLocaleDateString("id-ID", { day: "numeric", timeZone: "Asia/Jakarta" })}</p>
          <p className="text-[9px] font-bold text-slate-500">{d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}</p>
        </div>
        <div className="min-w-0">
          {post.title && <h3 className="text-base font-extrabold leading-snug">{post.title}</h3>}
          <p className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3.5 h-3.5 shrink-0" /> {p.location}</p>
          {p.onlineUrl && <p className="text-[11px] text-sky-600 flex items-center gap-1"><Video className="w-3.5 h-3.5" /> Bisa ikut online</p>}
        </div>
      </div>
      {p.status === "SELESAI" && p.decisions?.length ? (
        <div className="rounded-xl bg-white/60 dark:bg-black/20 p-3 space-y-1">
          <p className="text-[10px] font-black text-emerald-700">KEPUTUSAN</p>
          {p.decisions.slice(0, 4).map((x, i) => <p key={i} className="text-xs">✅ {x.text}</p>)}
        </div>
      ) : p.agenda?.length ? (
        <ol className="text-xs space-y-0.5 list-decimal list-inside text-slate-700 dark:text-slate-300">
          {p.agenda.slice(0, 4).map((a) => <li key={a.id}>{a.title}</li>)}
        </ol>
      ) : null}
      <Link href={`/balai?tab=musyawarah&meeting=${p.meetingId}`} className="min-h-[42px] rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center justify-center gap-1.5">
        <MessageCircle className="w-4 h-4" /> {p.status === "SELESAI" ? "Baca notulen" : p.status === "DIBATALKAN" ? "Lihat detail" : "Konfirmasi kehadiran"}
      </Link>
    </div>
  );
}

export function FundraiserFeedBody({ post }: { post: FeedPost }) {
  const p = post.payload as { fundId: string; category: keyof typeof FUND_META; targetAmount: number; collected: number; donors: number; deadline?: string; beneficiary?: string; status?: string };
  const meta = FUND_META[p.category] ?? FUND_META.LAINNYA;
  const pct = p.targetAmount ? Math.min(100, Math.round((p.collected / p.targetAmount) * 100)) : 0;
  return (
    <div className="rounded-2xl border border-rose-500/25 bg-gradient-to-br from-rose-500/10 to-amber-500/5 overflow-hidden">
      {post.images[0] && <img src={post.images[0]} alt="" className="w-full max-h-64 object-cover" />}
      <div className="p-4 space-y-2.5">
        <p className="text-[10px] font-black tracking-widest text-rose-700 dark:text-rose-300">{meta.emoji} GALANG DANA · {meta.label.toUpperCase()}</p>
        {post.title && <h3 className="text-base font-extrabold leading-snug">{post.title}</h3>}
        {p.beneficiary && <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Untuk: {p.beneficiary}</p>}
        {post.content && <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line line-clamp-4">{post.content}</p>}
        <div>
          <div className="flex items-end justify-between gap-2">
            <p className="text-lg font-black text-rose-600">{rupiah(p.collected ?? 0)}</p>
            {p.targetAmount > 0 && <p className="text-[11px] font-bold text-slate-500">dari {rupiah(p.targetAmount)}</p>}
          </div>
          {p.targetAmount > 0 && (
            <div className="h-2.5 rounded-full bg-white/70 dark:bg-white/10 overflow-hidden mt-1">
              <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all" style={{ width: `${pct}%` }} />
            </div>
          )}
          <p className="text-[10px] text-slate-500 mt-1">{p.donors ?? 0} donatur{p.deadline ? ` · s/d ${fmtDate(p.deadline)}` : ""}{p.status === "SELESAI" ? " · ditutup" : ""}</p>
        </div>
        {p.status !== "SELESAI" && (
          <Link href={`/balai?tab=donasi&fund=${p.fundId}`} className="min-h-[42px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5">
            <HandHeart className="w-4 h-4" /> Ikut berdonasi
          </Link>
        )}
      </div>
    </div>
  );
}
