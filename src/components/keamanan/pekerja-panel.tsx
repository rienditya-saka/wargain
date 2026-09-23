"use client";

import * as React from "react";
import { toast } from "sonner";
import { BadgeCheck, Plus, Share2, Ban, IdCard, ScanLine, Info } from "lucide-react";
import { DAY_LABELS, GateLog, KeamananState, KeamananUpdater, WORKER_ROLE_LABEL, WorkerPass, WorkerRole } from "@/lib/keamanan/types";
import { formatDateLabel, formatTime, toDateKey, uid } from "@/lib/keamanan/store";
import { normalizePlate } from "@/lib/keamanan/plate";
import { Empty, Field, Panel, PhotoInput, Pill, SecurityUser, ghostBtn, inputClass, primaryBtn, waLink } from "./ui";

export function workerCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "PK-" + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function isWorkerAllowedNow(w: WorkerPass, now = new Date()): { ok: boolean; reason: string } {
  const today = toDateKey(now);
  if (w.status !== "AKTIF") return { ok: false, reason: "Kartu sudah dicabut oleh pemberi kerja." };
  if (today < w.validFrom.slice(0, 10)) return { ok: false, reason: `Kartu baru berlaku mulai ${formatDateLabel(w.validFrom)}.` };
  if (today > w.validUntil.slice(0, 10)) return { ok: false, reason: `Kartu kedaluwarsa sejak ${formatDateLabel(w.validUntil)}.` };
  if (w.liveIn) return { ok: true, reason: "Pekerja menginap (bebas jam)." };
  if (!w.allowedDays.includes(now.getDay())) return { ok: false, reason: `Hari ini bukan jadwal kerja (${w.allowedDays.map((d) => DAY_LABELS[d]).join(", ")}).` };
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  if (hhmm < w.allowedStart || hhmm > w.allowedEnd) return { ok: false, reason: `Di luar jam kerja (${w.allowedStart}–${w.allowedEnd}).` };
  return { ok: true, reason: `Jadwal ${w.allowedStart}–${w.allowedEnd}` };
}

export function PekerjaPanel({
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
  const [showForm, setShowForm] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [result, setResult] = React.useState<{ worker: WorkerPass; ok: boolean; reason: string } | null>(null);

  const listed = isPetugas ? state.workers : state.workers.filter((w) => w.houseBlock === user.houseBlock);

  const revoke = (w: WorkerPass) => {
    if (!window.confirm(`Cabut kartu ${w.name}? Satpam akan menolak akses mulai sekarang.`)) return;
    update((s) => ({ ...s, workers: s.workers.map((x) => (x.id === w.id ? { ...x, status: "DICABUT" } : x)) }));
    toast.success("Kartu pekerja dicabut.");
  };

  const verify = () => {
    const w = state.workers.find((x) => x.code.toUpperCase() === code.trim().toUpperCase());
    if (!w) {
      setResult(null);
      toast.error("Kode kartu tidak ditemukan.");
      return;
    }
    const check = isWorkerAllowedNow(w);
    setResult({ worker: w, ...check });
    if (check.ok) {
      const log: GateLog = {
        id: uid("gate"),
        kind: "PEKERJA",
        name: `${w.name} (${WORKER_ROLE_LABEL[w.role]})`,
        plate: w.plate,
        destinationBlock: w.houseBlock,
        purpose: `Kartu pekerja ${w.code}`,
        inAt: new Date().toISOString(),
        status: "DIIZINKAN",
        inviteCode: w.code,
        officer: user.name,
      };
      update((s) => ({ ...s, gateLogs: [log, ...s.gateLogs] }));
      toast.success(`${w.name} diizinkan masuk ke ${w.houseBlock}.`);
    }
  };

  const lastEntry = (w: WorkerPass) => state.gateLogs.find((g) => g.inviteCode === w.code);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 text-xs text-slate-700 dark:text-slate-300 flex gap-2.5">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
        <div className="space-y-1">
          <p className="font-extrabold text-blue-700 dark:text-blue-300">Apa itu Kartu Pekerja?</p>
          <p>
            Kartu akses digital untuk <b>ART, sopir, tukang kebun, pengasuh, atau tukang renovasi</b> yang rutin datang ke rumah warga.
            Warga mendaftarkan pekerjanya sekali (foto, jadwal hari & jam, masa berlaku). Pekerja cukup menunjukkan kode di gerbang,
            satpam tidak perlu telepon tuan rumah setiap hari. Di luar jadwal atau setelah kedaluwarsa, akses otomatis ditolak.
            Kalau pekerja berhenti, warga cukup menekan <b>Cabut</b>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-2 space-y-4">
          {isPetugas ? (
            <Panel title="Verifikasi Kartu di Gerbang" icon={ScanLine}>
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && verify()}
                  placeholder="PK-XXXX"
                  className={`${inputClass} font-mono uppercase tracking-widest text-sm`}
                />
                <button onClick={verify} className={`${primaryBtn} shrink-0`}>Cek</button>
              </div>
              {result && (
                <div className={`rounded-2xl p-4 flex gap-3 text-white ${result.ok ? "bg-emerald-600" : "bg-red-600"}`}>
                  <div className="w-16 h-16 rounded-xl bg-white/20 overflow-hidden shrink-0 flex items-center justify-center text-2xl">
                    {result.worker.photoUrl ? <img src={result.worker.photoUrl} alt="" className="w-full h-full object-cover" /> : "👤"}
                  </div>
                  <div className="min-w-0 text-xs space-y-0.5">
                    <p className="text-sm font-black">{result.ok ? "✅ DIIZINKAN" : "⛔ DITOLAK"}</p>
                    <p className="font-bold">{result.worker.name} · {WORKER_ROLE_LABEL[result.worker.role]}</p>
                    <p>Ke {result.worker.houseBlock} ({result.worker.employerName})</p>
                    <p className="opacity-90">{result.reason}</p>
                  </div>
                </div>
              )}
            </Panel>
          ) : (
            <button onClick={() => setShowForm((v) => !v)} className={`${primaryBtn} w-full flex items-center justify-center gap-1.5`}>
              <Plus className="w-4 h-4" /> Daftarkan Pekerja
            </button>
          )}
          {showForm && !isPetugas && <WorkerForm update={update} user={user} onDone={() => setShowForm(false)} />}
        </div>

        <div className="xl:col-span-3">
          <Panel title={isPetugas ? `Kartu Pekerja Terdaftar (${state.workers.filter((w) => w.status === "AKTIF").length} aktif)` : "Pekerja Saya"} icon={IdCard}>
            {listed.length === 0 ? (
              <Empty>Belum ada pekerja terdaftar.</Empty>
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {listed.map((w) => {
                  const check = isWorkerAllowedNow(w);
                  const entry = lastEntry(w);
                  return (
                    <li key={w.id} className={`rounded-2xl overflow-hidden border ${w.status === "AKTIF" ? "border-emerald-500/40" : "border-neutral-200 dark:border-neutral-800 opacity-60"}`}>
                      <div className="bg-gradient-to-br from-emerald-700 to-teal-800 text-white p-4 flex gap-3">
                        <div className="w-16 h-20 rounded-xl bg-white/15 overflow-hidden shrink-0 flex items-center justify-center text-3xl">
                          {w.photoUrl ? <img src={w.photoUrl} alt="" className="w-full h-full object-cover" /> : "👤"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] font-bold tracking-widest opacity-80">KARTU PEKERJA · WARGAIN</p>
                          <p className="text-sm font-black truncate">{w.name}</p>
                          <p className="text-[11px] opacity-90">{WORKER_ROLE_LABEL[w.role]}</p>
                          <p className="font-mono text-lg font-black tracking-[0.2em] mt-1">{w.code}</p>
                        </div>
                      </div>
                      <div className="p-3 space-y-1.5 text-[11px] bg-white dark:bg-[#131F17]">
                        <p>🏠 {w.houseBlock} · {w.employerName}</p>
                        <p>
                          📅 {w.liveIn ? "Menginap" : `${w.allowedDays.map((d) => DAY_LABELS[d]).join(", ")} · ${w.allowedStart}–${w.allowedEnd}`}
                        </p>
                        <p className="text-slate-500">Berlaku s/d {formatDateLabel(w.validUntil)}{w.plate ? ` · ${w.plate}` : ""}</p>
                        {entry && <p className="text-slate-500">Terakhir masuk {formatTime(entry.inAt)} ({toDateKey(new Date(entry.inAt)) === toDateKey(new Date()) ? "hari ini" : formatDateLabel(toDateKey(new Date(entry.inAt)))})</p>}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          {w.status === "AKTIF" ? (
                            <Pill tone={check.ok ? "emerald" : "slate"}>{check.ok ? "BISA MASUK SEKARANG" : "DI LUAR JADWAL"}</Pill>
                          ) : (
                            <Pill tone="red">DICABUT</Pill>
                          )}
                          {w.status === "AKTIF" && (
                            <div className="flex gap-1.5">
                              <a
                                href={waLink(`Halo ${w.name}, ini kode kartu pekerja Anda untuk masuk ke ${w.houseBlock}: *${w.code}*. Tunjukkan ke satpam gerbang.`, w.phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center"
                                aria-label="Kirim ke WhatsApp pekerja"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </a>
                              <button onClick={() => revoke(w)} className="h-8 px-2.5 rounded-lg border border-red-400 text-red-600 font-bold flex items-center gap-1">
                                <Ban className="w-3.5 h-3.5" /> Cabut
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function WorkerForm({ update, user, onDone }: { update: KeamananUpdater; user: SecurityUser; onDone: () => void }) {
  const today = toDateKey(new Date());
  const in3Months = toDateKey(new Date(Date.now() + 90 * 86_400_000));
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState<WorkerRole>("ART");
  const [phone, setPhone] = React.useState("");
  const [nik, setNik] = React.useState("");
  const [plate, setPlate] = React.useState("");
  const [photoUrl, setPhotoUrl] = React.useState<string>();
  const [validUntil, setValidUntil] = React.useState(in3Months);
  const [days, setDays] = React.useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [start, setStart] = React.useState("07:00");
  const [end, setEnd] = React.useState("17:00");
  const [liveIn, setLiveIn] = React.useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Nama dan nomor HP pekerja wajib diisi.");
      return;
    }
    if (!liveIn && days.length === 0) {
      toast.error("Pilih minimal satu hari kerja.");
      return;
    }
    const worker: WorkerPass = {
      id: uid("wp"),
      code: workerCode(),
      name: name.trim(),
      role,
      phone: phone.trim(),
      nik: nik.trim() || undefined,
      photoUrl,
      plate: plate.trim() ? normalizePlate(plate) : undefined,
      employerName: user.name,
      houseBlock: user.houseBlock,
      validFrom: today,
      validUntil,
      allowedDays: [...days].sort(),
      allowedStart: start,
      allowedEnd: end,
      liveIn,
      status: "AKTIF",
      createdAt: new Date().toISOString(),
    };
    update((s) => ({ ...s, workers: [worker, ...s.workers] }));
    toast.success(`Kartu ${worker.code} terbit. Kirim kodenya ke pekerja via WhatsApp.`);
    onDone();
  };

  return (
    <Panel title="Daftarkan Pekerja" icon={BadgeCheck}>
      <form onSubmit={submit} className="space-y-3">
        <div className="flex gap-3">
          <PhotoInput value={photoUrl} onChange={setPhotoUrl} label="Foto" />
          <div className="flex-1 space-y-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" className={inputClass} />
            <select value={role} onChange={(e) => setRole(e.target.value as WorkerRole)} className={inputClass}>
              {(Object.keys(WORKER_ROLE_LABEL) as WorkerRole[]).map((r) => <option key={r} value={r}>{WORKER_ROLE_LABEL[r]}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="No. HP (WhatsApp)">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={inputClass} placeholder="08..." />
          </Field>
          <Field label="NIK (opsional)">
            <input value={nik} onChange={(e) => setNik(e.target.value)} inputMode="numeric" className={inputClass} />
          </Field>
          <Field label="Plat motor (opsional)">
            <input value={plate} onChange={(e) => setPlate(e.target.value)} className={`${inputClass} font-mono uppercase`} placeholder="B 1234 XY" />
          </Field>
          <Field label="Berlaku sampai">
            <input type="date" value={validUntil} min={today} onChange={(e) => setValidUntil(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold">
          <input type="checkbox" checked={liveIn} onChange={(e) => setLiveIn(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
          Pekerja menginap (bebas keluar-masuk)
        </label>
        {!liveIn && (
          <>
            <div>
              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Hari kerja</p>
              <div className="grid grid-cols-7 gap-1">
                {DAY_LABELS.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays((list) => (list.includes(i) ? list.filter((x) => x !== i) : [...list, i]))}
                    className={`min-h-[36px] rounded-lg text-[11px] font-bold border ${
                      days.includes(i) ? "bg-emerald-600 text-white border-emerald-600" : "border-neutral-200 dark:border-neutral-800 text-slate-500"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Jam mulai">
                <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Jam selesai">
                <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={inputClass} />
              </Field>
            </div>
          </>
        )}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onDone} className={ghostBtn}>Batal</button>
          <button type="submit" className={primaryBtn}>Terbitkan Kartu</button>
        </div>
      </form>
    </Panel>
  );
}
