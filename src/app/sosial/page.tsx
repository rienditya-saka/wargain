"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Building, HeartHandshake, CalendarHeart, Users, HeartPulse, Settings2, Plus, Sparkles, X, History, Baby } from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { getClientSession } from "@/lib/auth-session";
import { SessionTenant } from "@/lib/types/auth";
import { useSocialData } from "@/lib/sosial/client";
import { CATEGORY_META, PENGURUS_ROLES, SocialCategory, SocialEvent, isEligible, relativeDay } from "@/lib/sosial/types";
import { EventCard } from "@/components/sosial/event-card";
import { EventDetail } from "@/components/sosial/event-detail";
import { EventForm } from "@/components/sosial/event-form";
import { HealthHistory } from "@/components/sosial/health-history";
import { KmsCard } from "@/components/kms/kms-card";
import { KmsDashboard } from "@/components/kms/kms-dashboard";
import { useHouseholdKms } from "@/lib/kms/client";

type TabId = "kegiatan" | "keluarga" | "kesehatan" | "posyandu" | "kelola";
const DEFAULT_COMMUNITY_ID = "comm_1789889738300";
const UPCOMING_GRACE_MS = 6 * 3_600_000;

export default function SosialPage() {
  return (
    <Suspense fallback={null}>
      <SosialContent />
    </Suspense>
  );
}

function monthLabel(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
}

function SosialContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<SessionTenant | null>(null);
  const [ready, setReady] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [creating, setCreating] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<SocialCategory | "SEMUA">("SEMUA");
  const [forFamily, setForFamily] = useState(false);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    setSession(getClientSession());
    setReady(true);
  }, []);

  const communityId = session?.communityId || DEFAULT_COMMUNITY_ID;
  const userId = session?.userId;
  const isPengurus = PENGURUS_ROLES.includes(session?.role ?? "");
  const { events, household, householdRegistrations, houseBlock, loading, error, reload } = useSocialData(ready ? communityId : undefined, userId, "all");
  const kms = useHouseholdKms(ready ? communityId : undefined, userId);

  const tabParam = searchParams.get("tab") as TabId | null;
  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "kegiatan", label: "Kegiatan", icon: CalendarHeart },
    { id: "keluarga", label: "Keluarga Saya", icon: Users },
    { id: "kesehatan", label: "Kesehatan", icon: HeartPulse },
    ...(isPengurus
      ? [
          { id: "posyandu" as TabId, label: "Posyandu", icon: Baby },
          { id: "kelola" as TabId, label: "Kelola", icon: Settings2 },
        ]
      : []),
  ];
  const tab: TabId = tabs.some((t) => t.id === tabParam) ? (tabParam as TabId) : "kegiatan";
  const openEventId = searchParams.get("event");
  const openEvent = events.find((e) => e.id === openEventId) ?? null;

  const setParams = (next: { tab?: TabId; event?: string | null }) => {
    const p = new URLSearchParams(searchParams.toString());
    if (next.tab) p.set("tab", next.tab);
    if (next.event === null) p.delete("event");
    else if (next.event) p.set("event", next.event);
    router.replace(`/sosial?${p.toString()}`, { scroll: false });
  };

  const now = Date.now();
  const upcoming = useMemo(
    () => events.filter((e) => new Date(e.startAt).getTime() >= now - UPCOMING_GRACE_MS).sort((a, b) => a.startAt.localeCompare(b.startAt)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events]
  );
  const past = useMemo(() => events.filter((e) => new Date(e.startAt).getTime() < now - UPCOMING_GRACE_MS), [events, now]);

  const regsByEvent = useMemo(() => {
    const m = new Map<string, typeof householdRegistrations>();
    householdRegistrations.forEach((r) => m.set(r.eventId, [...(m.get(r.eventId) ?? []), r]));
    return m;
  }, [householdRegistrations]);

  const relevantToFamily = (e: SocialEvent) =>
    (regsByEvent.get(e.id) ?? []).some((r) => r.status !== "BATAL") ||
    (e.audience !== "SEMUA" && household.some((m) => isEligible(e.audience, m, new Date(e.startAt))));

  const listed = (showPast ? past : upcoming)
    .filter((e) => categoryFilter === "SEMUA" || e.category === categoryFilter)
    .filter((e) => !forFamily || relevantToFamily(e));

  const grouped = useMemo(() => {
    const g: { month: string; items: SocialEvent[] }[] = [];
    listed.forEach((e) => {
      const m = monthLabel(e.startAt);
      const last = g[g.length - 1];
      if (last?.month === m) last.items.push(e);
      else g.push({ month: m, items: [e] });
    });
    return g;
  }, [listed]);

  const familyUpcoming = upcoming.filter((e) => e.status === "TERJADWAL" && (regsByEvent.get(e.id) ?? []).some((r) => r.status !== "BATAL"));
  const nextFamilyEvent = familyUpcoming[0];
  const nextFamilyNames = nextFamilyEvent ? (regsByEvent.get(nextFamilyEvent.id) ?? []).filter((r) => r.status !== "BATAL").map((r) => r.participantName) : [];
  const usedCategories = Array.from(new Set(events.map((e) => e.category)));

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-[#FBFBF9] dark:bg-[#0B130E] text-slate-900 dark:text-slate-100 pb-28 md:pb-12 font-sans overflow-x-hidden">
      <header className="sticky top-0 z-40 bg-[#FBFBF9]/90 dark:bg-[#0B130E]/90 backdrop-blur-xl border-b border-neutral-200/80 dark:border-neutral-800/80 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button onClick={() => setDrawer(true)} className="md:hidden w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-center shrink-0" aria-label="Buka menu utama">
              <Menu className="w-5 h-5" />
            </button>
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-emerald-600/30">W</div>
              <span className="font-extrabold text-base tracking-tight hidden sm:inline">Warga<span className="text-emerald-600">In</span></span>
            </Link>
            <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700 mx-1 hidden sm:block" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium min-w-0">
              <Building className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate max-w-[130px] sm:max-w-xs">{session?.communityName || "Komunitas WargaIn"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <NotificationBell userId={userId} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 md:py-6">
        <div className="flex flex-col md:flex-row lg:gap-6 items-start">
          <AppSidebar session={session} isMobileDrawerOpen={drawer} onCloseMobileDrawer={() => setDrawer(false)} />

          <section className="flex-1 w-full min-w-0 space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-900/50 to-slate-900 border border-emerald-500/30 p-4 sm:p-6 relative overflow-hidden">
              <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                    <HeartHandshake className="w-3.5 h-3.5" /> Kegiatan Sosial Warga
                  </div>
                  <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">Posyandu, kerja bakti & kegiatan warga</h1>
                  <p className="text-[11px] sm:text-sm text-slate-300">
                    Balita & lansia otomatis terdaftar di posyandu. Warga cukup cek jadwal, daftar, dan dapat pengingat.
                  </p>
                </div>
                {nextFamilyEvent ? (
                  <button onClick={() => setParams({ event: nextFamilyEvent.id })} className="text-left rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 p-3.5 text-white lg:w-80 shrink-0 transition-colors">
                    <p className="text-[10px] font-bold uppercase opacity-80">Jadwal keluarga terdekat</p>
                    <p className="text-sm font-black mt-0.5">
                      {CATEGORY_META[nextFamilyEvent.category]?.emoji} {nextFamilyEvent.title}
                      {relativeDay(nextFamilyEvent.startAt) && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-400 text-slate-900 text-[10px]">{relativeDay(nextFamilyEvent.startAt)}</span>}
                    </p>
                    <p className="text-[11px] opacity-90 truncate">{nextFamilyNames.join(", ")}</p>
                  </button>
                ) : (
                  isPengurus && (
                    <button onClick={() => { setCreating(true); setParams({ tab: "kelola" }); }} className="hidden md:flex min-h-[44px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black items-center gap-1.5 shrink-0">
                      <Plus className="w-4 h-4" /> Buat Kegiatan
                    </button>
                  )
                )}
              </div>
            </div>

            <nav className="sticky top-[57px] z-30 -mx-3 sm:mx-0 px-3 sm:px-0 py-1.5 bg-[#FBFBF9]/95 dark:bg-[#0B130E]/95 backdrop-blur" aria-label="Menu sosial">
              <div className="flex gap-1 p-1 rounded-2xl bg-white dark:bg-[#131F17] border border-neutral-200/80 dark:border-neutral-800/80 overflow-x-auto">
                {tabs.map((t) => {
                  const Icon = t.icon;
                  const active = t.id === tab;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setParams({ tab: t.id })}
                      aria-current={active ? "page" : undefined}
                      className={`flex-1 min-w-fit min-h-[40px] px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
                        active ? "bg-emerald-600 text-white shadow" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      <Icon className="w-4 h-4" /> {t.label}
                      {t.id === "keluarga" && familyUpcoming.length > 0 && (
                        <span className={`px-1.5 rounded-full text-[10px] font-black ${active ? "bg-white/25" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"}`}>{familyUpcoming.length}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </nav>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 font-semibold">{error}</div>
            )}

            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              {tab === "kegiatan" && (
                <div className="space-y-3">
                  <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                    <Chip active={forFamily} onClick={() => setForFamily((v) => !v)}>
                      <Sparkles className="w-3.5 h-3.5" /> Untuk keluarga saya
                    </Chip>
                    <Chip active={categoryFilter === "SEMUA"} onClick={() => setCategoryFilter("SEMUA")}>Semua</Chip>
                    {usedCategories.map((c) => (
                      <Chip key={c} active={categoryFilter === c} onClick={() => setCategoryFilter(c)}>
                        {CATEGORY_META[c]?.emoji} {CATEGORY_META[c]?.label}
                      </Chip>
                    ))}
                  </div>

                  {loading ? (
                    <SkeletonList />
                  ) : grouped.length === 0 ? (
                    <EmptyState isPengurus={isPengurus} onCreate={() => { setCreating(true); setParams({ tab: "kelola" }); }} past={showPast} />
                  ) : (
                    grouped.map((g) => (
                      <div key={g.month} className="space-y-2">
                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 px-1">{g.month}</p>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
                          {g.items.map((e) => (
                            <EventCard key={e.id} event={e} householdRegs={regsByEvent.get(e.id)} onOpen={() => setParams({ event: e.id })} />
                          ))}
                        </div>
                      </div>
                    ))
                  )}

                  <button onClick={() => setShowPast((v) => !v)} className="w-full min-h-[40px] rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center gap-1.5">
                    <History className="w-3.5 h-3.5" /> {showPast ? "Kembali ke jadwal mendatang" : `Lihat kegiatan yang sudah lewat (${past.length})`}
                  </button>
                </div>
              )}

              {tab === "keluarga" && (
                <div className="space-y-4">
                  {household.length === 0 ? (
                    <div className="text-center text-xs text-slate-500 py-10 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                      Akun ini belum terhubung ke data rumah. {houseBlock ? "" : "Minta pengurus menautkan akun ke data kependudukan."}
                    </div>
                  ) : (
                    <>
                      <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] p-4">
                        <p className="text-xs font-extrabold mb-2.5">Rumah {houseBlock} · {household.length} anggota</p>
                        <div className="flex flex-wrap gap-1.5">
                          {household.map((m) => (
                            <span key={m.id} className="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[11px] font-semibold">
                              {m.fullName.split(" ")[0]} · {m.age} th
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 px-1">Jadwal yang diikuti keluarga</p>
                      {familyUpcoming.length === 0 ? (
                        <div className="text-center text-xs text-slate-500 py-8 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">Belum ada jadwal. Cek tab Kegiatan.</div>
                      ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
                          {familyUpcoming.map((e) => (
                            <EventCard key={e.id} event={e} householdRegs={regsByEvent.get(e.id)} onOpen={() => setParams({ event: e.id })} />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {tab === "kesehatan" && (
                <div className="space-y-4">
                  {kms.children.length > 0 && (
                    <>
                      <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 px-1">KMS Digital · Balita</p>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                        {kms.children.map((c) => (
                          <KmsCard key={c.citizen.id} child={c} userId={userId} canEdit onChanged={kms.reload} />
                        ))}
                      </div>
                    </>
                  )}
                  {household.some((m) => m.age >= 60) && (
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 px-1">Posyandu Lansia</p>
                  )}
                  <HealthHistory
                    household={household.filter((m) => m.age >= 60 || !kms.children.some((c) => c.citizen.id === m.id))}
                    registrations={householdRegistrations}
                    events={events}
                  />
                </div>
              )}

              {tab === "posyandu" && isPengurus && <KmsDashboard communityId={communityId} userId={userId} />}

              {tab === "kelola" && isPengurus && (
                <div className="space-y-4">
                  {creating ? (
                    <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] p-4 sm:p-5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-extrabold">Buat kegiatan baru</p>
                        <button onClick={() => setCreating(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400" aria-label="Tutup form">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <EventForm
                        communityId={communityId}
                        userId={userId}
                        organizerName={session?.fullName ? `${session.fullName} (${session.role === "KETUA" ? "Ketua RT" : "Pengurus RT"})` : "Pengurus RT"}
                        onCancel={() => setCreating(false)}
                        onDone={() => {
                          setCreating(false);
                          reload();
                        }}
                      />
                    </div>
                  ) : (
                    <button onClick={() => setCreating(true)} className="w-full min-h-[52px] rounded-2xl border-2 border-dashed border-emerald-500/50 text-emerald-700 dark:text-emerald-400 text-sm font-black flex items-center justify-center gap-2 hover:bg-emerald-500/5">
                      <Plus className="w-5 h-5" /> Buat kegiatan baru
                    </button>
                  )}
                  <ManageList events={events} onOpen={(e) => setParams({ event: e.id })} />
                </div>
              )}
            </motion.div>
          </section>
        </div>
      </main>

      {isPengurus && tab !== "kelola" && (
        <button
          onClick={() => { setCreating(true); setParams({ tab: "kelola" }); }}
          className="md:hidden fixed right-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-40 w-14 h-14 rounded-2xl bg-emerald-600 text-white shadow-xl shadow-emerald-600/40 flex items-center justify-center"
          aria-label="Buat kegiatan"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      <EventDetail
        event={openEvent}
        open={!!openEvent}
        onClose={() => setParams({ event: null })}
        userId={userId}
        communityId={communityId}
        isPengurus={isPengurus}
        household={household}
        householdRegs={householdRegistrations}
        onChanged={reload}
      />
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 min-h-[36px] px-3 rounded-full text-[11px] font-bold border flex items-center gap-1.5 transition-colors ${
        active ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white" : "bg-white dark:bg-[#131F17] border-neutral-200 dark:border-neutral-800 text-slate-600 dark:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

function SkeletonList() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-[118px] rounded-2xl bg-neutral-100 dark:bg-neutral-900 animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ isPengurus, onCreate, past }: { isPengurus: boolean; onCreate: () => void; past: boolean }) {
  return (
    <div className="text-center py-12 px-4 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-3">
      <p className="text-4xl">📅</p>
      <p className="text-sm font-bold">{past ? "Belum ada kegiatan yang lewat." : "Belum ada kegiatan terjadwal."}</p>
      {isPengurus && !past && (
        <button onClick={onCreate} className="min-h-[44px] px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Jadwalkan posyandu / kegiatan
        </button>
      )}
    </div>
  );
}

function ManageList({ events, onOpen }: { events: SocialEvent[]; onOpen: (e: SocialEvent) => void }) {
  const [status, setStatus] = useState<"TERJADWAL" | "SELESAI" | "DIBATALKAN">("TERJADWAL");
  const listed = events
    .filter((e) => e.status === status)
    .sort((a, b) => (status === "TERJADWAL" ? a.startAt.localeCompare(b.startAt) : b.startAt.localeCompare(a.startAt)));
  const totalRegistered = events.filter((e) => e.status === "TERJADWAL").reduce((n, e) => n + (e.registeredCount ?? 0), 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Terjadwal" value={events.filter((e) => e.status === "TERJADWAL").length} />
        <Stat label="Pendaftar aktif" value={totalRegistered} />
        <Stat label="Selesai" value={events.filter((e) => e.status === "SELESAI").length} />
      </div>
      <div className="flex rounded-xl border border-neutral-200 dark:border-neutral-800 p-0.5 text-[11px] font-bold">
        {(["TERJADWAL", "SELESAI", "DIBATALKAN"] as const).map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`flex-1 min-h-[34px] rounded-lg ${status === s ? "bg-emerald-600 text-white" : "text-slate-500"}`}>
            {s === "TERJADWAL" ? "Terjadwal" : s === "SELESAI" ? "Selesai" : "Dibatalkan"}
          </button>
        ))}
      </div>
      <AnimatePresence initial={false}>
        {listed.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">Tidak ada kegiatan.</p>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
            {listed.map((e) => (
              <EventCard key={e.id} event={e} onOpen={() => onOpen(e)} />
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] p-3">
      <p className="text-[10px] font-semibold text-slate-500">{label}</p>
      <p className="text-lg font-black">{value}</p>
    </div>
  );
}
