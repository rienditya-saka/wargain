"use client";

import * as React from "react";
import { toast } from "sonner";
import { Home, ClipboardCheck, House } from "lucide-react";
import { HouseWatch, KeamananState, KeamananUpdater } from "@/lib/keamanan/types";
import { formatDateLabel, formatDateTime, toDateKey, uid } from "@/lib/keamanan/store";
import { Empty, Field, Panel, Pill, SecurityUser, inputClass } from "./ui";

export function TitipRumahPanel({
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
  const today = toDateKey(new Date());
  const [from, setFrom] = React.useState(today);
  const [to, setTo] = React.useState(today);
  const [note, setNote] = React.useState("");
  const [checkNotes, setCheckNotes] = React.useState<Record<string, string>>({});

  const active = state.houseWatches.filter((w) => w.to >= today);
  const listed = isPetugas ? active : state.houseWatches.filter((w) => w.houseBlock === user.houseBlock);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (to < from) {
      toast.error("Tanggal kembali harus setelah tanggal pergi.");
      return;
    }
    const house = state.houses.find((h) => h.blockNumber.toUpperCase() === user.houseBlock.toUpperCase());
    const watch: HouseWatch = {
      id: uid("hw"),
      lat: house?.lat,
      lng: house?.lng,
      houseBlock: user.houseBlock,
      ownerName: user.name,
      contact: user.phone,
      from,
      to,
      note: note.trim(),
      checks: [],
    };
    update((s) => ({ ...s, houseWatches: [watch, ...s.houseWatches] }));
    setNote("");
    toast.success("Rumah Anda masuk daftar patroli ekstra selama ditinggal.");
  };

  const addCheck = (watch: HouseWatch) => {
    const text = checkNotes[watch.id]?.trim() || "Kondisi aman";
    update((s) => ({
      ...s,
      houseWatches: s.houseWatches.map((w) =>
        w.id === watch.id ? { ...w, checks: [{ at: new Date().toISOString(), by: user.name, note: text }, ...w.checks] } : w
      ),
    }));
    setCheckNotes((c) => ({ ...c, [watch.id]: "" }));
    toast.success(`Pengecekan ${watch.houseBlock} tercatat, pemilik mendapat notifikasi.`);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
      {!isPetugas && (
        <div className="xl:col-span-2">
          <Panel title="Titip Rumah (Mudik / Dinas)" description="Rumah kosong? Petugas akan cek berkala & kirim laporan ke HP Anda." icon={Home}>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Pergi">
                  <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
                </Field>
                <Field label="Kembali">
                  <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
                </Field>
              </div>
              <Field label="Catatan untuk petugas">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className={inputClass}
                  placeholder="mis. Lampu teras nyala otomatis, ada kucing di garasi, kunci cadangan di Pak RT"
                />
              </Field>
              <button type="submit" className="w-full min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">
                Ajukan Titip Rumah
              </button>
            </form>
          </Panel>
        </div>
      )}

      <div className={`${isPetugas ? "xl:col-span-5" : "xl:col-span-3"} space-y-4`}>
        {isPetugas && <EmptyHousesPanel state={state} />}
        <Panel
          title={isPetugas ? `Rumah Dititipkan (${active.length} aktif)` : "Status Titip Rumah Saya"}
          description={isPetugas ? "Masukkan ke rute patroli & catat tiap pengecekan." : undefined}
          icon={ClipboardCheck}
        >
          {listed.length === 0 ? (
            <Empty>{isPetugas ? "Tidak ada rumah yang dititipkan." : "Belum ada pengajuan titip rumah."}</Empty>
          ) : (
            <ul className={`grid gap-3 ${isPetugas ? "md:grid-cols-2" : ""}`}>
              {listed.map((w) => {
                const running = w.from <= today && w.to >= today;
                return (
                  <li key={w.id} className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-black">{w.houseBlock} <span className="text-xs font-semibold text-slate-500">· {w.ownerName}</span></p>
                      <Pill tone={running ? "emerald" : w.to < today ? "slate" : "blue"}>
                        {running ? "SEDANG DITINGGAL" : w.to < today ? "SELESAI" : "TERJADWAL"}
                      </Pill>
                    </div>
                    <p className="text-[11px] text-slate-500 capitalize">{formatDateLabel(w.from)} → {formatDateLabel(w.to)}</p>
                    {w.note && <p className="text-xs text-slate-700 dark:text-slate-300">{w.note}</p>}
                    {isPetugas && <a href={`tel:${w.contact}`} className="text-[11px] font-bold text-emerald-600">📞 {w.contact}</a>}

                    <div className="pt-1 space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Log pengecekan ({w.checks.length})</p>
                      {w.checks.length === 0 ? (
                        <p className="text-[11px] text-slate-400">Belum dicek.</p>
                      ) : (
                        w.checks.slice(0, 3).map((c, i) => (
                          <p key={i} className="text-[11px]">
                            <span className="text-slate-500">{formatDateTime(c.at)}</span> · <b>{c.by}</b>: {c.note}
                          </p>
                        ))
                      )}
                    </div>

                    {isPetugas && running && (
                      <div className="flex gap-2 pt-1">
                        <input
                          value={checkNotes[w.id] ?? ""}
                          onChange={(e) => setCheckNotes((c) => ({ ...c, [w.id]: e.target.value }))}
                          placeholder="Kondisi aman / pagar terbuka / ..."
                          className={inputClass}
                        />
                        <button onClick={() => addCheck(w)} className="min-h-[40px] px-3 rounded-xl bg-emerald-600 text-white text-[11px] font-bold shrink-0">
                          Catat cek
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function EmptyHousesPanel({ state }: { state: KeamananState }) {
  const empty = state.houses.filter((h) => h.occupancyStatus === "KOSONG");
  const renovating = state.houses.filter((h) => h.occupancyStatus === "RENOVASI");
  const all = [...empty, ...renovating];
  return (
    <Panel
      title={`Rumah Kosong & Renovasi (${all.length})`}
      description="Dari Data Kependudukan. Rumah tanpa penghuni rawan dibobol: masukkan ke rute patroli & tampil di peta."
      icon={House}
    >
      {all.length === 0 ? (
        <Empty>Tidak ada rumah kosong tercatat.</Empty>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {all.map((h) => (
            <li key={h.id} className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs">
              <div className="flex items-center justify-between gap-1">
                <span className="font-black">{h.blockNumber}</span>
                <Pill tone={h.occupancyStatus === "KOSONG" ? "slate" : "amber"}>{h.occupancyStatus}</Pill>
              </div>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">Pemilik: {h.ownerName}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
