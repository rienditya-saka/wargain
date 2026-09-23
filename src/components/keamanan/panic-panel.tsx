"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Phone, MapPin, ShieldCheck, Loader2, XCircle, Siren, BellRing } from "lucide-react";
import { KeamananState, KeamananUpdater, PanicAlert, PanicType, PANIC_TYPE_META } from "@/lib/keamanan/types";
import { COMMUNITY_CENTER, formatTime, timeAgo, uid } from "@/lib/keamanan/store";
import { Panel, Pill, SecurityUser, inputClass } from "./ui";

const SecurityLeafletMap = dynamic(
  () => import("./security-leaflet-map").then((m) => m.SecurityLeafletMap),
  { ssr: false, loading: () => <div className="h-[260px] rounded-2xl bg-neutral-100 dark:bg-neutral-900 animate-pulse" /> }
);

const HOLD_MS = 3000;

const EMERGENCY_CONTACTS = [
  { label: "Pos Satpam", number: "081200001111" },
  { label: "Ketua RT", number: "081200002222" },
  { label: "Polisi", number: "110" },
  { label: "Pemadam Kebakaran", number: "113" },
  { label: "Ambulans", number: "118" },
  { label: "Basarnas / SAR", number: "115" },
];

function getPosition(): Promise<{ lat: number; lng: number; accuracy?: number } | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  });
}

export function PanicPanel({ state, update, user }: { state: KeamananState; update: KeamananUpdater; user: SecurityUser }) {
  const [type, setType] = React.useState<PanicType>("PENCURIAN");
  const [note, setNote] = React.useState("");
  const [progress, setProgress] = React.useState(0);
  const [isSending, setIsSending] = React.useState(false);
  const holdStartRef = React.useRef<number | null>(null);
  const rafRef = React.useRef<number | null>(null);

  const myActiveAlert = state.alerts.find(
    (a) => a.senderName === user.name && (a.status === "BARU" || a.status === "DIRESPON")
  );
  const myHistory = state.alerts.filter((a) => a.senderName === user.name && a.id !== myActiveAlert?.id).slice(0, 5);
  // Memoized: the hold-to-send progress re-renders every frame and must not redraw the map.
  const activeAlerts = React.useMemo(
    () => state.alerts.filter((a) => a.status === "BARU" || a.status === "DIRESPON"),
    [state.alerts]
  );

  const sendPanic = async () => {
    setIsSending(true);
    const pos = await getPosition();
    // Without GPS, fall back to the registered house point so petugas still get a location.
    const point = pos ?? { lat: COMMUNITY_CENTER.lat + (Math.random() - 0.5) * 0.002, lng: COMMUNITY_CENTER.lng + (Math.random() - 0.5) * 0.002 };
    const alert: PanicAlert = {
      id: uid("sos"),
      senderName: user.name,
      houseBlock: user.houseBlock,
      phone: user.phone,
      type,
      note: note.trim() || undefined,
      lat: point.lat,
      lng: point.lng,
      accuracy: pos?.accuracy,
      createdAt: new Date().toISOString(),
      status: "BARU",
    };
    update((s) => ({ ...s, alerts: [alert, ...s.alerts] }));
    setIsSending(false);
    setNote("");
    if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
    toast.error("SINYAL PANIC TERKIRIM ke pos satpam & pengurus RT", {
      description: pos ? `Lokasi GPS akurasi ±${Math.round(pos.accuracy ?? 0)}m` : "GPS tidak tersedia, memakai titik rumah terdaftar",
    });
  };

  const tick = () => {
    if (holdStartRef.current === null) return;
    const elapsed = Date.now() - holdStartRef.current;
    const pct = Math.min(1, elapsed / HOLD_MS);
    setProgress(pct);
    if (pct >= 1) {
      holdStartRef.current = null;
      setProgress(0);
      sendPanic();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const startHold = () => {
    if (isSending || myActiveAlert) return;
    holdStartRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);
  };

  const cancelHold = () => {
    holdStartRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setProgress(0);
  };

  React.useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const cancelAlert = (alert: PanicAlert) => {
    update((s) => ({
      ...s,
      alerts: s.alerts.map((a) =>
        a.id === alert.id ? { ...a, status: "DIBATALKAN", resolvedAt: new Date().toISOString(), resolutionNote: "Dibatalkan oleh pelapor" } : a
      ),
    }));
    toast.success("Sinyal panic dibatalkan.");
  };

  const ringCircumference = 2 * Math.PI * 92;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
      <div className="xl:col-span-3 space-y-4">
        <Panel
          title="Tombol Panic Darurat"
          description="Tahan tombol 3 detik untuk mengirim lokasi GPS Anda ke pos satpam, petugas ronda & pengurus RT."
          icon={Siren}
        >
          {myActiveAlert ? (
            <ActiveAlertCard alert={myActiveAlert} onCancel={() => cancelAlert(myActiveAlert)} />
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.keys(PANIC_TYPE_META) as PanicType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition-all text-left flex items-center gap-2 ${
                      type === t
                        ? "bg-red-600 text-white border-red-600 shadow-md shadow-red-600/25"
                        : "border-neutral-200 dark:border-neutral-800 text-slate-700 dark:text-slate-300 hover:border-red-400"
                    }`}
                  >
                    <span className="text-base">{PANIC_TYPE_META[t].emoji}</span>
                    {PANIC_TYPE_META[t].label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col items-center gap-3 py-2">
                <div className="relative w-52 h-52 select-none">
                  <svg className="absolute inset-0 -rotate-90" viewBox="0 0 200 200" aria-hidden>
                    <circle cx="100" cy="100" r="92" className="stroke-red-500/15" strokeWidth="10" fill="none" />
                    <circle
                      cx="100" cy="100" r="92" className="stroke-red-600" strokeWidth="10" fill="none" strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringCircumference * (1 - progress)}
                    />
                  </svg>
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onPointerDown={startHold}
                    onPointerUp={cancelHold}
                    onPointerLeave={cancelHold}
                    onPointerCancel={cancelHold}
                    onContextMenu={(e) => e.preventDefault()}
                    disabled={isSending}
                    aria-label="Tahan 3 detik untuk mengirim sinyal panic"
                    className="absolute inset-4 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white shadow-2xl shadow-red-600/40 flex flex-col items-center justify-center gap-1 touch-none"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-10 h-10 animate-spin" />
                        <span className="text-xs font-bold">Mengambil GPS...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-black tracking-wider">PANIC</span>
                        <span className="text-[11px] font-semibold opacity-90">
                          {progress > 0 ? `Tahan... ${Math.ceil((1 - progress) * 3)}` : "Tahan 3 detik"}
                        </span>
                      </>
                    )}
                  </motion.button>
                </div>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Keterangan singkat (opsional), mis. 'ada orang masuk lewat belakang'"
                  className={`${inputClass} max-w-md text-center`}
                />
                <p className="text-[10px] text-slate-500 text-center max-w-sm">
                  Jenis: <b>{PANIC_TYPE_META[type].label}</b> · Dikirim sebagai {user.name} ({user.houseBlock}). Penyalahgunaan tombol panic dapat dikenakan sanksi sesuai aturan RT.
                </p>
              </div>
            </div>
          )}
        </Panel>

        {myHistory.length > 0 && (
          <Panel title="Riwayat Panic Saya" icon={BellRing}>
            <ul className="space-y-2">
              {myHistory.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 text-xs p-2.5 rounded-xl bg-neutral-50 dark:bg-[#0B130E]">
                  <span className="font-semibold">{PANIC_TYPE_META[a.type].emoji} {PANIC_TYPE_META[a.type].label}</span>
                  <span className="text-slate-500">{timeAgo(a.createdAt)}</span>
                  <Pill tone={a.status === "SELESAI" ? "emerald" : "slate"}>{a.status}</Pill>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      <div className="xl:col-span-2 space-y-4">
        <Panel title="Peta Sinyal Darurat" description="Titik merah = panic yang sedang aktif di lingkungan." icon={MapPin}>
          <SecurityLeafletMap
            alerts={activeAlerts}
            selectedAlertId={myActiveAlert?.id}
            className="h-[260px]"
          />
        </Panel>

        <Panel title="Kontak Darurat" description="Sekali tekan langsung menelepon." icon={Phone}>
          <div className="grid grid-cols-2 gap-2">
            {EMERGENCY_CONTACTS.map((c) => (
              <a
                key={c.label}
                href={`tel:${c.number}`}
                className="min-h-[44px] p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-colors"
              >
                <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-100">{c.label}</span>
                <span className="block text-[11px] font-mono text-emerald-600 dark:text-emerald-400">{c.number}</span>
              </a>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ActiveAlertCard({ alert, onCancel }: { alert: PanicAlert; onCancel: () => void }) {
  const meta = PANIC_TYPE_META[alert.type];
  const responded = alert.status === "DIRESPON";
  return (
    <div className={`rounded-2xl p-5 border-2 ${responded ? "border-amber-500 bg-amber-500/10" : "border-red-600 bg-red-600/10 animate-pulse"}`}>
      <div className="flex items-center gap-3">
        <div className="text-4xl">{meta.emoji}</div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-base text-red-600 dark:text-red-400">{meta.label}</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Terkirim {formatTime(alert.createdAt)} · {alert.lat.toFixed(5)}, {alert.lng.toFixed(5)}</p>
        </div>
      </div>
      <div className="mt-4 p-3 rounded-xl bg-white/70 dark:bg-black/30 text-xs font-semibold flex items-center gap-2">
        {responded ? (
          <>
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span><b>{alert.responder}</b> sedang menuju lokasi Anda (merespon {formatTime(alert.respondedAt)}). Tetap tenang & cari tempat aman.</span>
          </>
        ) : (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-red-600 shrink-0" />
            <span>Menunggu petugas merespon... Alarm sedang berbunyi di pos satpam & HP pengurus.</span>
          </>
        )}
      </div>
      <button
        onClick={onCancel}
        className="mt-3 w-full min-h-[44px] rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-black/30 flex items-center justify-center gap-2"
      >
        <XCircle className="w-4 h-4" /> Batalkan (tidak jadi / salah tekan)
      </button>
    </div>
  );
}
