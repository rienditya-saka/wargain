"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Menu, Plus, Rss, Megaphone, HeartHandshake, ShieldAlert, ShoppingBag, ArrowUp, CalendarHeart, Siren, FileText, Wallet,
  ChevronRight, MessageSquareWarning, ImagePlus, Sparkles,
  Vote,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { PostCard, PostSkeleton } from "@/components/feed/post-card";
import { Composer } from "@/components/feed/composer";
import { getClientSession, setClientSession } from "@/lib/auth-session";
import { SessionTenant } from "@/lib/types/auth";
import { fetchSinglePost, useFeed } from "@/lib/feed/client";
import { FEED_FILTERS, FeedFilterKey, FeedPost, UserPostType } from "@/lib/feed/types";
import { useSocialData } from "@/lib/sosial/client";
import { CATEGORY_META, dateBadge, formatEventTime, relativeDay } from "@/lib/sosial/types";
import { PENGURUS_ROLES } from "@/lib/notifications/registry";

const DEFAULT_COMMUNITY_ID = "comm_1789889738300";
const FILTER_ICONS: Record<FeedFilterKey, React.ElementType> = {
  ALL: Rss,
  ANNOUNCEMENT: Megaphone,
  BALAI: Vote,
  EVENT: HeartHandshake,
  SECURITY: ShieldAlert,
  COMMERCE: ShoppingBag,
};
const FILTER_KEYS = Object.keys(FEED_FILTERS) as FeedFilterKey[];

export default function FeedPage() {
  return (
    <Suspense fallback={null}>
      <FeedContent />
    </Suspense>
  );
}

function FeedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<SessionTenant | null>(null);
  const [ready, setReady] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [composer, setComposer] = useState<{ open: boolean; type: UserPostType }>({ open: false, type: "GENERAL" });
  const [focused, setFocused] = useState<FeedPost | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = getClientSession();
    setSession(s);
    setReady(true);
    if (s?.email || s?.userId) {
      fetch("/api/auth/sync-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: s.email, userId: s.userId, communityId: s.communityId }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d?.success && d.session) {
            setClientSession({ ...s, ...d.session });
            setSession({ ...s, ...d.session });
          }
        })
        .catch(() => {});
    }
  }, []);

  const communityId = session?.communityId || DEFAULT_COMMUNITY_ID;
  const userId = session?.userId;
  const role = session?.role;
  const isPengurus = PENGURUS_ROLES.includes(role ?? "");
  const filterParam = searchParams.get("filter") as FeedFilterKey | null;
  const filter: FeedFilterKey = filterParam && FILTER_KEYS.includes(filterParam) ? filterParam : "ALL";
  const postParam = searchParams.get("post");

  const feed = useFeed({ communityId: ready ? communityId : undefined, userId, filter, isPengurus });
  const { events } = useSocialData(ready ? communityId : undefined, userId, "upcoming");
  const agenda = useMemo(() => events.filter((e) => e.status === "TERJADWAL").slice(0, 4), [events]);

  // Deep link from a notification: show that post on top, highlighted.
  useEffect(() => {
    if (!ready || !postParam) {
      setFocused(null);
      return;
    }
    fetchSinglePost(communityId, postParam, userId).then(setFocused).catch(() => setFocused(null));
  }, [ready, postParam, communityId, userId]);

  // Infinite scroll.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && feed.loadMore(), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [feed.loadMore, feed.hasMore]);

  const setFilter = (f: FeedFilterKey) => {
    const p = new URLSearchParams(searchParams.toString());
    if (f === "ALL") p.delete("filter");
    else p.set("filter", f);
    p.delete("post");
    router.replace(`/feed${p.toString() ? `?${p}` : ""}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openComposer = (type: UserPostType = "GENERAL") => {
    if (!userId) {
      router.push("/login");
      return;
    }
    setComposer({ open: true, type });
  };

  const viewer = { userId, role, fullName: session?.fullName };
  const list = feed.posts.filter((p) => p.id !== focused?.id);
  const pinned = feed.pinned.filter((p) => p.id !== focused?.id);
  const firstName = (session?.fullName ?? "Warga").replace(/^(Bpk|Ibu|H|Hj)\.?\s+/i, "").split(" ")[0];

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-[#FBFBF9] dark:bg-[#0B130E] text-slate-900 dark:text-slate-100 pb-24 md:pb-10 font-sans overflow-x-clip">
      <header className="sticky top-0 z-40 bg-[#FBFBF9]/90 dark:bg-[#0B130E]/90 backdrop-blur-xl border-b border-neutral-200/80 dark:border-neutral-800/80 px-4 lg:px-6 py-2.5">
        <div className="w-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button onClick={() => setDrawer(true)} className="md:hidden w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-center shrink-0" aria-label="Buka menu utama">
              <Menu className="w-5 h-5 text-emerald-600" />
            </button>
            <Link href="/feed" className="flex items-center gap-2 min-w-0">
              <Image src="/images/logo.png" alt="WargaIn" width={36} height={36} className="w-9 h-9 object-contain shrink-0" />
              <div className="min-w-0 hidden sm:block">
                <span className="font-black text-lg tracking-tight leading-none block">Warga<span className="text-emerald-600">In</span></span>
                <span className="text-[10px] font-semibold text-slate-500 leading-none truncate block max-w-[220px]">{session?.communityName ?? "Komunitas WargaIn"}</span>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => openComposer()} className="hidden sm:flex items-center gap-1.5 px-3 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20">
              <Plus className="w-4 h-4" /> Buat Post
            </button>
            <NotificationBell userId={userId} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4 md:py-6">
        <div className="flex flex-col md:flex-row md:gap-4 lg:gap-6 items-start">
          <AppSidebar
            session={session}
            isMobileDrawerOpen={drawer}
            onCloseMobileDrawer={() => setDrawer(false)}
            activeFilter={filter}
            onSelectFilter={(f) => setFilter((FILTER_KEYS.includes(f as FeedFilterKey) ? f : "ALL") as FeedFilterKey)}
          />

          <section className="flex-1 w-full min-w-0 space-y-3">
            <nav className="sticky top-[57px] z-30 -mx-3 sm:mx-0 px-3 sm:px-0 py-1.5 bg-[#FBFBF9]/95 dark:bg-[#0B130E]/95 backdrop-blur" aria-label="Filter feed">
              <div className="flex gap-1 p-1 rounded-2xl bg-white dark:bg-[#131F17] border border-neutral-200/80 dark:border-neutral-800/80 overflow-x-auto no-scrollbar">
                {FILTER_KEYS.map((k) => {
                  const Icon = FILTER_ICONS[k];
                  const active = k === filter;
                  return (
                    <button
                      key={k}
                      onClick={() => setFilter(k)}
                      aria-current={active ? "page" : undefined}
                      className={`flex-1 min-w-fit min-h-[38px] px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
                        active ? "bg-emerald-600 text-white shadow" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" /> {FEED_FILTERS[k].label}
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Composer prompt */}
            <div className="rounded-2xl bg-white dark:bg-[#131F17] border border-neutral-200/80 dark:border-neutral-800/80 p-3 space-y-2.5">
              <button onClick={() => openComposer()} className="w-full flex items-center gap-2.5 text-left">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-black flex items-center justify-center shrink-0">
                  {firstName.slice(0, 1).toUpperCase()}
                </div>
                <span className="flex-1 min-h-[40px] px-4 rounded-full bg-neutral-100 dark:bg-neutral-800/70 text-sm text-slate-500 flex items-center">
                  {userId ? `Apa kabar, ${firstName}?` : "Login untuk ikut posting"}
                </span>
              </button>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { t: "GENERAL" as const, label: "Foto", icon: ImagePlus, tone: "text-emerald-600" },
                  { t: "COMMERCE" as const, label: "Jual", icon: ShoppingBag, tone: "text-sky-600" },
                  { t: (isPengurus ? "ANNOUNCEMENT" : "REPORT") as UserPostType, label: isPengurus ? "Pengumuman" : "Aduan", icon: isPengurus ? Megaphone : MessageSquareWarning, tone: "text-amber-600" },
                ].map((b) => (
                  <button key={b.label} onClick={() => openComposer(b.t)} className="min-h-[36px] rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5">
                    <b.icon className={`w-4 h-4 ${b.tone}`} /> {b.label}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {feed.incoming.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="sticky top-[112px] z-20 flex justify-center pointer-events-none">
                  <button
                    onClick={() => {
                      feed.showIncoming();
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="pointer-events-auto px-4 h-9 rounded-full bg-emerald-600 text-white text-xs font-black shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
                  >
                    <ArrowUp className="w-3.5 h-3.5" /> {feed.incoming.length} post baru
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {feed.error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-600">{feed.error}</div>}

            {focused && <PostCard key={`focus-${focused.id}`} post={focused} viewer={viewer} onLike={feed.toggleLike} onAction={feed.action} highlight />}

            {feed.loading ? (
              <>
                <PostSkeleton />
                <PostSkeleton />
              </>
            ) : (
              <>
                {pinned.map((p) => (
                  <PostCard key={p.id} post={p} viewer={viewer} onLike={feed.toggleLike} onAction={feed.action} />
                ))}
                {list.map((p) => (
                  <PostCard key={p.id} post={p} viewer={viewer} onLike={feed.toggleLike} onAction={feed.action} />
                ))}
                {pinned.length + list.length === 0 && !focused && (
                  <div className="text-center py-14 px-4 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 space-y-3">
                    <p className="text-4xl">🌱</p>
                    <p className="text-sm font-bold">Belum ada post di sini</p>
                    <p className="text-xs text-slate-500">Jadilah warga pertama yang berbagi kabar lingkungan.</p>
                    <button onClick={() => openComposer()} className="min-h-[42px] px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1.5">
                      <Plus className="w-4 h-4" /> Buat post
                    </button>
                  </div>
                )}
              </>
            )}

            <div ref={sentinel} />
            {feed.loadingMore && <PostSkeleton />}
            {!feed.loading && !feed.hasMore && list.length > 5 && <p className="text-center text-[11px] text-slate-400 py-4">Sudah sampai post paling awal ✨</p>}
          </section>

          <aside className="hidden xl:block w-80 shrink-0 self-start sticky top-20 max-h-[calc(100dvh-5.75rem)] overflow-y-auto overscroll-y-contain space-y-3">
            <div className="rounded-2xl bg-white dark:bg-[#131F17] border border-neutral-200/80 dark:border-neutral-800/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-extrabold flex items-center gap-1.5"><CalendarHeart className="w-4 h-4 text-pink-500" /> Agenda Terdekat</p>
                <Link href="/sosial" className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">Semua</Link>
              </div>
              {agenda.length === 0 ? (
                <p className="text-xs text-slate-500">Belum ada agenda.</p>
              ) : (
                <ul className="space-y-2">
                  {agenda.map((e) => {
                    const b = dateBadge(e.startAt);
                    const rel = relativeDay(e.startAt);
                    return (
                      <li key={e.id}>
                        <Link href={`/sosial?event=${encodeURIComponent(e.id)}`} className="flex items-center gap-2.5 p-2 -mx-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                          <div className={`w-11 h-11 rounded-xl bg-gradient-to-b ${CATEGORY_META[e.category]?.tone ?? "from-emerald-500 to-teal-600"} text-white flex flex-col items-center justify-center shrink-0`}>
                            <span className="text-sm font-black leading-none">{b.day}</span>
                            <span className="text-[9px] font-bold">{b.month}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold truncate">{CATEGORY_META[e.category]?.emoji} {e.title}</p>
                            <p className="text-[10px] text-slate-500 truncate">{rel ? `${rel} · ` : ""}{formatEventTime(e.startAt, e.endAt)}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="rounded-2xl bg-white dark:bg-[#131F17] border border-neutral-200/80 dark:border-neutral-800/80 p-4 space-y-2">
              <p className="text-sm font-extrabold flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-emerald-500" /> Pintasan</p>
              {[
                { href: "/keamanan?tab=darurat", label: "Tombol Panic", icon: Siren, tone: "text-red-600 bg-red-500/10" },
                { href: "/kas", label: "Bayar Iuran", icon: Wallet, tone: "text-amber-600 bg-amber-500/10" },
                { href: "/surat", label: "Ajukan Surat", icon: FileText, tone: "text-sky-600 bg-sky-500/10" },
                { href: "/sosial", label: "Kegiatan Sosial", icon: HeartHandshake, tone: "text-pink-600 bg-pink-500/10" },
              ].map((s) => (
                <Link key={s.href} href={s.href} className="flex items-center gap-2.5 p-2 -mx-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 text-xs font-bold">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.tone}`}><s.icon className="w-4 h-4" /></span>
                  {s.label}
                </Link>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 px-2">WargaIn · Feed terhubung realtime dengan modul Sosial, Keamanan, Kas & Surat.</p>
          </aside>
        </div>
      </main>

      {/* Mobile bottom nav with a center create button */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#0F1A13]/95 backdrop-blur-xl border-t border-neutral-200 dark:border-neutral-800 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]" aria-label="Navigasi feed">
        <div className="grid grid-cols-5 items-end">
          {(["ALL", "EVENT"] as FeedFilterKey[]).map((k) => (
            <BottomItem key={k} icon={FILTER_ICONS[k]} label={k === "ALL" ? "Beranda" : "Kegiatan"} active={filter === k} onClick={() => setFilter(k)} />
          ))}
          <button onClick={() => openComposer()} className="flex flex-col items-center gap-0.5 text-[10px] font-bold text-emerald-600" aria-label="Buat post">
            <span className="w-12 h-12 -mt-5 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 ring-4 ring-white dark:ring-[#0F1A13] flex items-center justify-center">
              <Plus className="w-6 h-6" />
            </span>
            Posting
          </button>
          {(["SECURITY", "COMMERCE"] as FeedFilterKey[]).map((k) => (
            <BottomItem key={k} icon={FILTER_ICONS[k]} label={k === "SECURITY" ? "Keamanan" : "Jual Beli"} active={filter === k} onClick={() => setFilter(k)} />
          ))}
        </div>
      </nav>

      <Composer open={composer.open} initialType={composer.type} role={role} onClose={() => setComposer((c) => ({ ...c, open: false }))} onSubmit={feed.create} />
    </div>
  );
}

function BottomItem({ icon: Icon, label, active, onClick }: { icon: React.ElementType; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-current={active ? "page" : undefined} className={`min-h-[50px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold ${active ? "text-emerald-600" : "text-slate-400"}`}>
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );
}
