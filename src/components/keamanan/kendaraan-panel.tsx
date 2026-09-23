"use client";

import * as React from "react";
import { toast } from "sonner";
import { Camera, Car, Loader2, Radio, ScanLine, ShieldCheck, Plus, Ban, Check } from "lucide-react";
import {
  KeamananState,
  KeamananUpdater,
  ResidentVehicle,
  VEHICLE_RESULT_META,
  VehicleAccessLog,
  VehicleAccessResult,
  VehicleType,
} from "@/lib/keamanan/types";
import { fileToResizedDataUrl, formatDateTime, formatTime, toDateKey, uid } from "@/lib/keamanan/store";
import { normalizePlate, plateKey } from "@/lib/keamanan/plate";
import { findWatchlistByPlate } from "./waspada-panel";
import { isWorkerAllowedNow } from "./pekerja-panel";
import { Empty, Field, Panel, Pill, Segmented, SecurityUser, StatCard, ghostBtn, inputClass, primaryBtn } from "./ui";

interface AccessDecision {
  result: VehicleAccessResult;
  label?: string;
  gateOpened: boolean;
  reason: string;
}

function playAlarm() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    gain.gain.value = 0.06;
    osc.connect(gain).connect(ctx.destination);
    for (let i = 0; i < 6; i++) osc.frequency.setValueAtTime(i % 2 ? 660 : 990, ctx.currentTime + i * 0.2);
    osc.start();
    osc.stop(ctx.currentTime + 1.2);
    osc.onended = () => ctx.close();
  } catch {
    // audio blocked
  }
}

export function decideVehicleAccess(state: KeamananState, plate: string, rfidTag?: string): AccessDecision {
  const key = plateKey(plate);
  const watch = findWatchlistByPlate(state, plate);
  if (watch) {
    return { result: "WASPADA", label: watch.label, gateOpened: false, reason: `${watch.level}: ${watch.description}` };
  }
  const vehicle = state.vehicles.find(
    (v) => v.status === "AKTIF" && ((rfidTag && v.rfidTag === rfidTag) || plateKey(v.plate) === key)
  );
  if (vehicle) {
    return { result: "WARGA", label: `${vehicle.ownerName} (${vehicle.houseBlock})`, gateOpened: true, reason: `${vehicle.brandColor} · stiker ${vehicle.stickerCode ?? "-"}` };
  }
  const today = toDateKey(new Date());
  const invite = state.invites.find((i) => !i.used && i.visitDate === today && plateKey(i.plate) === key);
  if (invite) {
    return { result: "TAMU_UNDANGAN", label: `${invite.guestName} → ${invite.hostBlock}`, gateOpened: true, reason: `Undangan ${invite.hostName}, kode ${invite.code}` };
  }
  const worker = state.workers.find((w) => w.status === "AKTIF" && plateKey(w.plate) === key);
  if (worker) {
    const allowed = isWorkerAllowedNow(worker);
    return {
      result: "PEKERJA",
      label: `${worker.name} → ${worker.houseBlock}`,
      gateOpened: allowed.ok,
      reason: allowed.ok ? `Kartu pekerja ${worker.code}` : allowed.reason,
    };
  }
  return { result: "TIDAK_DIKENAL", gateOpened: false, reason: "Tidak terdaftar. Tanya tujuan & catat di buku tamu." };
}

export function KendaraanPanel({
  state,
  update,
  user,
  isPetugas,
}: {
  state: KeamananState;
  update: KeamananUpdater;
  user: SecurityUser;
  isPetugas: boolean;
}) {
  return isPetugas ? <KendaraanPetugas state={state} update={update} officer={user.name} /> : <KendaraanWarga state={state} update={update} user={user} />;
}

function KendaraanPetugas({ state, update, officer }: { state: KeamananState; update: KeamananUpdater; officer: string }) {
  const [plate, setPlate] = React.useState("");
  const [direction, setDirection] = React.useState<"MASUK" | "KELUAR">("MASUK");
  const [scanning, setScanning] = React.useState(false);
  const [lastDecision, setLastDecision] = React.useState<(AccessDecision & { plate: string; method: VehicleAccessLog["method"] }) | null>(null);
  const [candidates, setCandidates] = React.useState<string[]>([]);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [vehicleTab, setVehicleTab] = React.useState<"MENUNGGU" | "AKTIF">("MENUNGGU");
  const fileRef = React.useRef<HTMLInputElement>(null);

  const checkPlate = (rawPlate: string, method: VehicleAccessLog["method"], confidence?: number, rfidTag?: string) => {
    const normalized = normalizePlate(rawPlate);
    if (!plateKey(normalized)) {
      toast.error("Plat tidak valid.");
      return;
    }
    const decision = decideVehicleAccess(state, normalized, rfidTag);
    const log: VehicleAccessLog = {
      id: uid("vlog"),
      plate: normalized,
      direction,
      method,
      result: decision.result,
      matchedLabel: decision.label,
      gateOpened: direction === "KELUAR" ? decision.result !== "WASPADA" : decision.gateOpened,
      confidence,
      officer,
      createdAt: new Date().toISOString(),
    };
    update((s) => ({
      ...s,
      vehicleLogs: [log, ...s.vehicleLogs],
      // A watchlisted plate passing the gate is a fresh sighting.
      watchlist:
        decision.result === "WASPADA"
          ? s.watchlist.map((w) =>
              plateKey(w.plate) === plateKey(normalized) ? { ...w, lastSeenAt: log.createdAt, lastSeenLocation: "Gerbang utama (ANPR)" } : w
            )
          : s.watchlist,
    }));
    setLastDecision({ ...decision, gateOpened: log.gateOpened, plate: normalized, method });
    if (decision.result === "WASPADA") {
      playAlarm();
      toast.error(`⚠️ PLAT ${normalized} ADA DI DAFTAR WASPADA`, { description: decision.reason, duration: 12000 });
    } else if (log.gateOpened) {
      toast.success(`Palang terbuka: ${decision.label}`);
    }
  };

  const scanPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setScanning(true);
    setCandidates([]);
    try {
      const image = await fileToResizedDataUrl(file, 1280, 0.85);
      setPreview(image);
      const res = await fetch("/api/keamanan/anpr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "OCR gagal membaca plat.");
        return;
      }
      if (!data.plate) {
        toast.warning("Plat tidak terbaca. Ketik manual.");
        return;
      }
      setPlate(data.plate);
      setCandidates(data.candidates ?? []);
      checkPlate(data.plate, "ANPR", data.confidence ?? undefined);
    } catch {
      toast.error("Gagal memproses foto.");
    } finally {
      setScanning(false);
    }
  };

  const simulateRfid = () => {
    const tagged = state.vehicles.filter((v) => v.status === "AKTIF" && v.rfidTag);
    if (!tagged.length) {
      toast.error("Belum ada kendaraan dengan tag RFID.");
      return;
    }
    const v = tagged[Math.floor(Math.random() * tagged.length)];
    setPlate(v.plate);
    checkPlate(v.plate, "RFID", 1, v.rfidTag);
  };

  const verifyVehicle = (v: ResidentVehicle) => {
    const next = state.vehicles.filter((x) => x.stickerCode).length + 1;
    update((s) => ({
      ...s,
      vehicles: s.vehicles.map((x) =>
        x.id === v.id ? { ...x, status: "AKTIF", stickerCode: x.stickerCode ?? `STK-${String(next).padStart(4, "0")}` } : x
      ),
    }));
    toast.success(`Kendaraan ${v.plate} aktif. Stiker diterbitkan.`);
  };

  const setVehicleStatus = (v: ResidentVehicle, status: ResidentVehicle["status"]) =>
    update((s) => ({ ...s, vehicles: s.vehicles.map((x) => (x.id === v.id ? { ...x, status } : x)) }));

  const assignRfid = (v: ResidentVehicle) => {
    const tag = window.prompt(`Tag RFID untuk ${v.plate}`, v.rfidTag ?? "RFID-");
    if (!tag) return;
    update((s) => ({ ...s, vehicles: s.vehicles.map((x) => (x.id === v.id ? { ...x, rfidTag: tag.trim().toUpperCase() } : x)) }));
  };

  const today = toDateKey(new Date());
  const todayLogs = state.vehicleLogs.filter((l) => toDateKey(new Date(l.createdAt)) === today);
  const pendingVehicles = state.vehicles.filter((v) => v.status === "MENUNGGU_VERIFIKASI");
  const listedVehicles = vehicleTab === "MENUNGGU" ? pendingVehicles : state.vehicles.filter((v) => v.status !== "MENUNGGU_VERIFIKASI");
  const decisionMeta = lastDecision ? VEHICLE_RESULT_META[lastDecision.result] : null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
      <div className="xl:col-span-2 space-y-4">
        <Panel title="Pemindai Gerbang" description="Foto plat → OCR (PaddleOCR) → cek otomatis." icon={ScanLine}>
          <Segmented value={direction} onChange={setDirection} options={[{ value: "MASUK", label: "⬇️ Masuk" }, { value: "KELUAR", label: "⬆️ Keluar" }]} />

          <button
            onClick={() => fileRef.current?.click()}
            disabled={scanning}
            className="w-full aspect-[16/9] rounded-2xl border-2 border-dashed border-emerald-500/50 bg-emerald-500/5 flex flex-col items-center justify-center gap-2 overflow-hidden relative"
          >
            {preview && <img src={preview} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />}
            <span className="relative flex flex-col items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              {scanning ? <Loader2 className="w-8 h-8 animate-spin" /> : <Camera className="w-8 h-8" />}
              <span className="text-xs font-black">{scanning ? "Membaca plat..." : "Foto Plat Nomor (ANPR)"}</span>
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={scanPhoto} className="hidden" />

          <div className="flex gap-2">
            <input
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && checkPlate(plate, "MANUAL")}
              placeholder="B 1234 ABC"
              className={`${inputClass} font-mono uppercase tracking-widest text-sm`}
            />
            <button onClick={() => checkPlate(plate, "MANUAL")} className={`${primaryBtn} shrink-0`}>Cek</button>
          </div>
          {candidates.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] text-slate-500">Kandidat lain:</span>
              {candidates.slice(1, 4).map((c) => (
                <button key={c} onClick={() => { setPlate(c); checkPlate(c, "ANPR"); }} className="px-2 py-0.5 rounded-lg border text-[10px] font-mono">
                  {c}
                </button>
              ))}
            </div>
          )}
          <button onClick={simulateRfid} className={`${ghostBtn} w-full flex items-center justify-center gap-1.5`}>
            <Radio className="w-3.5 h-3.5" /> Simulasi tap RFID / stiker
          </button>

          {lastDecision && decisionMeta && (
            <div
              className={`rounded-2xl p-4 text-white space-y-1 ${
                lastDecision.result === "WASPADA"
                  ? "bg-red-600 animate-pulse"
                  : lastDecision.gateOpened
                  ? "bg-emerald-600"
                  : "bg-amber-500"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-xl font-black tracking-widest">{lastDecision.plate}</p>
                <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded-full">{lastDecision.method}</span>
              </div>
              <p className="text-sm font-extrabold">{decisionMeta.label}{lastDecision.label ? ` · ${lastDecision.label}` : ""}</p>
              <p className="text-xs opacity-90">{lastDecision.reason}</p>
              <p className="text-xs font-black pt-1">{lastDecision.gateOpened ? "✅ PALANG DIBUKA" : "⛔ PALANG TETAP TERTUTUP"}</p>
            </div>
          )}
        </Panel>
      </div>

      <div className="xl:col-span-3 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatCard label="Akses hari ini" value={todayLogs.length} />
          <StatCard label="Kendaraan warga" value={state.vehicles.filter((v) => v.status === "AKTIF").length} />
          <StatCard label="Menunggu verifikasi" value={pendingVehicles.length} tone={pendingVehicles.length ? "text-amber-600" : undefined} />
          <StatCard label="Alarm waspada" value={todayLogs.filter((l) => l.result === "WASPADA").length} tone="text-red-600" />
        </div>

        <Panel title="Log Akses Kendaraan" icon={Car}>
          {state.vehicleLogs.length === 0 ? (
            <Empty>Belum ada log.</Empty>
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-[360px] overflow-y-auto -mx-1">
              {state.vehicleLogs.slice(0, 50).map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 py-2 px-1 text-xs">
                  <div className="min-w-0">
                    <p className="font-mono font-black">{l.plate} <span className="font-sans font-semibold text-[10px] text-slate-500">{l.direction === "MASUK" ? "⬇️" : "⬆️"} {l.method}</span></p>
                    <p className="text-[10px] text-slate-500 truncate">{l.matchedLabel ?? "-"} · {formatTime(l.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Pill tone={VEHICLE_RESULT_META[l.result].tone}>{VEHICLE_RESULT_META[l.result].label}</Pill>
                    {l.gateOpened ? <Check className="w-4 h-4 text-emerald-600" /> : <Ban className="w-4 h-4 text-slate-400" />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Kendaraan Terdaftar"
          icon={ShieldCheck}
          action={
            <Segmented
              value={vehicleTab}
              onChange={setVehicleTab}
              options={[{ value: "MENUNGGU", label: `Verifikasi (${pendingVehicles.length})` }, { value: "AKTIF", label: "Semua" }]}
            />
          }
        >
          {listedVehicles.length === 0 ? (
            <Empty>Tidak ada data.</Empty>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {listedVehicles.map((v) => (
                <li key={v.id} className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-sm font-black">{v.plate}</p>
                    <Pill tone={v.status === "AKTIF" ? "emerald" : v.status === "NONAKTIF" ? "slate" : "amber"}>{v.status.replace("_", " ")}</Pill>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {v.type === "MOBIL" ? "🚗" : "🏍️"} {v.brandColor} · {v.ownerName} ({v.houseBlock})
                  </p>
                  <p className="text-[10px] text-slate-500">Stiker: {v.stickerCode ?? "-"} · RFID: {v.rfidTag ?? "-"}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {v.status === "MENUNGGU_VERIFIKASI" && (
                      <button onClick={() => verifyVehicle(v)} className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-[11px] font-bold">Verifikasi & terbitkan stiker</button>
                    )}
                    {v.status === "AKTIF" && (
                      <>
                        <button onClick={() => assignRfid(v)} className="h-8 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 text-[11px] font-bold">Atur RFID</button>
                        <button onClick={() => setVehicleStatus(v, "NONAKTIF")} className="h-8 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 text-[11px] font-bold text-red-600">Nonaktifkan</button>
                      </>
                    )}
                    {v.status === "NONAKTIF" && (
                      <button onClick={() => setVehicleStatus(v, "AKTIF")} className="h-8 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 text-[11px] font-bold">Aktifkan</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function KendaraanWarga({ state, update, user }: { state: KeamananState; update: KeamananUpdater; user: SecurityUser }) {
  const [plate, setPlate] = React.useState("");
  const [type, setType] = React.useState<VehicleType>("MOBIL");
  const [brandColor, setBrandColor] = React.useState("");
  const [showForm, setShowForm] = React.useState(false);

  const mine = state.vehicles.filter((v) => v.houseBlock === user.houseBlock);
  const myPlates = new Set(mine.map((v) => plateKey(v.plate)));
  const myLogs = state.vehicleLogs.filter((l) => myPlates.has(plateKey(l.plate))).slice(0, 15);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizePlate(plate);
    if (!plateKey(normalized) || !brandColor.trim()) {
      toast.error("Plat dan merk/warna wajib diisi.");
      return;
    }
    if (state.vehicles.some((v) => plateKey(v.plate) === plateKey(normalized))) {
      toast.error("Plat ini sudah terdaftar.");
      return;
    }
    const vehicle: ResidentVehicle = {
      id: uid("veh"),
      plate: normalized,
      type,
      brandColor: brandColor.trim(),
      ownerName: user.name,
      houseBlock: user.houseBlock,
      status: "MENUNGGU_VERIFIKASI",
      createdAt: new Date().toISOString(),
    };
    update((s) => ({ ...s, vehicles: [vehicle, ...s.vehicles] }));
    setPlate("");
    setBrandColor("");
    setShowForm(false);
    toast.success("Terkirim. Ambil stiker di pos satpam setelah diverifikasi.");
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
      <div className="xl:col-span-3 space-y-4">
        <Panel
          title="Kendaraan Saya"
          description="Kendaraan terdaftar dibuka otomatis oleh palang gerbang (plat terbaca kamera / tap stiker RFID)."
          icon={Car}
          action={
            <button onClick={() => setShowForm((v) => !v)} className="h-9 px-3 rounded-xl bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 shrink-0">
              <Plus className="w-3.5 h-3.5" /> Daftar
            </button>
          }
        >
          {showForm && (
            <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-[#0B130E]">
              <Segmented value={type} onChange={setType} className="sm:col-span-2" options={[{ value: "MOBIL", label: "🚗 Mobil" }, { value: "MOTOR", label: "🏍️ Motor" }]} />
              <Field label="Plat nomor">
                <input value={plate} onChange={(e) => setPlate(e.target.value)} className={`${inputClass} font-mono uppercase`} placeholder="B 1234 ABC" />
              </Field>
              <Field label="Merk & warna">
                <input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className={inputClass} placeholder="Honda Jazz Merah" />
              </Field>
              <button type="submit" className={`${primaryBtn} sm:col-span-2`}>Kirim Pendaftaran</button>
            </form>
          )}
          {mine.length === 0 ? (
            <Empty>Belum ada kendaraan terdaftar.</Empty>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mine.map((v) => (
                <li key={v.id} className="rounded-2xl p-4 bg-gradient-to-br from-slate-900 to-slate-700 text-white space-y-2 relative overflow-hidden">
                  <span className="absolute -right-4 -bottom-6 text-7xl opacity-10">{v.type === "MOBIL" ? "🚗" : "🏍️"}</span>
                  <p className="font-mono text-xl font-black tracking-widest">{v.plate}</p>
                  <p className="text-xs opacity-80">{v.brandColor}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono opacity-80">{v.stickerCode ?? "Stiker belum terbit"}</span>
                    <Pill tone={v.status === "AKTIF" ? "emerald" : "amber"} className="bg-white/10">{v.status.replace("_", " ")}</Pill>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="xl:col-span-2">
        <Panel title="Riwayat Keluar-Masuk" icon={ScanLine}>
          {myLogs.length === 0 ? (
            <Empty>Belum ada riwayat.</Empty>
          ) : (
            <ul className="space-y-1.5">
              {myLogs.map((l) => (
                <li key={l.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-neutral-50 dark:bg-[#0B130E]">
                  <span className="font-mono font-bold">{l.plate}</span>
                  <span className="text-slate-500">{l.direction === "MASUK" ? "⬇️ Masuk" : "⬆️ Keluar"} · {formatDateTime(l.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
