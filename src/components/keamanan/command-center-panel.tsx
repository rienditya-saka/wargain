"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Radar, Navigation, Phone, CheckCircle2, Volume2, VolumeX, Zap, Clock } from "lucide-react";
import { KeamananState, KeamananUpdater, PanicAlert, PanicStatus, PANIC_TYPE_META } from "@/lib/keamanan/types";
import { COMMUNITY_CENTER, SECURITY_POSTS, distanceMeters, formatDateTime, formatTime, timeAgo, uid } from "@/lib/keamanan/store";
import { Empty, Panel, Pill, PillTone, inputClass } from "./ui";
import { CctvView, nearestCameras } from "./cctv-panel";
import { cctvMarkers, watchlistMarkers } from "./map-layers";

const SecurityLeafletMap = dynamic(
  () => import("./security-leaflet-map").then((m) => m.SecurityLeafletMap),
  { ssr: false, loading: () => <div className="h-[460px] rounded-2xl bg-neutral-100 dark:bg-neutral-900 animate-pulse" /> }
);

const STATUS_TONE: Record<PanicStatus, PillTone> = {
  BARU: "red",
  DIRESPON: "amber",
  SELESAI: "emerald",
  DIBATALKAN: "slate",
};

function playSiren() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    gain.gain.value = 0.08;
    osc.connect(gain).connect(ctx.destination);
    const t = ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      osc.frequency.setValueAtTime(880, t + i * 0.5);
      osc.frequency.linearRampToValueAtTime(1320, t + i * 0.5 + 0.25);
      osc.frequency.linearRampToValueAtTime(880, t + i * 0.5 + 0.5);
    }
    osc.start(t);
    osc.stop(t + 2);
    osc.onended = () => ctx.close();
  } catch {
    // audio blocked until user interacts with the page
  }
}

export function CommandCenterPanel({
  state,
  update,
  officerName,
}: {
  state: KeamananState;
  update: KeamananUpdater;
  officerName: string;
}) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<"AKTIF" | "SEMUA">("AKTIF");
  const [soundOn, setSoundOn] = React.useState(true);
  const [resolutionNote, setResolutionNote] = React.useState("");
  const seenIdsRef = React.useRef<Set<string> | null>(null);

  // A panic arriving (same tab or another tab via storage event) auto-focuses the map on it.
  React.useEffect(() => {
    const ids = new Set(state.alerts.map((a) => a.id));
    if (seenIdsRef.current === null) {
      seenIdsRef.current = ids;
      const firstActive = state.alerts.find((a) => a.status === "BARU" || a.status === "DIRESPON");
      if (firstActive) setSelectedId(firstActive.id);
      return;
    }
    const incoming = state.alerts.filter((a) => a.status === "BARU" && !seenIdsRef.current!.has(a.id));
    seenIdsRef.current = ids;
    if (incoming.length === 0) return;
    const newest = incoming[0];
    setSelectedId(newest.id);
    setFilter("AKTIF");
    if (soundOn) playSiren();
    toast.error(`PANIC: ${PANIC_TYPE_META[newest.type].label}`, {
      description: `${newest.senderName} · ${newest.houseBlock} — peta diarahkan ke titik lokasi`,
      duration: 10000,
    });
  }, [state.alerts, soundOn]);

  const activeAlerts = React.useMemo(
    () => state.alerts.filter((a) => a.status === "BARU" || a.status === "DIRESPON"),
    [state.alerts]
  );
  const listed = filter === "AKTIF" ? activeAlerts : state.alerts;
  // Stable references keep the map from redrawing (and closing popups) on unrelated re-renders.
  const contextMarkers = React.useMemo(
    () => [...cctvMarkers(state), ...watchlistMarkers(state)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.cctvs, state.watchlist]
  );
  const selected = state.alerts.find((a) => a.id === selectedId) ?? null;

  const setStatus = (alert: PanicAlert, status: PanicStatus) => {
    const now = new Date().toISOString();
    update((s) => ({
      ...s,
      alerts: s.alerts.map((a) => {
        if (a.id !== alert.id) return a;
        if (status === "DIRESPON") return { ...a, status, responder: officerName, respondedAt: now };
        return { ...a, status, resolvedAt: now, resolutionNote: resolutionNote.trim() || undefined };
      }),
    }));
    setResolutionNote("");
    toast.success(status === "DIRESPON" ? "Anda tercatat merespon. Warga mendapat notifikasi." : "Kejadian ditutup.");
  };

  const simulatePanic = () => {
    const types = Object.keys(PANIC_TYPE_META) as PanicAlert["type"][];
    const alert: PanicAlert = {
      id: uid("sos"),
      senderName: "Ibu Dewi (Simulasi)",
      houseBlock: `E-${String(Math.ceil(Math.random() * 12)).padStart(2, "0")}`,
      phone: "081377778888",
      type: types[Math.floor(Math.random() * types.length)],
      note: "Simulasi uji coba sistem",
      lat: COMMUNITY_CENTER.lat + (Math.random() - 0.5) * 0.003,
      lng: COMMUNITY_CENTER.lng + (Math.random() - 0.5) * 0.003,
      accuracy: 8 + Math.random() * 15,
      createdAt: new Date().toISOString(),
      status: "BARU",
    };
    update((s) => ({ ...s, alerts: [alert, ...s.alerts] }));
  };

  const nearestPost = selected
    ? SECURITY_POSTS.map((p) => ({ ...p, dist: distanceMeters(p, selected) })).sort((a, b) => a.dist - b.dist)[0]
    : null;

  const resolvedWithResponse = state.alerts.filter((a) => a.respondedAt);
  const avgResponseMin = resolvedWithResponse.length
    ? resolvedWithResponse.reduce((sum, a) => sum + (new Date(a.respondedAt!).getTime() - new Date(a.createdAt).getTime()), 0) /
      resolvedWithResponse.length / 60_000
    : 0;

  return (
    <div className="space-y-4">
      {activeAlerts.some((a) => a.status === "BARU") && (
        <div className="rounded-2xl bg-red-600 text-white p-3.5 flex items-center justify-between gap-3 shadow-lg shadow-red-600/30 animate-pulse">
          <span className="text-xs sm:text-sm font-black">
            🚨 {activeAlerts.filter((a) => a.status === "BARU").length} SINYAL PANIC BELUM DIRESPON
          </span>
          <button
            onClick={() => setSelectedId(activeAlerts.find((a) => a.status === "BARU")!.id)}
            className="text-[11px] font-bold bg-white text-red-700 px-3 py-1.5 rounded-lg shrink-0"
          >
            Lihat di peta
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-3">
          <Panel
            title="Peta Command Center"
            description="Klik sinyal di daftar, peta otomatis terbang ke titik GPS saat tombol dipencet."
            icon={Radar}
            action={
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSoundOn((v) => !v)}
                  className="w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-center"
                  aria-label={soundOn ? "Matikan sirine" : "Nyalakan sirine"}
                >
                  {soundOn ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                </button>
                <button
                  onClick={simulatePanic}
                  className="h-9 px-3 rounded-xl border border-dashed border-red-400 text-red-600 text-[11px] font-bold flex items-center gap-1"
                >
                  <Zap className="w-3.5 h-3.5" /> Simulasi
                </button>
              </div>
            }
          >
            <SecurityLeafletMap
              alerts={listed}
              checkpoints={state.checkpoints}
              extraMarkers={contextMarkers}
              selectedAlertId={selectedId}
              onSelectAlert={(a) => setSelectedId(a.id)}
              className="h-[380px] sm:h-[460px]"
            />
          </Panel>

          <div className="grid grid-cols-3 gap-2">
            <Stat label="Panic aktif" value={activeAlerts.length} tone="text-red-600" />
            <Stat label="Total bulan ini" value={state.alerts.length} tone="text-slate-900 dark:text-slate-100" />
            <Stat label="Rata-rata respon" value={avgResponseMin ? `${avgResponseMin.toFixed(1)} mnt` : "-"} tone="text-emerald-600" />
          </div>
        </div>

        <div className="space-y-3">
          {selected && (
            <Panel title="Detail Sinyal" className="border-red-500/40">
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black text-red-600 dark:text-red-400 text-sm">
                    {PANIC_TYPE_META[selected.type].emoji} {PANIC_TYPE_META[selected.type].label}
                  </span>
                  <Pill tone={STATUS_TONE[selected.status]}>{selected.status}</Pill>
                </div>
                <p className="font-bold">{selected.senderName} · Rumah {selected.houseBlock}</p>
                {selected.note && <p className="italic text-slate-600 dark:text-slate-300">"{selected.note}"</p>}
                <p className="text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {formatDateTime(selected.createdAt)} ({timeAgo(selected.createdAt)})
                </p>
                <p className="font-mono text-[11px] text-slate-500">
                  {selected.lat.toFixed(6)}, {selected.lng.toFixed(6)}
                  {selected.accuracy ? ` · ±${Math.round(selected.accuracy)}m` : ""}
                </p>
                {nearestPost && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Terdekat: <b>{nearestPost.name}</b> (~{Math.round(nearestPost.dist)} m)
                  </p>
                )}
                {(() => {
                  const cams = nearestCameras(state, selected, 250).slice(0, 2);
                  if (!cams.length) return null;
                  return (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] font-bold uppercase text-slate-500">CCTV terdekat</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {cams.map(({ camera, dist }) => (
                          <div key={camera.id} className="space-y-0.5">
                            <CctvView camera={camera} className="aspect-video rounded-lg" />
                            <p className="text-[9px] text-slate-500 truncate">{camera.name} · {Math.round(dist)} m</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                {selected.responder && (
                  <p className="text-[11px]">Direspon <b>{selected.responder}</b> pukul {formatTime(selected.respondedAt)}</p>
                )}
                {selected.resolutionNote && <p className="text-[11px] text-emerald-700 dark:text-emerald-400">Catatan: {selected.resolutionNote}</p>}

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[40px] rounded-xl bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center gap-1.5"
                  >
                    <Navigation className="w-3.5 h-3.5" /> Navigasi
                  </a>
                  <a
                    href={`tel:${selected.phone}`}
                    className="min-h-[40px] rounded-xl border border-neutral-200 dark:border-neutral-700 font-bold text-[11px] flex items-center justify-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" /> Telepon
                  </a>
                </div>

                {selected.status === "BARU" && (
                  <button
                    onClick={() => setStatus(selected, "DIRESPON")}
                    className="w-full min-h-[44px] rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs"
                  >
                    SAYA MENUJU LOKASI
                  </button>
                )}
                {(selected.status === "BARU" || selected.status === "DIRESPON") && (
                  <div className="space-y-2">
                    <input
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      placeholder="Catatan penanganan (opsional)"
                      className={inputClass}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setStatus(selected, "SELESAI")}
                        className="min-h-[40px] rounded-xl bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
                      </button>
                      <button
                        onClick={() => setStatus(selected, "DIBATALKAN")}
                        className="min-h-[40px] rounded-xl border border-neutral-200 dark:border-neutral-700 font-bold text-[11px]"
                      >
                        Alarm palsu
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          )}

          <Panel
            title="Daftar Sinyal Panic"
            action={
              <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-800 text-[10px] font-bold overflow-hidden">
                {(["AKTIF", "SEMUA"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 ${filter === f ? "bg-emerald-600 text-white" : "text-slate-500"}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            }
          >
            {listed.length === 0 ? (
              <Empty>Tidak ada sinyal panic aktif. Lingkungan aman 🛡️</Empty>
            ) : (
              <ul className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {listed.map((a) => (
                  <li key={a.id}>
                    <button
                      onClick={() => setSelectedId(a.id)}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                        a.id === selectedId
                          ? "border-red-500 bg-red-500/5"
                          : "border-neutral-200 dark:border-neutral-800 hover:border-red-400/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold truncate">
                          {PANIC_TYPE_META[a.type].emoji} {a.senderName}
                        </span>
                        <Pill tone={STATUS_TONE[a.status]}>{a.status}</Pill>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {a.houseBlock} · {PANIC_TYPE_META[a.type].label} · {timeAgo(a.createdAt)}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] p-3">
      <p className="text-[10px] font-semibold text-slate-500">{label}</p>
      <p className={`text-lg font-black ${tone}`}>{value}</p>
    </div>
  );
}
