"use client";

import * as React from "react";
import { toast } from "sonner";
import { DoorOpen, BookUser, Ticket, LogOut, Share2, Check, X, Search, BellRing } from "lucide-react";
import { GateLog, GateStatus, GuestInvite, KeamananState, KeamananUpdater, VisitorKind, VISITOR_KIND_LABEL } from "@/lib/keamanan/types";
import { formatDateLabel, formatDateTime, formatTime, timeAgo, toDateKey, uid } from "@/lib/keamanan/store";
import { Empty, Field, Panel, Pill, PillTone, SecurityUser, inputClass } from "./ui";
import { findWatchlistByPlate } from "./waspada-panel";
import { isWorkerAllowedNow } from "./pekerja-panel";
import { WORKER_ROLE_LABEL } from "@/lib/keamanan/types";

const GATE_TONE: Record<GateStatus, PillTone> = {
  MENUNGGU_KONFIRMASI: "amber",
  DIIZINKAN: "emerald",
  DITOLAK: "red",
  KELUAR: "slate",
};

const GATE_LABEL: Record<GateStatus, string> = {
  MENUNGGU_KONFIRMASI: "MENUNGGU TUAN RUMAH",
  DIIZINKAN: "DI DALAM",
  DITOLAK: "DITOLAK",
  KELUAR: "SUDAH KELUAR",
};

const OVERSTAY_HOURS = 24;

function inviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "WG-" + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function GatePanel({
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
  return isPetugas ? (
    <GatePetugas state={state} update={update} officer={user.name} />
  ) : (
    <GateWarga state={state} update={update} user={user} />
  );
}

function setGateStatus(update: KeamananUpdater, id: string, status: GateStatus) {
  update((s) => ({
    ...s,
    gateLogs: s.gateLogs.map((g) =>
      g.id === id ? { ...g, status, outAt: status === "KELUAR" ? new Date().toISOString() : g.outAt } : g
    ),
  }));
}

function GateWarga({ state, update, user }: { state: KeamananState; update: KeamananUpdater; user: SecurityUser }) {
  const [guestName, setGuestName] = React.useState("");
  const [plate, setPlate] = React.useState("");
  const [visitDate, setVisitDate] = React.useState(toDateKey(new Date()));
  const [note, setNote] = React.useState("");

  const pending = state.gateLogs.filter((g) => g.destinationBlock === user.houseBlock && g.status === "MENUNGGU_KONFIRMASI");
  const myInvites = state.invites.filter((i) => i.hostBlock === user.houseBlock);
  const myVisitors = state.gateLogs.filter((g) => g.destinationBlock === user.houseBlock && g.status !== "MENUNGGU_KONFIRMASI");

  const createInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      toast.error("Nama tamu wajib diisi.");
      return;
    }
    const invite: GuestInvite = {
      id: uid("inv"),
      code: inviteCode(),
      guestName: guestName.trim(),
      plate: plate.trim().toUpperCase() || undefined,
      hostName: user.name,
      hostBlock: user.houseBlock,
      visitDate,
      note: note.trim() || undefined,
      used: false,
    };
    update((s) => ({ ...s, invites: [invite, ...s.invites] }));
    setGuestName("");
    setPlate("");
    setNote("");
    toast.success(`Undangan dibuat. Kode akses: ${invite.code}`);
  };

  const shareText = (inv: GuestInvite) =>
    encodeURIComponent(
      `Halo ${inv.guestName}, ini kode akses tamu ke rumah ${inv.hostName} (${inv.hostBlock}) untuk ${formatDateLabel(inv.visitDate)}: *${inv.code}*. Tunjukkan kode ini ke satpam gerbang.`
    );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
      <div className="xl:col-span-3 space-y-4">
        {pending.length > 0 && (
          <Panel title="Tamu Menunggu di Gerbang" description="Satpam menahan tamu sampai Anda konfirmasi." icon={BellRing} className="border-amber-500/60">
            <ul className="space-y-2">
              {pending.map((g) => (
                <li key={g.id} className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="text-xs">
                    <p className="font-extrabold">{g.name} <span className="font-normal text-slate-500">· {VISITOR_KIND_LABEL[g.kind]}</span></p>
                    <p className="text-slate-600 dark:text-slate-300">{g.purpose} {g.plate && `· ${g.plate}`} · tiba {timeAgo(g.inAt)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setGateStatus(update, g.id, "DIIZINKAN"); toast.success("Tamu diizinkan masuk."); }}
                      className="min-h-[40px] rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <Check className="w-4 h-4" /> Izinkan masuk
                    </button>
                    <button
                      onClick={() => { setGateStatus(update, g.id, "DITOLAK"); toast("Tamu ditolak, satpam sudah diberi tahu."); }}
                      className="min-h-[40px] rounded-xl border border-red-400 text-red-600 text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <X className="w-4 h-4" /> Saya tidak kenal
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <Panel title="Undang Tamu (Pre-Registrasi)" description="Tamu dapat kode akses, masuk gerbang tanpa ditahan lama." icon={Ticket}>
          <form onSubmit={createInvite} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nama tamu">
              <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="mis. Keluarga Om Dedi" className={inputClass} />
            </Field>
            <Field label="Plat kendaraan (opsional)">
              <input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="B 1234 ABC" className={inputClass} />
            </Field>
            <Field label="Tanggal kunjungan">
              <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Catatan untuk satpam">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. bawa mobil box" className={inputClass} />
            </Field>
            <button type="submit" className="sm:col-span-2 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">
              Buat Kode Akses Tamu
            </button>
          </form>
        </Panel>
      </div>

      <div className="xl:col-span-2 space-y-4">
        <Panel title="Undangan Saya" icon={Ticket}>
          {myInvites.length === 0 ? (
            <Empty>Belum ada undangan tamu.</Empty>
          ) : (
            <ul className="space-y-2">
              {myInvites.map((inv) => (
                <li key={inv.id} className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono font-black text-base text-emerald-600 dark:text-emerald-400 tracking-widest">{inv.code}</p>
                    <p className="text-[11px] font-semibold truncate">{inv.guestName} {inv.plate && `· ${inv.plate}`}</p>
                    <p className="text-[10px] text-slate-500 capitalize">{formatDateLabel(inv.visitDate)}</p>
                  </div>
                  {inv.used ? (
                    <Pill tone="slate">TERPAKAI</Pill>
                  ) : (
                    <a
                      href={`https://wa.me/?text=${shareText(inv)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0"
                      aria-label="Bagikan via WhatsApp"
                    >
                      <Share2 className="w-4 h-4" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Riwayat Tamu ke Rumah Saya" icon={BookUser}>
          {myVisitors.length === 0 ? (
            <Empty>Belum ada tamu tercatat.</Empty>
          ) : (
            <ul className="space-y-1.5">
              {myVisitors.slice(0, 8).map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-2 text-xs p-2 rounded-lg bg-neutral-50 dark:bg-[#0B130E]">
                  <span className="truncate"><b>{g.name}</b> · {formatDateTime(g.inAt)}</span>
                  <Pill tone={GATE_TONE[g.status]}>{GATE_LABEL[g.status]}</Pill>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function GatePetugas({ state, update, officer }: { state: KeamananState; update: KeamananUpdater; officer: string }) {
  const [code, setCode] = React.useState("");
  const [kind, setKind] = React.useState<VisitorKind>("TAMU");
  const [name, setName] = React.useState("");
  const [plate, setPlate] = React.useState("");
  const [destination, setDestination] = React.useState("");
  const [purpose, setPurpose] = React.useState("");
  const [search, setSearch] = React.useState("");

  const inside = state.gateLogs.filter((g) => g.status === "DIIZINKAN" || g.status === "MENUNGGU_KONFIRMASI");
  const history = state.gateLogs.filter(
    (g) =>
      !search ||
      [g.name, g.plate, g.destinationBlock, g.purpose].some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  );
  const todayKey = toDateKey(new Date());
  const todayCount = state.gateLogs.filter((g) => toDateKey(new Date(g.inAt)) === todayKey).length;

  const plateWatch = findWatchlistByPlate(state, plate);

  const verifyWorker = (workerCode: string) => {
    const w = state.workers.find((x) => x.code.toUpperCase() === workerCode);
    if (!w) {
      toast.error("Kode kartu pekerja tidak ditemukan.");
      return;
    }
    const check = isWorkerAllowedNow(w);
    if (!check.ok) {
      toast.error(`Akses ${w.name} ditolak: ${check.reason}`);
      return;
    }
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
      officer,
    };
    update((s) => ({ ...s, gateLogs: [log, ...s.gateLogs] }));
    setCode("");
    toast.success(`Kartu pekerja valid: ${w.name} → ${w.houseBlock}.`);
  };

  const verifyCode = () => {
    if (code.trim().toUpperCase().startsWith("PK-")) {
      verifyWorker(code.trim().toUpperCase());
      return;
    }
    const inv = state.invites.find((i) => i.code.toUpperCase() === code.trim().toUpperCase());
    if (!inv) {
      toast.error("Kode tidak ditemukan. Catat manual & minta konfirmasi tuan rumah.");
      return;
    }
    if (inv.used) {
      toast.error("Kode sudah pernah dipakai.");
      return;
    }
    if (inv.visitDate !== todayKey) {
      toast.warning(`Kode ini untuk ${formatDateLabel(inv.visitDate)}, bukan hari ini.`);
      return;
    }
    const log: GateLog = {
      id: uid("gate"),
      kind: "TAMU",
      name: inv.guestName,
      plate: inv.plate,
      destinationBlock: inv.hostBlock,
      purpose: inv.note || `Tamu undangan ${inv.hostName}`,
      inAt: new Date().toISOString(),
      status: "DIIZINKAN",
      inviteCode: inv.code,
      officer,
    };
    update((s) => ({
      ...s,
      gateLogs: [log, ...s.gateLogs],
      invites: s.invites.map((i) => (i.id === inv.id ? { ...i, used: true } : i)),
    }));
    setCode("");
    toast.success(`Terverifikasi: ${inv.guestName} → ${inv.hostBlock}. Silakan masuk.`);
  };

  const registerManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !destination.trim()) {
      toast.error("Nama pengunjung & rumah tujuan wajib diisi.");
      return;
    }
    // Kurir & ojol biasanya cukup dicatat; tamu dan pekerja butuh izin tuan rumah.
    // A watchlisted plate always needs the host to confirm.
    const watch = findWatchlistByPlate(state, plate);
    const needsConfirmation = !!watch || kind === "TAMU" || kind === "PEKERJA";
    const log: GateLog = {
      id: uid("gate"),
      kind,
      name: name.trim(),
      plate: plate.trim().toUpperCase() || undefined,
      destinationBlock: destination.trim().toUpperCase(),
      purpose: purpose.trim() || VISITOR_KIND_LABEL[kind],
      inAt: new Date().toISOString(),
      status: needsConfirmation ? "MENUNGGU_KONFIRMASI" : "DIIZINKAN",
      officer,
    };
    update((s) => ({
      ...s,
      gateLogs: [log, ...s.gateLogs],
      watchlist: watch
        ? s.watchlist.map((w) => (w.id === watch.id ? { ...w, lastSeenAt: log.inAt, lastSeenLocation: "Gerbang utama" } : w))
        : s.watchlist,
    }));
    if (watch) {
      toast.error(`⚠️ Plat ${log.plate} ada di DAFTAR WASPADA (${watch.level})`, { description: watch.description, duration: 12000 });
    }
    setName("");
    setPlate("");
    setDestination("");
    setPurpose("");
    toast.success(needsConfirmation ? "Notifikasi konfirmasi dikirim ke tuan rumah." : "Pengunjung dicatat masuk.");
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
      <div className="xl:col-span-2 space-y-4">
        <Panel title="Verifikasi Kode Tamu / Pekerja" description="WG- untuk undangan tamu, PK- untuk kartu pekerja." icon={Ticket}>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && verifyCode()}
              placeholder="WG-XXXX / PK-XXXX"
              className={`${inputClass} font-mono uppercase tracking-widest`}
            />
            <button onClick={verifyCode} className="min-h-[40px] px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold shrink-0">
              Cek
            </button>
          </div>
        </Panel>

        <Panel title="Catat Pengunjung Masuk" icon={DoorOpen}>
          <form onSubmit={registerManual} className="space-y-3">
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(VISITOR_KIND_LABEL) as VisitorKind[]).map((k) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => setKind(k)}
                  className={`min-h-[36px] rounded-lg text-[11px] font-bold border ${
                    kind === k ? "bg-emerald-600 text-white border-emerald-600" : "border-neutral-200 dark:border-neutral-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {VISITOR_KIND_LABEL[k]}
                </button>
              ))}
            </div>
            <Field label="Nama pengunjung">
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Sesuai KTP / nama kurir" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Plat nomor">
                <input value={plate} onChange={(e) => setPlate(e.target.value)} className={inputClass} placeholder="B 1234 ABC" />
              </Field>
              <Field label="Rumah tujuan">
                <input value={destination} onChange={(e) => setDestination(e.target.value)} className={inputClass} placeholder="A-01" />
              </Field>
            </div>
            {plateWatch && (
              <div className="p-3 rounded-xl bg-red-600 text-white text-xs space-y-0.5 animate-pulse">
                <p className="font-black">⚠️ PLAT ADA DI DAFTAR WASPADA ({plateWatch.level})</p>
                <p>{plateWatch.label}: {plateWatch.description}</p>
              </div>
            )}
            <Field label="Keperluan">
              <input value={purpose} onChange={(e) => setPurpose(e.target.value)} className={inputClass} placeholder="Antar paket, service, silaturahmi..." />
            </Field>
            <p className="text-[10px] text-slate-500">Tips: foto KTP / wajah tamu dapat ditautkan ke log (integrasi kamera gerbang).</p>
            <button type="submit" className="w-full min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">
              Catat Masuk
            </button>
          </form>
        </Panel>
      </div>

      <div className="xl:col-span-3 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="Di dalam kawasan" value={inside.filter((g) => g.status === "DIIZINKAN").length} />
          <MiniStat label="Menunggu konfirmasi" value={inside.filter((g) => g.status === "MENUNGGU_KONFIRMASI").length} />
          <MiniStat label="Kunjungan hari ini" value={todayCount} />
        </div>

        <Panel title="Pengunjung di Dalam Kawasan" icon={DoorOpen}>
          {inside.length === 0 ? (
            <Empty>Tidak ada pengunjung di dalam.</Empty>
          ) : (
            <ul className="space-y-2">
              {inside.map((g) => {
                const hours = (Date.now() - new Date(g.inAt).getTime()) / 3_600_000;
                return (
                  <li key={g.id} className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 text-xs">
                      <p className="font-bold">
                        {g.name} <span className="font-normal text-slate-500">· {VISITOR_KIND_LABEL[g.kind]}</span>
                        {g.inviteCode && <span className="ml-1 font-mono text-[10px] text-emerald-600">{g.inviteCode}</span>}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        → {g.destinationBlock} · {g.plate || "tanpa kendaraan"} · masuk {formatTime(g.inAt)}
                        {hours >= OVERSTAY_HOURS && <span className="text-red-600 font-bold"> · lewat 1x24 jam, wajib lapor RT</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Pill tone={GATE_TONE[g.status]}>{GATE_LABEL[g.status]}</Pill>
                      {g.status === "DIIZINKAN" && (
                        <button
                          onClick={() => { setGateStatus(update, g.id, "KELUAR"); toast.success("Tercatat keluar."); }}
                          className="h-8 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-[11px] font-bold flex items-center gap-1"
                        >
                          <LogOut className="w-3.5 h-3.5" /> Keluar
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          title="Buku Tamu Digital"
          description="Seluruh log keluar-masuk gerbang."
          icon={BookUser}
          action={
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama/plat/blok" className={`${inputClass} pl-8 w-44`} />
            </div>
          }
        >
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-[11px] min-w-[560px]">
              <thead>
                <tr className="text-left text-slate-500 border-b border-neutral-200 dark:border-neutral-800">
                  <th className="py-2 px-1">Masuk</th>
                  <th className="px-1">Nama</th>
                  <th className="px-1">Jenis</th>
                  <th className="px-1">Plat</th>
                  <th className="px-1">Tujuan</th>
                  <th className="px-1">Keluar</th>
                  <th className="px-1">Petugas</th>
                </tr>
              </thead>
              <tbody>
                {history.map((g) => (
                  <tr key={g.id} className="border-b border-neutral-100 dark:border-neutral-800/60">
                    <td className="py-2 px-1 whitespace-nowrap">{formatDateTime(g.inAt)}</td>
                    <td className="px-1 font-semibold">{g.name}</td>
                    <td className="px-1">{VISITOR_KIND_LABEL[g.kind]}</td>
                    <td className="px-1 font-mono">{g.plate || "-"}</td>
                    <td className="px-1">{g.destinationBlock}</td>
                    <td className="px-1 whitespace-nowrap">{g.status === "DITOLAK" ? <Pill tone="red">DITOLAK</Pill> : formatTime(g.outAt)}</td>
                    <td className="px-1">{g.officer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] p-3">
      <p className="text-[10px] font-semibold text-slate-500">{label}</p>
      <p className="text-lg font-black text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}
