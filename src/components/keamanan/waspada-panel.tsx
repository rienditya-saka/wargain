"use client";

import * as React from "react";
import { toast } from "sonner";
import { ShieldAlert, Plus, Eye, Search, Share2, Archive } from "lucide-react";
import { KeamananState, KeamananUpdater, WatchKind, WatchLevel, WatchlistEntry } from "@/lib/keamanan/types";
import { getCurrentPosition, timeAgo, uid } from "@/lib/keamanan/store";
import { normalizePlate, plateKey } from "@/lib/keamanan/plate";
import { LocationPicker, LatLng } from "./location-picker";
import { Empty, Field, Panel, PhotoInput, Pill, Segmented, SecurityUser, ghostBtn, inputClass, primaryBtn, waLink } from "./ui";

export function findWatchlistByPlate(state: KeamananState, plate?: string) {
  const key = plateKey(plate);
  if (!key) return undefined;
  return state.watchlist.find((w) => w.active && w.plate && plateKey(w.plate) === key);
}

export function WaspadaPanel({
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
  const [filter, setFilter] = React.useState<"SEMUA" | WatchKind>("SEMUA");
  const [search, setSearch] = React.useState("");
  const [showForm, setShowForm] = React.useState(false);
  const [showArchived, setShowArchived] = React.useState(false);

  const listed = state.watchlist
    .filter((w) => (showArchived ? !w.active : w.active))
    .filter((w) => filter === "SEMUA" || w.kind === filter)
    .filter((w) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return [w.label, w.plate, w.description, w.lastSeenLocation].some((v) => v?.toLowerCase().includes(q)) ||
        (w.plate && plateKey(w.plate).includes(plateKey(search)));
    })
    .sort((a, b) => (a.level === b.level ? (b.lastSeenAt ?? b.createdAt).localeCompare(a.lastSeenAt ?? a.createdAt) : a.level === "BAHAYA" ? -1 : 1));

  const markSeen = async (w: WatchlistEntry) => {
    const pos = await getCurrentPosition(6000);
    const location = window.prompt("Terlihat di mana?", w.lastSeenLocation ?? "") ?? w.lastSeenLocation;
    update((s) => ({
      ...s,
      watchlist: s.watchlist.map((x) =>
        x.id === w.id
          ? { ...x, lastSeenAt: new Date().toISOString(), lastSeenLocation: location || x.lastSeenLocation, lat: pos?.lat ?? x.lat, lng: pos?.lng ?? x.lng }
          : x
      ),
    }));
    toast.warning("Penampakan dicatat. Petugas & warga lain melihat update ini.");
  };

  const archive = (w: WatchlistEntry) => {
    update((s) => ({ ...s, watchlist: s.watchlist.map((x) => (x.id === w.id ? { ...x, active: !x.active } : x)) }));
    toast.success(w.active ? "Dipindah ke arsip." : "Diaktifkan kembali.");
  };

  const shareText = (w: WatchlistEntry) =>
    `⚠️ INFO WASPADA ${w.level === "BAHAYA" ? "(BAHAYA)" : ""}\n${w.label}${w.plate ? `\nPlat: ${w.plate}` : ""}\n${w.description}${
      w.lastSeenLocation ? `\nTerakhir terlihat: ${w.lastSeenLocation}` : ""
    }\nJika melihat, segera hubungi pos satpam.`;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-800 dark:text-amber-300 flex gap-2.5">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Daftar orang/kendaraan yang perlu diwaspadai. <b>Plat nomor di sini otomatis memicu alarm</b> saat terbaca di gerbang (ANPR/manual).
          Isi berdasarkan fakta, jangan menuduh tanpa bukti.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari plat, ciri, lokasi..." className={`${inputClass} pl-9`} />
        </div>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "SEMUA", label: "Semua" },
            { value: "ORANG", label: "🕵️ Orang" },
            { value: "KENDARAAN", label: "🚘 Kendaraan" },
          ]}
        />
        <button onClick={() => setShowForm((v) => !v)} className={`${primaryBtn} flex items-center justify-center gap-1.5`}>
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      {showForm && <WatchForm update={update} user={user} onDone={() => setShowForm(false)} />}

      {listed.length === 0 ? (
        <Empty>{showArchived ? "Arsip kosong." : "Tidak ada entri waspada aktif."}</Empty>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
          {listed.map((w) => (
            <li
              key={w.id}
              className={`rounded-2xl border bg-white dark:bg-[#131F17] overflow-hidden flex flex-col ${
                w.level === "BAHAYA" ? "border-red-500/60" : "border-neutral-200/80 dark:border-neutral-800/80"
              }`}
            >
              <div className="flex gap-3 p-3.5">
                <div className="w-16 h-16 rounded-xl bg-neutral-100 dark:bg-neutral-900 overflow-hidden shrink-0 flex items-center justify-center text-2xl">
                  {w.photoUrl ? <img src={w.photoUrl} alt="" className="w-full h-full object-cover" /> : w.kind === "KENDARAAN" ? "🚘" : "🕵️"}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-extrabold leading-snug">{w.label}</p>
                    <Pill tone={w.level === "BAHAYA" ? "red" : "amber"}>{w.level}</Pill>
                  </div>
                  {w.plate && <p className="font-mono text-sm font-black tracking-wider">{w.plate}</p>}
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-3">{w.description}</p>
                </div>
              </div>
              <div className="px-3.5 pb-3 text-[10px] text-slate-500 space-y-0.5">
                {w.lastSeenAt && (
                  <p>
                    👁️ Terlihat {timeAgo(w.lastSeenAt)}
                    {w.lastSeenLocation && ` · ${w.lastSeenLocation}`}
                  </p>
                )}
                <p>Dilaporkan oleh {w.reportedBy}</p>
              </div>
              <div className="mt-auto grid grid-cols-3 border-t border-neutral-100 dark:border-neutral-800 text-[11px] font-bold">
                <button onClick={() => markSeen(w)} className="min-h-[42px] flex items-center justify-center gap-1 text-amber-700 dark:text-amber-400 hover:bg-amber-500/5">
                  <Eye className="w-3.5 h-3.5" /> Saya lihat
                </button>
                <a href={waLink(shareText(w))} target="_blank" rel="noopener noreferrer" className="min-h-[42px] flex items-center justify-center gap-1 border-x border-neutral-100 dark:border-neutral-800 hover:bg-emerald-500/5 text-emerald-700 dark:text-emerald-400">
                  <Share2 className="w-3.5 h-3.5" /> Sebar
                </a>
                {isPetugas ? (
                  <button onClick={() => archive(w)} className="min-h-[42px] flex items-center justify-center gap-1 text-slate-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <Archive className="w-3.5 h-3.5" /> {w.active ? "Arsip" : "Aktifkan"}
                  </button>
                ) : (
                  <a href="tel:081200001111" className="min-h-[42px] flex items-center justify-center text-slate-500">📞 Satpam</a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {isPetugas && (
        <button onClick={() => setShowArchived((v) => !v)} className={`${ghostBtn} w-full sm:w-auto`}>
          {showArchived ? "Kembali ke daftar aktif" : `Lihat arsip (${state.watchlist.filter((w) => !w.active).length})`}
        </button>
      )}
    </div>
  );
}

function WatchForm({ update, user, onDone }: { update: KeamananUpdater; user: SecurityUser; onDone: () => void }) {
  const [kind, setKind] = React.useState<WatchKind>("KENDARAAN");
  const [level, setLevel] = React.useState<WatchLevel>("WASPADA");
  const [label, setLabel] = React.useState("");
  const [plate, setPlate] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [lastSeenLocation, setLastSeenLocation] = React.useState("");
  const [photoUrl, setPhotoUrl] = React.useState<string>();
  const [point, setPoint] = React.useState<LatLng | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !description.trim()) {
      toast.error("Ciri singkat & keterangan wajib diisi.");
      return;
    }
    const now = new Date().toISOString();
    const entry: WatchlistEntry = {
      id: uid("watch"),
      kind,
      level,
      label: label.trim(),
      plate: kind === "KENDARAAN" && plate.trim() ? normalizePlate(plate) : undefined,
      description: description.trim(),
      photoUrl,
      lastSeenAt: now,
      lastSeenLocation: lastSeenLocation.trim() || undefined,
      lat: point?.lat,
      lng: point?.lng,
      reportedBy: `${user.name} (${user.houseBlock})`,
      active: true,
      createdAt: now,
    };
    update((s) => ({ ...s, watchlist: [entry, ...s.watchlist] }));
    toast.success("Ditambahkan ke daftar waspada.");
    onDone();
  };

  return (
    <Panel title="Tambah Daftar Waspada">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Segmented value={kind} onChange={setKind} options={[{ value: "KENDARAAN", label: "🚘 Kendaraan" }, { value: "ORANG", label: "🕵️ Orang" }]} />
        <Segmented value={level} onChange={setLevel} options={[{ value: "WASPADA", label: "Waspada" }, { value: "BAHAYA", label: "⚠️ Bahaya" }]} />
        <Field label={kind === "KENDARAAN" ? "Jenis & warna kendaraan" : "Ciri singkat orang"}>
          <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputClass} placeholder={kind === "KENDARAAN" ? "mis. Motor Beat merah" : "mis. Pria kurus, topi hitam"} />
        </Field>
        {kind === "KENDARAAN" && (
          <Field label="Plat nomor (jika terlihat)">
            <input value={plate} onChange={(e) => setPlate(e.target.value)} className={`${inputClass} font-mono uppercase`} placeholder="B 1234 XYZ" />
          </Field>
        )}
        <Field label="Keterangan / kejadian">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass} placeholder="Apa yang dilakukan, jam berapa, arah pergi..." />
        </Field>
        <div className="space-y-3">
          <Field label="Terakhir terlihat di">
            <input value={lastSeenLocation} onChange={(e) => setLastSeenLocation(e.target.value)} className={inputClass} placeholder="mis. Depan Blok G" />
          </Field>
          <PhotoInput value={photoUrl} onChange={setPhotoUrl} label="Foto" />
        </div>
        <div className="md:col-span-2">
          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Titik di peta</p>
          <LocationPicker value={point} onChange={setPoint} />
        </div>
        <div className="md:col-span-2 flex gap-2 justify-end">
          <button type="button" onClick={onDone} className={ghostBtn}>Batal</button>
          <button type="submit" className={primaryBtn}>Simpan</button>
        </div>
      </form>
    </Panel>
  );
}
