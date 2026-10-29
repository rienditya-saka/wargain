"use client";

import * as React from "react";
import { AppSheet } from "@/components/ui/app-sheet";
import { toast } from "sonner";
import Link from "next/link";
import { CalendarDays, MapPinned, ScanLine, UserCheck, Repeat, Plus, Receipt } from "lucide-react";
import { AttendanceStatus, KeamananState, KeamananUpdater, RondaFine, RondaShift } from "@/lib/keamanan/types";
import { formatDateLabel, formatRupiah, formatTime, timeAgo, toDateKey, uid } from "@/lib/keamanan/store";
import { Empty, Field, Panel, Pill, PillTone, SecurityUser, inputClass } from "./ui";

const ATTENDANCE_TONE: Record<AttendanceStatus, PillTone> = {
  BELUM: "slate",
  HADIR: "emerald",
  IZIN: "blue",
  ALPA: "red",
};

export function RondaPanel({
  state,
  update,
  user,
  isPetugas,
  issueFine,
}: {
  state: KeamananState;
  update: KeamananUpdater;
  user: SecurityUser;
  isPetugas: boolean;
  issueFine: (fine: RondaFine) => Promise<{ ok: boolean; error?: string }>;
}) {
  const today = toDateKey(new Date());
  const [issuing, setIssuing] = React.useState<string | null>(null);
  const { rondaFineEnabled, rondaFineAmount } = state.settings;
  const fineFor = (shiftId: string, memberName: string) =>
    state.fines.find((f) => f.shiftId === shiftId && f.memberName === memberName && f.status !== "DIBATALKAN");

  const handleIssueFine = async (shift: RondaShift, memberName: string, houseBlock: string) => {
    const key = `${shift.id}:${memberName}`;
    setIssuing(key);
    const res = await issueFine({
      id: uid("fine"),
      shiftId: shift.id,
      shiftDate: shift.date,
      memberName,
      houseBlock,
      amount: rondaFineAmount,
      status: "TERBIT",
      createdAt: new Date().toISOString(),
    });
    setIssuing(null);
    if (res.ok) toast.success(`Denda ${formatRupiah(rondaFineAmount)} diterbitkan ke tagihan Kas ${houseBlock}.`);
    else toast.error(res.error || "Gagal menerbitkan denda.");
  };

  const myFines = state.fines.filter((f) => f.memberName === user.name || f.houseBlock === user.houseBlock);
  const shifts = [...state.shifts].sort((a, b) => a.date.localeCompare(b.date));
  const tonight = shifts.find((s) => s.date === today);
  const myShift = shifts.find((s) => s.date >= today && s.members.some((m) => m.name === user.name));

  const setAttendance = (shift: RondaShift, memberName: string, status: AttendanceStatus) => {
    update((s) => ({
      ...s,
      shifts: s.shifts.map((sh) =>
        sh.id !== shift.id
          ? sh
          : {
              ...sh,
              members: sh.members.map((m) =>
                m.name === memberName
                  ? { ...m, status, checkInAt: status === "HADIR" ? new Date().toISOString() : undefined }
                  : m
              ),
            }
      ),
    }));
  };

  const scanCheckpoint = (id: string) => {
    update((s) => ({
      ...s,
      checkpoints: s.checkpoints.map((cp) =>
        cp.id === id ? { ...cp, lastScanAt: new Date().toISOString(), lastScanBy: user.name } : cp
      ),
    }));
    toast.success("Checkpoint tercatat. Patroli terverifikasi lokasi & waktu.");
  };

  const pastShifts = shifts.filter((s) => s.date < today);
  const pastMembers = pastShifts.flatMap((s) => s.members);
  const attendanceRate = pastMembers.length
    ? Math.round((pastMembers.filter((m) => m.status === "HADIR").length / pastMembers.length) * 100)
    : 100;
  const scannedLast3h = state.checkpoints.filter(
    (cp) => cp.lastScanAt && Date.now() - new Date(cp.lastScanAt).getTime() < 3 * 3_600_000
  ).length;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
      <div className="xl:col-span-3 space-y-4">
        {!isPetugas && (
          <Panel title="Jadwal Ronda Saya" icon={UserCheck}>
            {myShift ? (
              <MyShiftCard shift={myShift} user={user} isToday={myShift.date === today} onCheckIn={() => setAttendance(myShift, user.name, "HADIR")} />
            ) : (
              <Empty>Anda belum masuk jadwal ronda minggu ini.</Empty>
            )}
          </Panel>
        )}

        <Panel
          title="Jadwal Ronda Mingguan"
          description={isPetugas ? "Tandai kehadiran anggota. Check-in warga via GPS otomatis tercatat di sini." : "Jadwal bergilir seluruh warga."}
          icon={CalendarDays}
          action={isPetugas ? <AddShiftButton update={update} /> : undefined}
        >
          <ul className="space-y-2">
            {shifts.map((shift) => (
              <li
                key={shift.id}
                className={`p-3 rounded-xl border ${
                  shift.date === today ? "border-emerald-500 bg-emerald-500/5" : "border-neutral-200 dark:border-neutral-800"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div>
                    <p className="text-xs font-extrabold capitalize">
                      {formatDateLabel(shift.date)} {shift.date === today && <Pill tone="emerald">MALAM INI</Pill>}
                    </p>
                    <p className="text-[11px] text-slate-500">{shift.startTime}–{shift.endTime} · {shift.post}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {shift.members.map((m) => (
                    <div key={m.name} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold">
                        {m.name} <span className="text-slate-500 font-normal">({m.houseBlock})</span>
                        {m.checkInAt && <span className="text-[10px] text-emerald-600 ml-1">✓ {formatTime(m.checkInAt)}</span>}
                      </span>
                      {isPetugas ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {rondaFineEnabled && m.status === "ALPA" && shift.date <= today && (() => {
                            const fine = fineFor(shift.id, m.name);
                            if (fine) return <Pill tone={fine.status === "LUNAS" ? "emerald" : "amber"}>Denda {fine.status}</Pill>;
                            const busy = issuing === `${shift.id}:${m.name}`;
                            return (
                              <button
                                onClick={() => handleIssueFine(shift, m.name, m.houseBlock)}
                                disabled={busy}
                                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-500 text-white disabled:opacity-50"
                              >
                                {busy ? "..." : `+ Denda ${formatRupiah(rondaFineAmount)}`}
                              </button>
                            );
                          })()}
                          {(["HADIR", "IZIN", "ALPA"] as AttendanceStatus[]).map((st) => (
                            <button
                              key={st}
                              onClick={() => setAttendance(shift, m.name, st)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                                m.status === st
                                  ? st === "HADIR"
                                    ? "bg-emerald-600 text-white border-emerald-600"
                                    : st === "IZIN"
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-red-600 text-white border-red-600"
                                  : "border-neutral-200 dark:border-neutral-700 text-slate-500"
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <Pill tone={ATTENDANCE_TONE[m.status]}>{m.status}</Pill>
                      )}
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="xl:col-span-2 space-y-4">
        {isPetugas ? (
          <FineSettings state={state} update={update} />
        ) : (
          myFines.length > 0 && (
            <Panel title="Denda Ronda Saya" icon={Receipt} className="border-amber-500/50">
              <ul className="space-y-1.5">
                {myFines.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-2 text-xs p-2 rounded-lg bg-neutral-50 dark:bg-[#0B130E]">
                    <span className="capitalize">{formatDateLabel(f.shiftDate)}</span>
                    <span className="font-bold">{formatRupiah(f.amount)}</span>
                    <Pill tone={f.status === "LUNAS" ? "emerald" : f.status === "DIBATALKAN" ? "slate" : "amber"}>{f.status}</Pill>
                  </li>
                ))}
              </ul>
              {myFines.some((f) => f.status === "TERBIT") && (
                <Link href="/kas" className="block text-center min-h-[40px] leading-[40px] rounded-xl bg-emerald-600 text-white text-xs font-bold">
                  Bayar di Kas & Financial RT
                </Link>
              )}
            </Panel>
          )
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] p-3">
            <p className="text-[10px] font-semibold text-slate-500">Kehadiran ronda</p>
            <p className={`text-lg font-black ${attendanceRate >= 75 ? "text-emerald-600" : "text-amber-600"}`}>{attendanceRate}%</p>
          </div>
          <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] p-3">
            <p className="text-[10px] font-semibold text-slate-500">Checkpoint 3 jam</p>
            <p className="text-lg font-black text-slate-900 dark:text-slate-100">
              {scannedLast3h}/{state.checkpoints.length}
            </p>
          </div>
        </div>

        <Panel
          title="Checkpoint Patroli"
          description="Petugas scan QR/NFC di tiap titik saat keliling. Membuktikan patroli benar-benar dilakukan."
          icon={MapPinned}
        >
          <ul className="space-y-2">
            {state.checkpoints.map((cp) => {
              const hours = cp.lastScanAt ? (Date.now() - new Date(cp.lastScanAt).getTime()) / 3_600_000 : Infinity;
              const tone: PillTone = hours < 1 ? "emerald" : hours < 3 ? "amber" : "slate";
              const canScan = isPetugas || tonight?.members.some((m) => m.name === user.name);
              return (
                <li key={cp.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-neutral-50 dark:bg-[#0B130E]">
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{cp.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {cp.lastScanAt ? `${timeAgo(cp.lastScanAt)} · ${cp.lastScanBy}` : "Belum dipatroli"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Pill tone={tone}>{hours < 1 ? "BARU" : hours < 3 ? "OK" : "LEWAT"}</Pill>
                    {canScan && (
                      <button
                        onClick={() => scanCheckpoint(cp.id)}
                        className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center"
                        aria-label={`Scan checkpoint ${cp.name}`}
                      >
                        <ScanLine className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function MyShiftCard({
  shift,
  user,
  isToday,
  onCheckIn,
}: {
  shift: RondaShift;
  user: SecurityUser;
  isToday: boolean;
  onCheckIn: () => void;
}) {
  const me = shift.members.find((m) => m.name === user.name)!;
  const partners = shift.members.filter((m) => m.name !== user.name);

  const handleCheckIn = () => {
    if (!("geolocation" in navigator)) {
      onCheckIn();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        onCheckIn();
        toast.success("Check-in ronda berhasil. Selamat bertugas!");
      },
      () => {
        onCheckIn();
        toast.warning("GPS tidak aktif. Check-in tercatat tanpa verifikasi lokasi.");
      },
      { timeout: 6000 }
    );
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4 space-y-3">
      <div>
        <p className="text-[11px] opacity-80">{isToday ? "Giliran Anda MALAM INI" : "Giliran berikutnya"}</p>
        <p className="text-lg font-black capitalize">{formatDateLabel(shift.date)}</p>
        <p className="text-xs opacity-90">{shift.startTime}–{shift.endTime} · {shift.post}</p>
        <p className="text-[11px] opacity-80 mt-1">Bersama: {partners.map((p) => `${p.name} (${p.houseBlock})`).join(", ") || "-"}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {isToday && me.status !== "HADIR" && (
          <button onClick={handleCheckIn} className="min-h-[40px] px-4 rounded-xl bg-white text-emerald-700 text-xs font-black">
            Check-in Ronda (GPS)
          </button>
        )}
        {me.status === "HADIR" && <span className="min-h-[40px] px-4 rounded-xl bg-white/20 text-xs font-bold flex items-center">✓ Sudah check-in {formatTime(me.checkInAt)}</span>}
        <button
          onClick={() => toast.success("Permintaan tukar jadwal dikirim ke koordinator keamanan.")}
          className="min-h-[40px] px-4 rounded-xl border border-white/40 text-xs font-bold flex items-center gap-1.5"
        >
          <Repeat className="w-3.5 h-3.5" /> Tukar jadwal
        </button>
      </div>
    </div>
  );
}

function AddShiftButton({ update }: { update: KeamananUpdater }) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState(toDateKey(new Date()));
  const [members, setMembers] = React.useState("");
  const [post, setPost] = React.useState("Pos Ronda Blok C");

  const save = () => {
    const parsed = members
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean)
      .map((entry) => {
        const [name, block = "-"] = entry.split("/").map((v) => v.trim());
        return { name, houseBlock: block, status: "BELUM" as const };
      });
    if (parsed.length === 0) {
      toast.error("Isi minimal satu anggota ronda.");
      return;
    }
    update((s) => ({
      ...s,
      shifts: [...s.shifts, { id: uid("shift"), date, startTime: "22:00", endTime: "04:00", post, members: parsed }],
    }));
    setOpen(false);
    setMembers("");
    toast.success("Jadwal ronda ditambahkan.");
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="h-9 px-3 rounded-xl bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 shrink-0">
        <Plus className="w-3.5 h-3.5" /> Jadwal
      </button>
      <AppSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Tambah Jadwal Ronda"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="min-h-[40px] px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold">Batal</button>
            <button onClick={save} className="min-h-[40px] px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold">Simpan</button>
          </div>
        }
      >
      <div className="p-4 space-y-3">
        <Field label="Tanggal">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Pos">
          <input value={post} onChange={(e) => setPost(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Anggota (format: Nama / Blok, pisahkan koma)">
          <input value={members} onChange={(e) => setMembers(e.target.value)} placeholder="Pak Joko / B-11, Mas Dimas / C-09" className={inputClass} />
        </Field>
      </div>
      </AppSheet>
    </>
  );
}

function FineSettings({ state, update }: { state: KeamananState; update: KeamananUpdater }) {
  const { rondaFineEnabled, rondaFineAmount } = state.settings;
  const [amount, setAmount] = React.useState(String(rondaFineAmount));
  const issued = state.fines.filter((f) => f.status !== "DIBATALKAN");
  const unpaid = issued.filter((f) => f.status === "TERBIT");
  const paidTotal = issued.filter((f) => f.status === "LUNAS").reduce((n, f) => n + f.amount, 0);

  const save = (patch: Partial<KeamananState["settings"]>) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));

  return (
    <Panel
      title="Denda Tidak Ronda"
      description="Anggota yang ALPA bisa langsung ditagih. Tagihan masuk ke modul Kas sebagai tagihan rumah."
      icon={Receipt}
      action={
        <button
          onClick={() => save({ rondaFineEnabled: !rondaFineEnabled })}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${rondaFineEnabled ? "bg-emerald-600" : "bg-neutral-300 dark:bg-neutral-700"}`}
          aria-pressed={rondaFineEnabled}
          aria-label="Aktifkan denda ronda"
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${rondaFineEnabled ? "left-[22px]" : "left-0.5"}`} />
        </button>
      }
    >
      {rondaFineEnabled && (
        <>
          <div className="flex gap-2">
            <input type="number" min={0} step={1000} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
            <button
              onClick={() => {
                save({ rondaFineAmount: Math.max(0, Number(amount) || 0) });
                toast.success("Nominal denda disimpan.");
              }}
              className="min-h-[40px] px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold shrink-0"
            >
              Simpan
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-neutral-50 dark:bg-[#0B130E] p-2">
              <p className="text-[10px] text-slate-500">Terbit</p>
              <p className="text-sm font-black">{issued.length}</p>
            </div>
            <div className="rounded-xl bg-neutral-50 dark:bg-[#0B130E] p-2">
              <p className="text-[10px] text-slate-500">Belum bayar</p>
              <p className="text-sm font-black text-amber-600">{unpaid.length}</p>
            </div>
            <div className="rounded-xl bg-neutral-50 dark:bg-[#0B130E] p-2">
              <p className="text-[10px] text-slate-500">Terkumpul</p>
              <p className="text-sm font-black text-emerald-600">{formatRupiah(paidTotal)}</p>
            </div>
          </div>
          {issued.length > 0 && (
            <ul className="space-y-1 max-h-40 overflow-y-auto">
              {issued.slice(0, 10).map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate">{f.memberName} ({f.houseBlock}) · {f.billNumber ?? "-"}</span>
                  <Pill tone={f.status === "LUNAS" ? "emerald" : "amber"}>{f.status}</Pill>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Panel>
  );
}
