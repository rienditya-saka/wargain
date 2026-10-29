"use client";

import * as React from "react";
import Link from "next/link";
import { Phone, Wallet, CheckCircle2, AlertCircle } from "lucide-react";
import type { FeedPost } from "@/lib/feed/types";
import { SocialEventFeedBody } from "@/components/sosial/feed-renderer";
import { FundraiserFeedBody, KabarFeedBody, MeetingFeedBody, PollFeedBody } from "@/components/balai/feed-renderers";
import { DisasterFeedBody, LostFoundFeedBody, SecurityAlertFeedBody } from "@/components/keamanan/feed-renderers";

// Post body renderers, keyed by feed_posts.type. A new module adds its renderer here;
// unknown types fall back to the plain text body, so publishing never breaks the feed.
export type FeedRenderer = React.ComponentType<{ post: FeedPost }>;

function Images({ images }: { images: string[] }) {
  if (!images.length) return null;
  const grid = images.length === 1 ? "grid-cols-1" : "grid-cols-2";
  return (
    <div className={`grid ${grid} gap-1.5 rounded-2xl overflow-hidden`}>
      {images.slice(0, 4).map((src, i) => (
        <img key={i} src={src} alt="" className={`w-full object-cover ${images.length === 1 ? "max-h-[420px]" : "aspect-square"} ${images.length === 3 && i === 0 ? "row-span-2 h-full" : ""}`} />
      ))}
    </div>
  );
}

function TextBody({ post }: { post: FeedPost }) {
  return (
    <div className="space-y-3">
      {post.title && <h3 className="text-base font-extrabold leading-snug">{post.title}</h3>}
      {post.content && <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">{post.content}</p>}
      <Images images={post.images} />
    </div>
  );
}

function AnnouncementBody({ post }: { post: FeedPost }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 p-4 space-y-2">
      <p className="text-[10px] font-black tracking-widest text-emerald-700 dark:text-emerald-400">📢 PENGUMUMAN RESMI RT</p>
      <TextBody post={post} />
    </div>
  );
}

function CommerceBody({ post }: { post: FeedPost }) {
  const p = post.payload as { price?: number; contactPhone?: string; itemCategory?: string; productId?: string; shopName?: string; unit?: string; comparePrice?: number | null; productType?: string };
  const wa = p.contactPhone
    ? `https://wa.me/${p.contactPhone.replace(/\D/g, "").replace(/^0/, "62")}?text=${encodeURIComponent(`Halo, saya tertarik dengan "${post.title ?? "produk"}" di WargaIn.`)}`
    : null;
  return (
    <div className="space-y-3">
      <Images images={post.images} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {post.title && <h3 className="text-base font-extrabold leading-snug">{post.title}</h3>}
          {p.itemCategory && <p className="text-[11px] text-slate-500">{p.itemCategory}</p>}
        </div>
        {p.price != null && (
          <div className="shrink-0 text-right">
            <p className="text-lg font-black text-emerald-600">Rp {Number(p.price).toLocaleString("id-ID")}{p.unit ? <span className="text-[11px] font-bold text-slate-500">/{p.unit}</span> : null}</p>
            {p.comparePrice ? <p className="text-[11px] text-slate-400 line-through">Rp {Number(p.comparePrice).toLocaleString("id-ID")}</p> : null}
          </div>
        )}
      </div>
      {post.content && <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{post.content}</p>}
      {p.productId ? (
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/pasar?product=${encodeURIComponent(p.productId)}`} className="min-h-[42px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5">
            {p.productType === "JASA" ? "Booking jadwal" : "Pesan sekarang"}
          </Link>
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="min-h-[42px] rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold flex items-center justify-center gap-1.5">
              <Phone className="w-4 h-4" /> Tanya penjual
            </a>
          )}
        </div>
      ) : (
        wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="min-h-[42px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5">
            <Phone className="w-4 h-4" /> Chat penjual via WhatsApp
          </a>
        )
      )}
    </div>
  );
}

function ReportBody({ post }: { post: FeedPost }) {
  const resolved = (post.payload as { reportStatus?: string }).reportStatus === "RESOLVED";
  return (
    <div className="space-y-3">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${resolved ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"}`}>
        {resolved ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />} {resolved ? "ADUAN SELESAI DITANGANI" : "ADUAN WARGA · DITINJAU PENGURUS"}
      </span>
      <TextBody post={post} />
    </div>
  );
}

function KasInfoBody({ post }: { post: FeedPost }) {
  const p = post.payload as { houses?: number; totalAmount?: number; periodLabel?: string };
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
      <p className="text-sm font-extrabold">{post.title}</p>
      <p className="text-sm text-slate-700 dark:text-slate-300">{post.content}</p>
      {p.houses != null && <p className="text-[11px] text-slate-500">{p.houses} rumah · periode {p.periodLabel}</p>}
      <Link href="/kas" className="min-h-[40px] rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold flex items-center justify-center gap-1.5">
        <Wallet className="w-4 h-4" /> Cek & bayar tagihan saya
      </Link>
    </div>
  );
}

export const FEED_RENDERERS: Record<string, FeedRenderer> = {
  GENERAL: TextBody,
  ANNOUNCEMENT: AnnouncementBody,
  COMMERCE: CommerceBody,
  REPORT: ReportBody,
  SOCIAL_EVENT: SocialEventFeedBody,
  SECURITY_ALERT: SecurityAlertFeedBody,
  LOST_FOUND: LostFoundFeedBody,
  DISASTER: DisasterFeedBody,
  KAS_INFO: KasInfoBody,
  KABAR: KabarFeedBody,
  POLL: PollFeedBody,
  MEETING: MeetingFeedBody,
  FUNDRAISER: FundraiserFeedBody,
};

export function renderFeedBody(post: FeedPost) {
  const R = FEED_RENDERERS[post.type] ?? TextBody;
  return <R post={post} />;
}

// Badge shown in the post header, per type.
export const TYPE_BADGE: Record<string, { label: string; tone: string }> = {
  ANNOUNCEMENT: { label: "Pengumuman", tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  COMMERCE: { label: "Jual Beli", tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  REPORT: { label: "Aduan", tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  SOCIAL_EVENT: { label: "Kegiatan", tone: "bg-pink-500/10 text-pink-700 dark:text-pink-300" },
  SECURITY_ALERT: { label: "Keamanan", tone: "bg-red-500/10 text-red-700 dark:text-red-300" },
  LOST_FOUND: { label: "Hilang & Temuan", tone: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
  DISASTER: { label: "Siaga Bencana", tone: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  KAS_INFO: { label: "Kas RT", tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  KABAR: { label: "Kabar Warga", tone: "bg-teal-500/10 text-teal-700 dark:text-teal-300" },
  POLL: { label: "Polling", tone: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
  MEETING: { label: "Musyawarah", tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  FUNDRAISER: { label: "Galang Dana", tone: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
};
