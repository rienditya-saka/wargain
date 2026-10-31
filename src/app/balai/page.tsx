"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building, Menu, Plus, Newspaper, Vote, Landmark, HandHeart, Package, PhoneCall, ChevronRight, MessageCircle, Phone, Pencil, Trash2, Clock, MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { getClientSession } from "@/lib/auth-session";
import type { SessionTenant } from "@/lib/types/auth";
import type { FeedPost } from "@/lib/feed/types";
import { balaiApi, useBalai } from "@/lib/balai/client";
import {
  CONTACT_META, ContactCategory, Contact, FUND_META, INVENTORY_META, InventoryCategory, InventoryItem, KABAR_META, KabarCategory, MEETING_STATUS_META, PollWithResult, fmtDateTime, timeLeft,
} from "@/lib/balai/types";
import { Sheet } from "@/components/pasar/sheet";
import { waLink } from "@/components/keamanan/ui";
import { PollCard } from "@/components/balai/poll-card";
import { KabarFeedBody } from "@/components/balai/feed-renderers";
import { MeetingDetail } from "@/components/balai/meeting-detail";
import { FundDetail, FundProgress } from "@/components/balai/fund-detail";
import { BorrowForm, ItemCard, LoanRow } from "@/components/balai/inventory";
import { ContactForm, FundForm, ItemForm, KabarForm, MeetingForm, PollForm } from "@/components/balai/forms";

type TabId = "kabar" | "polling" | "musyawarah" | "donasi" | "inventaris" | "kontak";
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "kabar", label: "Kabar", icon: Newspaper },
  { id: "polling", label: "Polling", icon: Vote },
  { id: "musyawarah", label: "Musyawarah", icon: Landmark },
  { id: "donasi", label: "Galang Dana", icon: HandHeart },
  { id: "inventaris", label: "Pinjam Barang", icon: Package },
  { id: "kontak", label: "Kontak", icon: PhoneCall },
];
const ROLE_LABEL: Record<string, string> = { KETUA: "Ketua RT", SEKRETARIS: "Sekretaris", BENDAHARA: "Bendahara", HUMAS: "Humas" };

const ago = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt lalu`;
  if (m < 1440) return `${Math.floor(m / 60)} jam lalu`;
  return `${Math.floor(m / 1440)} hari lalu`;
};

export default function BalaiPage() {
  return (
    <Suspense fallback={null}>
      <BalaiContent />
    </Suspense>
  );
}

function BalaiContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [session, setSession] = useState<SessionTenant | null>(null);
  const [ready, setReady] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [create, setCreate] = useState<null | "kabar" | "poll" | "meeting" | "fund" | "item" | "contact">(null);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [borrow, setBorrow] = useState<InventoryItem | null>(null);
  const [kabarFilter, setKabarFilter] = useState<KabarCategory | "SEMUA">("SEMUA");
  const [pollFilter, setPollFilter] = useState<"AKTIF" | "SELESAI">("AKTIF");
  const [invCat, setInvCat] = useState<InventoryCategory | "SEMUA">("SEMUA");

  useEffect(() => {
    setSession(getClientSession());
    setReady(true);
  }, []);

  const userId = session?.userId;
  const { data, loading, error, reload, setData } = useBalai(ready ? userId : undefined, session?.communityId);
  const pengurus = !!data?.isPengurus;

  const tabParam = params.get("tab") as TabId | null;
  const tab: TabId = TABS.some((t) => t.id === tabParam) ? tabParam! : "kabar";
  const meetingParam = params.get("meeting");
  const fundParam = params.get("fund");
  const pollParam = params.get("poll");
  const checkin = params.get("checkin");
  const manage = params.get("manage") === "1";

  const setParam = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([k, v]) => (v === null ? p.delete(k) : p.set(k, v)));
    router.replace(`/balai${p.toString() ? `?${p}` : ""}`, { scroll: false });
  };

  useEffect(() => {
    if (ready && !userId) router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  }, [ready, userId, router]);

  // deep-linked poll: scroll into view
  useEffect(() => {
    if (!pollParam || !data) return;
    const p = data.polls.find((x) => x.id === pollParam);
    if (p && p.status !== "AKTIF") setPollFilter("SELESAI");
    setTimeout(() => document.getElementById(`poll-${pollParam}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
  }, [pollParam, data]);

  const meetings = useMemo(() => {
    const list = data?.meetings ?? [];
    const upcoming = list.filter((m) => m.status === "TERJADWAL" || m.status === "BERLANGSUNG").sort((a, b) => a.startAt.localeCompare(b.startAt));
    const past = list.filter((m) => m.status === "SELESAI" || m.status === "DIBATALKAN").sort((a, b) => b.startAt.localeCompare(a.startAt));
    return { upcoming, past };
  }, [data?.meetings]);

  const openMeeting = meetingParam ? data?.meetings.find((m) => m.id === meetingParam) ?? null : null;
  const openFund = fundParam ? data?.fundraisers.find((f) => f.id === fundParam) ?? null : null;
  const updatePoll = (np: PollWithResult) => setData((d) => (d ? { ...d, polls: d.polls.map((p) => (p.id === np.id ? { ...np, creatorName: p.creatorName } : p)) } : d));

  if (!ready || !userId) return null;
  const c = data?.counts;
  const badge: Partial<Record<TabId, number>> = {
    polling: c?.unvotedPolls,
    musyawarah: c?.upcomingMeetings,
    donasi: pengurus ? c?.pendingDonations : c?.activeFunds,
    inventaris: pengurus ? c?.pendingLoans : 0,
  };
  const fab: Partial<Record<TabId, { label: string; kind: NonNullable<typeof create> }>> = {
    kabar: { label: "Tulis kabar", kind: "kabar" },
    ...(pengurus
      ? {
          polling: { label: "Buat polling", kind: "poll" as const },
          musyawarah: { label: "Jadwalkan", kind: "meeting" as const },
          donasi: { label: "Galang dana", kind: "fund" as const },
          inventaris: { label: "Tambah barang", kind: "item" as const },
          kontak: { label: "Tambah kontak", kind: "contact" as const },
        }
      : {}),
  };
  const nextMeeting = meetings.upcoming[0];
  const kabar = ((data?.kabar ?? []) as FeedPost[]).filter((k) => kabarFilter === "SEMUA" || k.payload.category === kabarFilter);
  const items = (data?.items ?? []).filter((i) => invCat === "SEMUA" || i.category === invCat);

  return (
    <div className="min-h-screen bg-[#FBFBF9] dark:bg-[#0B130E] text-slate-900 dark:text-slate-100 pb-28 md:pb-12 font-sans overflow-x-clip">
      <header className="sticky top-0 z-40 bg-[#FBFBF9]/90 dark:bg-[#0B130E]/90 backdrop-blur-xl border-b border-neutral-200/80 dark:border-neutral-800/80 px-4 lg:px-6 py-2.5">
        <div className="w-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button onClick={() => setDrawer(true)} className="md:hidden w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-center shrink-0" aria-label="Buka menu utama"><Menu className="w-5 h-5" /></button>
            <Link href="/feed" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-emerald-600/30">W</div>
              <span className="font-extrabold text-base tracking-tight hidden sm:inline">Warga<span className="text-emerald-600">In</span></span>
            </Link>
            <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700 mx-1 hidden sm:block" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium min-w-0">
              <Building className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate max-w-[120px] sm:max-w-xs">{session?.communityName || "Komunitas WargaIn"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <NotificationBell userId={userId} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4 md:py-6">
        <div className="flex flex-col md:flex-row md:gap-4 lg:gap-6 items-start">
          <AppSidebar session={session} isMobileDrawerOpen={drawer} onCloseMobileDrawer={() => setDrawer(false)} />

          <section className="flex-1 w-full min-w-0 space-y-4">
            {/* hero */}
            <div className="rounded-3xl bg-gradient-to-br from-sky-700 via-emerald-700 to-teal-800 p-4 sm:p-6 text-white relative overflow-hidden">
              <span className="absolute -right-6 -bottom-10 text-[140px] opacity-10 select-none" aria-hidden>🏛️</span>
              <p className="text-[11px] font-bold opacity-90 flex items-center gap-1.5"><Landmark className="w-3.5 h-3.5" /> Balai Warga</p>
              <h1 className="text-xl sm:text-3xl font-black tracking-tight mt-0.5">Suara & kabar warga, satu tempat</h1>
              <p className="text-[11px] sm:text-sm opacity-90">Kabar terbaru, polling, musyawarah, galang dana, pinjam inventaris RT & kontak penting.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                <button onClick={() => setParam({ tab: "polling" })} className="rounded-2xl bg-white/15 hover:bg-white/20 p-2.5 text-left">
                  <p className="text-xl font-black">{c?.unvotedPolls ?? "–"}</p><p className="text-[10px] font-bold opacity-90">Polling menunggu suara Anda</p>
                </button>
                <button onClick={() => nextMeeting ? setParam({ tab: "musyawarah", meeting: nextMeeting.id }) : setParam({ tab: "musyawarah" })} className="rounded-2xl bg-white/15 hover:bg-white/20 p-2.5 text-left min-w-0">
                  <p className="text-sm font-black truncate">{nextMeeting ? fmtDateTime(nextMeeting.startAt) : "Belum ada"}</p><p className="text-[10px] font-bold opacity-90 truncate">{nextMeeting ? nextMeeting.title : "Musyawarah terdekat"}</p>
                </button>
                <button onClick={() => setParam({ tab: "donasi" })} className="rounded-2xl bg-white/15 hover:bg-white/20 p-2.5 text-left">
                  <p className="text-xl font-black">{c?.activeFunds ?? "–"}</p><p className="text-[10px] font-bold opacity-90">Galang dana aktif</p>
                </button>
                <button onClick={() => setParam({ tab: "inventaris" })} className="rounded-2xl bg-white/15 hover:bg-white/20 p-2.5 text-left">
                  <p className="text-xl font-black">{data?.items.length ?? "–"}</p><p className="text-[10px] font-bold opacity-90">Barang RT bisa dipinjam</p>
                </button>
              </div>
            </div>

            {/* tabs */}
            <div className="sticky top-[57px] z-30 -mx-3 sm:mx-0 px-3 sm:px-0 py-1.5 bg-[#FBFBF9]/95 dark:bg-[#0B130E]/95 backdrop-blur">
              <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {TABS.map((t) => {
                  const Icon = t.icon;
                  const n = badge[t.id] ?? 0;
                  return (
                    <button key={t.id} onClick={() => setParam({ tab: t.id, meeting: null, fund: null, poll: null, manage: null })} className={`shrink-0 min-h-[40px] px-3.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-colors ${tab === t.id ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white dark:bg-[#131F17] border-neutral-200 dark:border-neutral-800 text-slate-600 dark:text-slate-300"}`}>
                      <Icon className="w-4 h-4" /> {t.label}
                      {n > 0 && <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center ${tab === t.id ? "bg-white text-emerald-700" : "bg-red-500 text-white"}`}>{n}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {!data ? (
              loading ? (
                <div className="grid gap-3">{[0, 1, 2].map((i) => <div key={i} className="h-40 rounded-2xl bg-neutral-100 dark:bg-neutral-900 animate-pulse" />)}</div>
              ) : (
                <div className="text-center py-12 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 space-y-3">
                  <p className="text-sm font-bold">Gagal memuat Balai Warga{error ? `: ${error}` : "."}</p>
                  <button onClick={reload} className="min-h-[40px] px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold">Coba lagi</button>
                </div>
              )
            ) : (
              <>
                {tab === "kabar" && (
                  <div className="space-y-3">
                    <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {(["SEMUA", ...Object.keys(KABAR_META)] as (KabarCategory | "SEMUA")[]).map((k) => (
                        <button key={k} onClick={() => setKabarFilter(k)} className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border ${kabarFilter === k ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900" : "border-neutral-200 dark:border-neutral-800"}`}>
                          {k === "SEMUA" ? "Semua" : `${KABAR_META[k].emoji} ${KABAR_META[k].label}`}
                        </button>
                      ))}
                    </div>
                    <div className="grid lg:grid-cols-2 gap-3">
                      {kabar.map((k) => (
                        <article key={k.id} className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-700 flex items-center justify-center text-xs font-black">{k.authorName.charAt(0)}</div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold truncate">{k.authorName}{k.authorRole && ROLE_LABEL[k.authorRole] ? <span className="text-emerald-600"> · {ROLE_LABEL[k.authorRole]}</span> : null}</p>
                              <p className="text-[10px] text-slate-500">{k.authorBlock ? `${k.authorBlock} · ` : ""}{ago(k.createdAt)}</p>
                            </div>
                            {k.isPinned && <span className="text-[10px] font-bold text-amber-600">📌 Disematkan</span>}
                          </div>
                          <KabarFeedBody post={k} />
                          <Link href={`/feed?post=${k.id}`} className="flex items-center justify-between text-[11px] font-bold text-slate-500 hover:text-emerald-600 pt-1">
                            <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {k.commentCount} komentar · ❤️ {k.likeCount}</span>
                            <span className="flex items-center">Tanggapi <ChevronRight className="w-3.5 h-3.5" /></span>
                          </Link>
                        </article>
                      ))}
                    </div>
                    {!kabar.length && <EmptyState emoji="📰" text="Belum ada kabar. Bagikan kabar pertama untuk warga!" />}
                  </div>
                )}

                {tab === "polling" && (
                  <div className="space-y-3">
                    <div className="flex gap-1.5">
                      {(["AKTIF", "SELESAI"] as const).map((f) => (
                        <button key={f} onClick={() => setPollFilter(f)} className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold border ${pollFilter === f ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900" : "border-neutral-200 dark:border-neutral-800"}`}>
                          {f === "AKTIF" ? `Berlangsung (${data?.polls.filter((p) => p.status === "AKTIF").length ?? 0})` : "Hasil polling"}
                        </button>
                      ))}
                    </div>
                    <div className="grid lg:grid-cols-2 gap-3 items-start">
                      {(data?.polls ?? []).filter((p) => (pollFilter === "AKTIF" ? p.status === "AKTIF" : p.status !== "AKTIF")).map((p) => (
                        <div key={p.id} id={`poll-${p.id}`} className={pollParam === p.id ? "ring-2 ring-emerald-500 rounded-2xl" : ""}>
                          {p.meetingId && <p className="text-[10px] font-bold text-sky-600 mb-1 px-1">🏛️ Voting dalam musyawarah</p>}
                          <PollCard poll={p} userId={userId} isPengurus={pengurus} onChange={updatePoll} />
                        </div>
                      ))}
                    </div>
                    {!(data?.polls ?? []).some((p) => (pollFilter === "AKTIF" ? p.status === "AKTIF" : p.status !== "AKTIF")) && (
                      <EmptyState emoji="🗳️" text={pollFilter === "AKTIF" ? "Tidak ada polling berlangsung." : "Belum ada hasil polling."} />
                    )}
                  </div>
                )}

                {tab === "musyawarah" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h2 className="text-xs font-black text-slate-500">AKAN DATANG</h2>
                      {meetings.upcoming.map((m) => <MeetingRow key={m.id} m={m} onOpen={() => setParam({ meeting: m.id })} />)}
                      {!meetings.upcoming.length && <EmptyState emoji="🏛️" text="Belum ada musyawarah terjadwal." />}
                    </div>
                    {meetings.past.length > 0 && (
                      <div className="space-y-2">
                        <h2 className="text-xs font-black text-slate-500">ARSIP & NOTULEN</h2>
                        {meetings.past.map((m) => <MeetingRow key={m.id} m={m} onOpen={() => setParam({ meeting: m.id })} />)}
                      </div>
                    )}
                  </div>
                )}

                {tab === "donasi" && (
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {(data?.fundraisers ?? []).map((f) => (
                      <button key={f.id} onClick={() => setParam({ fund: f.id })} className={`text-left rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] overflow-hidden ${f.status === "SELESAI" ? "opacity-70" : ""}`}>
                        {f.coverUrl ? <img src={f.coverUrl} alt="" className="w-full h-32 object-cover" /> : <div className="h-20 bg-gradient-to-br from-rose-500/80 to-amber-400/80 flex items-center justify-center text-4xl">{FUND_META[f.category].emoji}</div>}
                        <div className="p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] font-black text-rose-600">{FUND_META[f.category].label.toUpperCase()}</p>
                            {pengurus && f.pending > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black">{f.pending} verifikasi</span>}
                          </div>
                          <p className="text-sm font-extrabold leading-snug line-clamp-2">{f.title}</p>
                          <FundProgress f={f} />
                        </div>
                      </button>
                    ))}
                    {!data?.fundraisers.length && <div className="sm:col-span-2 xl:col-span-3"><EmptyState emoji="🤲" text="Belum ada penggalangan dana." /></div>}
                  </div>
                )}

                {tab === "inventaris" && (
                  <div className="space-y-4">
                    {pengurus && (
                      <div className="flex gap-1.5">
                        <button onClick={() => setParam({ manage: null })} className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold border ${!manage ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900" : "border-neutral-200 dark:border-neutral-800"}`}>Katalog</button>
                        <button onClick={() => setParam({ manage: "1" })} className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold border ${manage ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900" : "border-neutral-200 dark:border-neutral-800"}`}>Kelola pinjaman {c?.pendingLoans ? `(${c.pendingLoans})` : ""}</button>
                      </div>
                    )}
                    {manage && pengurus ? (
                      <div className="space-y-2">
                        {data!.loans.map((l) => <LoanRow key={l.id} loan={l} userId={userId} manage onChanged={reload} />)}
                        {!data!.loans.length && <EmptyState emoji="📦" text="Tidak ada pinjaman aktif." />}
                      </div>
                    ) : (
                      <>
                        {data!.myLoans.some((l) => ["DIAJUKAN", "DISETUJUI", "DIPINJAM"].includes(l.status)) && (
                          <div className="space-y-2">
                            <h2 className="text-xs font-black text-slate-500">PINJAMAN SAYA</h2>
                            {data!.myLoans.filter((l) => ["DIAJUKAN", "DISETUJUI", "DIPINJAM"].includes(l.status)).map((l) => <LoanRow key={l.id} loan={l} userId={userId} manage={false} onChanged={reload} />)}
                          </div>
                        )}
                        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                          {(["SEMUA", ...Object.keys(INVENTORY_META)] as (InventoryCategory | "SEMUA")[]).map((k) => (
                            <button key={k} onClick={() => setInvCat(k)} className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border ${invCat === k ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900" : "border-neutral-200 dark:border-neutral-800"}`}>
                              {k === "SEMUA" ? "Semua" : `${INVENTORY_META[k].emoji} ${INVENTORY_META[k].label}`}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                          {items.map((i) => <ItemCard key={i.id} item={i} onBorrow={() => setBorrow(i)} onEdit={pengurus ? () => setEditItem(i) : undefined} />)}
                        </div>
                        {!items.length && <EmptyState emoji="📦" text="Belum ada barang inventaris." />}
                        {data!.myLoans.some((l) => !["DIAJUKAN", "DISETUJUI", "DIPINJAM"].includes(l.status)) && (
                          <details className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3">
                            <summary className="text-xs font-bold cursor-pointer">Riwayat pinjaman saya</summary>
                            <div className="space-y-2 mt-2">{data!.myLoans.filter((l) => !["DIAJUKAN", "DISETUJUI", "DIPINJAM"].includes(l.status)).map((l) => <LoanRow key={l.id} loan={l} userId={userId} manage={false} onChanged={reload} />)}</div>
                          </details>
                        )}
                      </>
                    )}
                  </div>
                )}

                {tab === "kontak" && (
                  <div className="space-y-4">
                    <a href="/keamanan?tab=darurat" className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 text-white p-4">
                      <span className="text-3xl">🚨</span>
                      <span className="flex-1"><span className="block text-sm font-black">Darurat di lingkungan?</span><span className="block text-[11px] opacity-90">Tekan tombol SOS — satpam & pengurus langsung menerima sinyal.</span></span>
                      <ChevronRight className="w-5 h-5" />
                    </a>
                    {data!.officers.length > 0 && (
                      <ContactGroup title="🧑‍💼 Pengurus RT">
                        {data!.officers.map((o) => <ContactRow key={o.id} name={o.name} sub={`${ROLE_LABEL[o.role] ?? o.role}${o.houseBlock ? ` · ${o.houseBlock}` : ""}`} phone={o.phone} />)}
                      </ContactGroup>
                    )}
                    {(Object.keys(CONTACT_META) as ContactCategory[]).map((cat) => {
                      const list = data!.contacts.filter((x) => x.category === cat);
                      if (!list.length) return null;
                      return (
                        <ContactGroup key={cat} title={`${CONTACT_META[cat].emoji} ${CONTACT_META[cat].label}`}>
                          {list.map((x) => (
                            <ContactRow key={x.id} name={x.name} sub={[x.notes, x.address].filter(Boolean).join(" · ")} phone={x.phone}
                              actions={pengurus ? (
                                <>
                                  <button onClick={() => setEditContact(x)} className="w-8 h-8 rounded-lg text-slate-400 flex items-center justify-center" aria-label="Ubah"><Pencil className="w-3.5 h-3.5" /></button>
                                  <button onClick={async () => { if (!confirm(`Hapus kontak ${x.name}?`)) return; try { await balaiApi("CONTACT_DELETE", userId, { id: x.id }); reload(); } catch (e: any) { toast.error(e.message); } }} className="w-8 h-8 rounded-lg text-slate-400 flex items-center justify-center" aria-label="Hapus"><Trash2 className="w-3.5 h-3.5" /></button>
                                </>
                              ) : null}
                            />
                          ))}
                        </ContactGroup>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>

      {fab[tab] && (
        <button onClick={() => setCreate(fab[tab]!.kind)} className="fixed z-30 right-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] md:bottom-8 md:right-8 min-h-[52px] pl-4 pr-5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black shadow-xl shadow-emerald-600/30 flex items-center gap-2 active:scale-95 transition-transform">
          <Plus className="w-5 h-5" /> {fab[tab]!.label}
        </button>
      )}

      <Sheet open={create === "kabar"} onClose={() => setCreate(null)} title="Bagikan kabar">
        {create === "kabar" && <KabarForm userId={userId} isPengurus={pengurus} onDone={() => { setCreate(null); reload(); }} />}
      </Sheet>
      <Sheet open={create === "poll"} onClose={() => setCreate(null)} title="Polling baru">
        {create === "poll" && <PollForm userId={userId} onDone={() => { setCreate(null); setPollFilter("AKTIF"); reload(); }} />}
      </Sheet>
      <Sheet open={create === "meeting"} onClose={() => setCreate(null)} title="Jadwalkan musyawarah">
        {create === "meeting" && <MeetingForm userId={userId} onDone={() => { setCreate(null); reload(); }} />}
      </Sheet>
      <Sheet open={create === "fund"} onClose={() => setCreate(null)} title="Buka galang dana">
        {create === "fund" && <FundForm userId={userId} onDone={() => { setCreate(null); reload(); }} />}
      </Sheet>
      <Sheet open={create === "item" || !!editItem} onClose={() => { setCreate(null); setEditItem(null); }} title={editItem ? "Ubah barang" : "Tambah barang inventaris"}>
        {(create === "item" || editItem) && <ItemForm key={editItem?.id ?? "new"} userId={userId} item={editItem} onDone={() => { setCreate(null); setEditItem(null); reload(); }} />}
      </Sheet>
      <Sheet open={create === "contact" || !!editContact} onClose={() => { setCreate(null); setEditContact(null); }} title={editContact ? "Ubah kontak" : "Tambah kontak penting"}>
        {(create === "contact" || editContact) && <ContactForm key={editContact?.id ?? "new"} userId={userId} contact={editContact} onDone={() => { setCreate(null); setEditContact(null); reload(); }} />}
      </Sheet>
      <Sheet open={!!borrow} onClose={() => setBorrow(null)} title="Pinjam inventaris RT">
        {borrow && <BorrowForm item={borrow} userId={userId} onDone={() => { setBorrow(null); reload(); }} />}
      </Sheet>
      <Sheet open={!!openMeeting} onClose={() => setParam({ meeting: null, checkin: null })} title="Musyawarah" wide>
        {openMeeting && <MeetingDetail meeting={openMeeting} userId={userId} isPengurus={pengurus} checkinCode={checkin} onChanged={reload} />}
      </Sheet>
      <Sheet open={!!openFund} onClose={() => setParam({ fund: null })} title="Galang dana">
        {openFund && <FundDetail fund={openFund} userId={userId} isPengurus={pengurus} onChanged={reload} />}
      </Sheet>
    </div>
  );
}

function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="text-center py-12 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800">
      <p className="text-4xl">{emoji}</p>
      <p className="text-xs text-slate-500 mt-2">{text}</p>
    </div>
  );
}

function MeetingRow({ m, onOpen }: { m: NonNullable<ReturnType<typeof useBalai>["data"]>["meetings"][number]; onOpen: () => void }) {
  const d = new Date(m.startAt);
  const st = MEETING_STATUS_META[m.status];
  const live = m.status === "BERLANGSUNG";
  return (
    <button onClick={onOpen} className={`w-full text-left rounded-2xl border bg-white dark:bg-[#131F17] p-3 flex gap-3 items-center ${live ? "border-red-500/50 ring-2 ring-red-500/20" : "border-neutral-200/80 dark:border-neutral-800/80"}`}>
      <div className={`w-14 shrink-0 rounded-2xl text-center py-1.5 ${m.status === "DIBATALKAN" ? "bg-slate-500/10" : "bg-sky-500/10"}`}>
        <p className="text-[10px] font-black text-sky-600 uppercase">{d.toLocaleDateString("id-ID", { month: "short", timeZone: "Asia/Jakarta" })}</p>
        <p className="text-xl font-black leading-none">{d.toLocaleDateString("id-ID", { day: "numeric", timeZone: "Asia/Jakarta" })}</p>
        <p className="text-[9px] font-bold text-slate-500">{d.toLocaleDateString("id-ID", { weekday: "short", timeZone: "Asia/Jakarta" })}</p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${st.tone} ${live ? "animate-pulse" : ""}`}>{live ? "🔴 LIVE" : st.label}</span>
          {m.myRsvp && m.status !== "SELESAI" && <span className="text-[10px] font-bold text-emerald-600">{m.myRsvp.checkedInAt ? "✓ Sudah absen" : m.myRsvp.rsvp === "HADIR" ? "✓ Hadir" : m.myRsvp.rsvp === "MUNGKIN" ? "Mungkin" : "Berhalangan"}</span>}
        </div>
        <p className="text-sm font-extrabold truncate mt-0.5">{m.title}</p>
        <p className="text-[11px] text-slate-500 flex items-center gap-2 truncate">
          <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}</span>
          <span className="flex items-center gap-0.5 truncate"><MapPin className="w-3 h-3" /> {m.location}</span>
        </p>
        <p className="text-[10px] text-slate-500 mt-0.5">
          {m.status === "SELESAI" ? `${m.stats.checkedIn} hadir · ${m.decisions.length} keputusan` : `${m.stats.hadir} akan hadir${m.status === "TERJADWAL" ? ` · ${timeLeft(m.startAt)}` : ""}`}
          {m.polls.length ? ` · ${m.polls.length} voting` : ""}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
    </button>
  );
}

function ContactGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] p-3">
      <h2 className="text-xs font-black mb-1">{title}</h2>
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">{children}</div>
    </section>
  );
}

function ContactRow({ name, sub, phone, actions }: { name: string; sub?: string; phone?: string | null; actions?: React.ReactNode }) {
  const short = phone && phone.replace(/\D/g, "").length <= 5;
  return (
    <div className="flex items-center gap-2 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold truncate">{name}</p>
        <p className="text-[10px] text-slate-500 truncate">{phone}{sub ? ` · ${sub}` : ""}</p>
      </div>
      {actions}
      {phone && (
        <>
          {!short && <a href={waLink("Halo, saya warga dari WargaIn.", phone)} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center" aria-label="WhatsApp"><MessageCircle className="w-4 h-4" /></a>}
          <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-700 flex items-center justify-center" aria-label="Telepon"><Phone className="w-4 h-4" /></a>
        </>
      )}
    </div>
  );
}
