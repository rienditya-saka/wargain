"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ShieldAlert,
  Siren,
  Radar,
  Map as MapIcon,
  CalendarDays,
  DoorOpen,
  Car,
  IdCard,
  Megaphone,
  Eye,
  Search,
  Home,
  Video,
  Tent,
  Handshake,
  Menu,
  LayoutGrid,
  Building,
  UserCog,
  User,
  RotateCcw,
  Database,
  CloudOff,
  X,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { getClientSession } from "@/lib/auth-session";
import { SessionTenant } from "@/lib/types/auth";
import { KeamananState, LOST_FOUND_CATEGORY_META } from "@/lib/keamanan/types";
import { toDateKey, useKeamananState } from "@/lib/keamanan/store";
import { PanicPanel } from "@/components/keamanan/panic-panel";
import { CommandCenterPanel } from "@/components/keamanan/command-center-panel";
import { PetaPanel } from "@/components/keamanan/peta-panel";
import { RondaPanel } from "@/components/keamanan/ronda-panel";
import { GatePanel } from "@/components/keamanan/gate-panel";
import { KendaraanPanel } from "@/components/keamanan/kendaraan-panel";
import { PekerjaPanel } from "@/components/keamanan/pekerja-panel";
import { LaporanPanel } from "@/components/keamanan/laporan-panel";
import { WaspadaPanel } from "@/components/keamanan/waspada-panel";
import { HilangPanel } from "@/components/keamanan/hilang-panel";
import { TitipRumahPanel } from "@/components/keamanan/titip-rumah-panel";
import { CctvPanel } from "@/components/keamanan/cctv-panel";
import { BencanaPanel, DisasterBanner } from "@/components/keamanan/bencana-panel";
import { SerahTerimaPanel } from "@/components/keamanan/serah-terima-panel";
import { SecurityUser } from "@/components/keamanan/ui";

type TabId =
  | "darurat"
  | "peta"
  | "gerbang"
  | "kendaraan"
  | "pekerja"
  | "ronda"
  | "laporan"
  | "waspada"
  | "hilang"
  | "titip"
  | "cctv"
  | "bencana"
  | "serahterima";
type ViewMode = "petugas" | "warga";

interface TabDef {
  id: TabId;
  label: string;
  short: string;
  icon: React.ElementType;
  description: string;
  count?: number;
  urgent?: boolean;
  petugasOnly?: boolean;
}

const PETUGAS_ROLES = ["TENANT_ADMIN", "KETUA", "SEKRETARIS", "HUMAS"];
const MOBILE_PRIMARY: TabId[] = ["darurat", "peta", "gerbang", "ronda"];
const DEFAULT_COMMUNITY_ID = "comm_1789890597407";

function buildTabs(state: KeamananState, isPetugas: boolean, houseBlock: string): TabDef[] {
  const activeAlerts = state.alerts.filter((a) => a.status === "BARU" || a.status === "DIRESPON").length;
  const pendingGate = state.gateLogs.filter(
    (g) => g.status === "MENUNGGU_KONFIRMASI" && (isPetugas || g.destinationBlock === houseBlock)
  ).length;
  const openIncidents = state.incidents.filter((i) => i.status !== "SELESAI").length;
  const dangerWatch = state.watchlist.filter((w) => w.active && w.level === "BAHAYA").length;
  const urgentLost = state.lostFound.filter((l) => l.status === "AKTIF" && l.type === "HILANG" && LOST_FOUND_CATEGORY_META[l.category].urgent).length;
  const pendingVehicles = state.vehicles.filter((v) => v.status === "MENUNGGU_VERIFIKASI").length;
  const pendingHandover = state.handovers.filter((h) => !h.acknowledgedAt).length;
  const today = toDateKey(new Date());
  const activeWatches = state.houseWatches.filter((w) => w.from <= today && w.to >= today).length;
  const helpNeeded = state.settings.disasterActive
    ? state.safetyCheckins.filter((c) => c.status === "BUTUH_BANTUAN" && (!state.settings.disasterStartedAt || c.createdAt >= state.settings.disasterStartedAt)).length
    : 0;

  const tabs: TabDef[] = [
    { id: "darurat", label: isPetugas ? "Command Center" : "Tombol Panic", short: isPetugas ? "Command" : "Panic", icon: isPetugas ? Radar : Siren, description: "Sinyal darurat & GPS", count: activeAlerts, urgent: activeAlerts > 0 },
    { id: "peta", label: "Peta Keamanan", short: "Peta", icon: MapIcon, description: "Sebaran kejadian & semua titik" },
    { id: "gerbang", label: isPetugas ? "Gerbang & Buku Tamu" : "Tamu Saya", short: "Gerbang", icon: DoorOpen, description: "One gate & buku tamu", count: pendingGate, urgent: pendingGate > 0 },
    { id: "kendaraan", label: isPetugas ? "ANPR & Kendaraan" : "Kendaraan Saya", short: "Kendaraan", icon: Car, description: "Plat, stiker & RFID", count: isPetugas ? pendingVehicles : undefined },
    { id: "pekerja", label: "Kartu Pekerja", short: "Pekerja", icon: IdCard, description: "ART, sopir, tukang" },
    { id: "ronda", label: isPetugas ? "Ronda & Patroli" : "Jadwal Ronda", short: "Ronda", icon: CalendarDays, description: "Jadwal, absensi, denda" },
    { id: "laporan", label: "Lapor Kejadian", short: "Lapor", icon: Megaphone, description: "Hal mencurigakan", count: isPetugas ? openIncidents : undefined },
    { id: "waspada", label: "Daftar Waspada", short: "Waspada", icon: Eye, description: "Orang & kendaraan", count: dangerWatch || undefined, urgent: dangerWatch > 0 },
    { id: "hilang", label: "Hilang & Ditemukan", short: "Hilang", icon: Search, description: "Anak, hewan, barang", count: urgentLost || undefined, urgent: urgentLost > 0 },
    { id: "titip", label: isPetugas ? "Titip & Rumah Kosong" : "Titip Rumah", short: "Titip", icon: Home, description: "Rumah ditinggal", count: isPetugas ? activeWatches || undefined : undefined },
    { id: "cctv", label: "CCTV", short: "CCTV", icon: Video, description: "Pantau kamera" },
    { id: "bencana", label: "Posko Bencana", short: "Bencana", icon: Tent, description: "Siaga & evakuasi", count: helpNeeded || undefined, urgent: helpNeeded > 0 || state.settings.disasterActive },
    { id: "serahterima", label: "Serah Terima Shift", short: "Shift", icon: Handshake, description: "Handover satpam", count: pendingHandover || undefined, petugasOnly: true },
  ];
  return tabs.filter((t) => isPetugas || !t.petugasOnly);
}

export default function KeamananPage() {
  return (
    <Suspense fallback={null}>
      <KeamananContent />
    </Suspense>
  );
}

function KeamananContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<SessionTenant | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isModuleSheetOpen, setIsModuleSheetOpen] = useState(false);
  const [mode, setMode] = useState<ViewMode>("warga");

  useEffect(() => {
    const s = getClientSession();
    setSession(s);
    setMode(PETUGAS_ROLES.includes(s?.role ?? "TENANT_ADMIN") ? "petugas" : "warga");
    setSessionLoaded(true);
  }, []);

  const role = session?.role ?? "TENANT_ADMIN";
  const canUsePetugasMode = PETUGAS_ROLES.includes(role);
  const isPetugas = canUsePetugasMode && mode === "petugas";
  const communityId = session?.communityId || DEFAULT_COMMUNITY_ID;

  const user: SecurityUser = useMemo(
    () => ({ name: session?.fullName || "Pak Bambang", houseBlock: session?.houseBlock || "A-01", phone: "081234567890" }),
    [session?.fullName, session?.houseBlock]
  );

  if (!sessionLoaded) return <LoadingScreen />;

  return (
    <KeamananShell
      key={communityId}
      communityId={communityId}
      session={session}
      user={user}
      isPetugas={isPetugas}
      canUsePetugasMode={canUsePetugasMode}
      mode={mode}
      setMode={setMode}
      tabParam={searchParams.get("tab")}
      setTab={(tab) => router.replace(`/keamanan?tab=${tab}`, { scroll: false })}
      isMobileDrawerOpen={isMobileDrawerOpen}
      setIsMobileDrawerOpen={setIsMobileDrawerOpen}
      isModuleSheetOpen={isModuleSheetOpen}
      setIsModuleSheetOpen={setIsModuleSheetOpen}
    />
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#FBFBF9] dark:bg-[#0B130E] flex items-center justify-center text-sm font-bold text-emerald-600 animate-pulse">
      Memuat Pusat Keamanan...
    </div>
  );
}

function KeamananShell({
  communityId,
  session,
  user,
  isPetugas,
  canUsePetugasMode,
  mode,
  setMode,
  tabParam,
  setTab,
  isMobileDrawerOpen,
  setIsMobileDrawerOpen,
  isModuleSheetOpen,
  setIsModuleSheetOpen,
}: {
  communityId: string;
  session: SessionTenant | null;
  user: SecurityUser;
  isPetugas: boolean;
  canUsePetugasMode: boolean;
  mode: ViewMode;
  setMode: (m: ViewMode) => void;
  tabParam: string | null;
  setTab: (t: TabId) => void;
  isMobileDrawerOpen: boolean;
  setIsMobileDrawerOpen: (v: boolean) => void;
  isModuleSheetOpen: boolean;
  setIsModuleSheetOpen: (v: boolean) => void;
}) {
  const store = useKeamananState(communityId, { name: user.name, houseBlock: user.houseBlock });
  const { state, update, mode: dataMode, syncError, loadSampleData, issueFine } = store;
  const [seeding, setSeeding] = useState(false);

  if (!state) return <LoadingScreen />;

  const tabs = buildTabs(state, isPetugas, user.houseBlock);
  const activeTab: TabId = tabs.some((t) => t.id === tabParam) ? (tabParam as TabId) : "darurat";
  const current = tabs.find((t) => t.id === activeTab)!;
  const mobilePrimary = tabs.filter((t) => MOBILE_PRIMARY.includes(t.id));
  const hiddenUrgent = tabs.some((t) => !MOBILE_PRIMARY.includes(t.id) && t.urgent);
  const isEmpty = state.shifts.length === 0 && state.checkpoints.length === 0 && state.cctvs.length === 0;

  const goTo = (t: TabId) => {
    setTab(t);
    setIsModuleSheetOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSeed = async () => {
    setSeeding(true);
    await loadSampleData();
    setSeeding(false);
  };

  return (
    <div className="min-h-screen bg-[#FBFBF9] dark:bg-[#0B130E] text-slate-900 dark:text-slate-100 pb-28 md:pb-12 font-sans overflow-x-hidden">
      <header className="sticky top-0 z-40 bg-[#FBFBF9]/90 dark:bg-[#0B130E]/90 backdrop-blur-xl border-b border-neutral-200/80 dark:border-neutral-800/80 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0"
              aria-label="Buka menu utama"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-emerald-600/30">W</div>
              <span className="font-extrabold text-base tracking-tight hidden sm:inline">
                Warga<span className="text-emerald-600">In</span>
              </span>
            </Link>
            <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700 mx-1 hidden sm:block" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium min-w-0">
              <Building className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate max-w-[130px] sm:max-w-xs">{session?.communityName || "RT 04 / RW 09 Kemang Utama"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <DataModeChip mode={dataMode} syncError={syncError} />
            <NotificationBell userId={session?.userId} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 md:py-6">
        <div className="flex flex-col md:flex-row lg:gap-6 items-start">
          <AppSidebar session={session} isMobileDrawerOpen={isMobileDrawerOpen} onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)} />

          <section className="flex-1 w-full space-y-3 sm:space-y-4 min-w-0">
            <div className="bg-gradient-to-br from-emerald-950 via-teal-900/40 to-slate-900 border border-emerald-500/30 rounded-3xl p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="space-y-1 relative z-10 min-w-0">
                <div className="inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                  <ShieldAlert className="w-3.5 h-3.5" /> {isPetugas ? "Mode Petugas / Pengurus" : "Mode Warga"}
                </div>
                <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  <current.icon className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400 shrink-0" />
                  <span className="truncate">{current.label}</span>
                </h1>
                <p className="text-[11px] sm:text-sm text-slate-300">Pusat Keamanan Lingkungan · {current.description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 relative z-10">
                {canUsePetugasMode && (
                  <div className="flex rounded-xl bg-black/30 border border-white/10 p-1">
                    {([
                      ["petugas", "Petugas", UserCog],
                      ["warga", "Warga", User],
                    ] as const).map(([m, label, Icon]) => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`min-h-[34px] px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                          mode === m ? "bg-emerald-600 text-white" : "text-slate-300 hover:text-white"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" /> {label}
                      </button>
                    ))}
                  </div>
                )}
                {dataMode === "demo" && (
                  <button onClick={handleSeed} className="min-h-[34px] px-3 rounded-xl border border-white/15 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" /> Reset demo
                  </button>
                )}
                {dataMode === "supabase" && isPetugas && isEmpty && (
                  <button disabled={seeding} onClick={handleSeed} className="min-h-[34px] px-3 rounded-xl bg-white text-emerald-800 text-xs font-bold flex items-center gap-1.5 disabled:opacity-60">
                    <Database className="w-3.5 h-3.5" /> {seeding ? "Mengisi..." : "Isi data contoh"}
                  </button>
                )}
              </div>
            </div>

            {activeTab !== "bencana" && <DisasterBanner state={state} onOpen={() => goTo("bencana")} />}

            {/* Tablet & desktop: all modules as scrollable pills */}
            <nav className="hidden md:flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" aria-label="Modul keamanan">
              {tabs.map((t) => (
                <TabPill key={t.id} tab={t} active={t.id === activeTab} onClick={() => goTo(t.id)} />
              ))}
            </nav>

            <motion.div key={`${activeTab}-${mode}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              {activeTab === "darurat" &&
                (isPetugas ? (
                  <CommandCenterPanel state={state} update={update} officerName={user.name} />
                ) : (
                  <PanicPanel state={state} update={update} user={user} />
                ))}
              {activeTab === "peta" && <PetaPanel state={state} isPetugas={isPetugas} />}
              {activeTab === "gerbang" && <GatePanel state={state} update={update} user={user} isPetugas={isPetugas} />}
              {activeTab === "kendaraan" && <KendaraanPanel state={state} update={update} user={user} isPetugas={isPetugas} />}
              {activeTab === "pekerja" && <PekerjaPanel state={state} update={update} user={user} isPetugas={isPetugas} />}
              {activeTab === "ronda" && <RondaPanel state={state} update={update} user={user} isPetugas={isPetugas} issueFine={issueFine} />}
              {activeTab === "laporan" && <LaporanPanel state={state} update={update} user={user} isPetugas={isPetugas} />}
              {activeTab === "waspada" && <WaspadaPanel state={state} update={update} user={user} isPetugas={isPetugas} />}
              {activeTab === "hilang" && <HilangPanel state={state} update={update} user={user} isPetugas={isPetugas} />}
              {activeTab === "titip" && <TitipRumahPanel state={state} update={update} user={user} isPetugas={isPetugas} />}
              {activeTab === "cctv" && <CctvPanel state={state} update={update} user={user} isPetugas={isPetugas} />}
              {activeTab === "bencana" && <BencanaPanel state={state} update={update} user={user} isPetugas={isPetugas} />}
              {activeTab === "serahterima" && isPetugas && <SerahTerimaPanel state={state} update={update} officerName={user.name} />}
            </motion.div>
          </section>
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#0F1A13]/95 backdrop-blur-xl border-t border-neutral-200 dark:border-neutral-800 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        aria-label="Navigasi keamanan"
      >
        <div className="grid grid-cols-5 gap-1">
          {mobilePrimary.map((t) => (
            <BottomNavItem key={t.id} tab={t} active={t.id === activeTab} onClick={() => goTo(t.id)} />
          ))}
          <button
            onClick={() => setIsModuleSheetOpen(true)}
            className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[52px] rounded-xl text-[10px] font-bold ${
              !MOBILE_PRIMARY.includes(activeTab) ? "text-emerald-600" : "text-slate-500"
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
            Modul
            {hiddenUrgent && <span className="absolute top-1.5 right-[calc(50%-14px)] w-2.5 h-2.5 rounded-full bg-red-600 ring-2 ring-white dark:ring-[#0F1A13]" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isModuleSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModuleSheetOpen(false)}
              className="md:hidden fixed inset-0 z-50 bg-black/50"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="md:hidden fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white dark:bg-[#0F1A13] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] max-h-[80vh] overflow-y-auto"
              role="dialog"
              aria-label="Semua modul keamanan"
            >
              <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700 mx-auto mb-3" />
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-extrabold">Semua Modul Keamanan</p>
                <button onClick={() => setIsModuleSheetOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500" aria-label="Tutup">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {tabs.map((t) => {
                  const Icon = t.icon;
                  const active = t.id === activeTab;
                  return (
                    <button
                      key={t.id}
                      onClick={() => goTo(t.id)}
                      className={`relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-center transition-colors ${
                        active ? "bg-emerald-600 border-emerald-600 text-white" : "border-neutral-200 dark:border-neutral-800"
                      }`}
                    >
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? "bg-white/20" : t.urgent ? "bg-red-500/10" : "bg-emerald-500/10"}`}>
                        <Icon className={`w-5 h-5 ${active ? "text-white" : t.urgent ? "text-red-600" : "text-emerald-600 dark:text-emerald-400"}`} />
                      </span>
                      <span className="text-[11px] font-bold leading-tight">{t.label}</span>
                      {!!t.count && (
                        <span className={`absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center ${t.urgent ? "bg-red-600 text-white" : "bg-amber-400 text-slate-900"}`}>
                          {t.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabPill({ tab, active, onClick }: { tab: TabDef; active: boolean; onClick: () => void }) {
  const Icon = tab.icon;
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`shrink-0 min-h-[40px] px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
        active ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25" : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      <Icon className="w-4 h-4" /> {tab.label}
      {!!tab.count && (
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${tab.urgent ? "bg-red-600 text-white animate-pulse" : "bg-amber-400 text-slate-950"}`}>
          {tab.count}
        </span>
      )}
    </button>
  );
}

function BottomNavItem({ tab, active, onClick }: { tab: TabDef; active: boolean; onClick: () => void }) {
  const Icon = tab.icon;
  const isPanic = tab.id === "darurat";
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[52px] rounded-xl text-[10px] font-bold transition-colors ${
        active ? (isPanic ? "text-red-600" : "text-emerald-600") : "text-slate-500"
      }`}
    >
      <span className={`flex items-center justify-center rounded-full transition-all ${isPanic ? "w-9 h-9 bg-red-600 text-white shadow-lg shadow-red-600/30 -mt-4 ring-4 ring-white dark:ring-[#0F1A13]" : "w-6 h-6"}`}>
        <Icon className={isPanic ? "w-5 h-5" : "w-5 h-5"} />
      </span>
      {tab.short}
      {!!tab.count && (
        <span className={`absolute top-0.5 right-[calc(50%-20px)] min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center ${tab.urgent ? "bg-red-600 text-white" : "bg-amber-400 text-slate-900"}`}>
          {tab.count}
        </span>
      )}
    </button>
  );
}

function DataModeChip({ mode, syncError }: { mode: string; syncError: string | null }) {
  if (mode === "supabase") {
    return (
      <span
        title={syncError ?? "Tersinkron realtime dengan Supabase"}
        className={`text-[10px] font-bold px-2 py-1 rounded-full border flex items-center gap-1 ${
          syncError ? "bg-red-500/10 text-red-600 border-red-500/30" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${syncError ? "bg-red-600" : "bg-emerald-500 animate-pulse"}`} />
        <span className="hidden sm:inline">{syncError ? "Gagal sinkron" : "Realtime"}</span>
      </span>
    );
  }
  return (
    <span title="Tabel keamanan belum ada di Supabase. Data disimpan di browser ini." className="text-[10px] font-bold px-2 py-1 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/30 flex items-center gap-1">
      <CloudOff className="w-3 h-3" /> <span className="hidden sm:inline">Mode demo</span>
    </span>
  );
}
