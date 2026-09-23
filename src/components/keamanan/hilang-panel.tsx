"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Share2, CheckCircle2, Phone, Search } from "lucide-react";
import {
  KeamananState,
  KeamananUpdater,
  LOST_FOUND_CATEGORY_META,
  LostFoundCategory,
  LostFoundItem,
  LostFoundType,
} from "@/lib/keamanan/types";
import { formatRupiah, timeAgo, uid } from "@/lib/keamanan/store";
import { LocationPicker, LatLng } from "./location-picker";
import { Empty, Field, Panel, PhotoInput, Pill, Segmented, SecurityUser, ghostBtn, inputClass, primaryBtn, waLink } from "./ui";

export function HilangPanel({
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
  const [tab, setTab] = React.useState<"AKTIF" | "SELESAI">("AKTIF");
  const [typeFilter, setTypeFilter] = React.useState<"SEMUA" | LostFoundType>("SEMUA");
  const [search, setSearch] = React.useState("");
  const [showForm, setShowForm] = React.useState(false);

  const urgent = state.lostFound.filter(
    (l) => l.status === "AKTIF" && l.type === "HILANG" && LOST_FOUND_CATEGORY_META[l.category].urgent
  );

  const listed = state.lostFound
    .filter((l) => l.status === tab)
    .filter((l) => typeFilter === "SEMUA" || l.type === typeFilter)
    .filter((l) => !search.trim() || [l.title, l.description, l.lastSeenLocation].some((v) => v.toLowerCase().includes(search.toLowerCase())));

  const resolve = (item: LostFoundItem) => {
    update((s) => ({
      ...s,
      lostFound: s.lostFound.map((l) => (l.id === item.id ? { ...l, status: "SELESAI", resolvedAt: new Date().toISOString() } : l)),
    }));
    toast.success(item.type === "HILANG" ? "Alhamdulillah, sudah ketemu! 🎉" : "Barang sudah dikembalikan ke pemilik.");
  };

  const shareText = (l: LostFoundItem) =>
    `${l.type === "HILANG" ? "🔎 DICARI" : "📦 DITEMUKAN"}: ${l.title}\n${l.description}\nLokasi: ${l.lastSeenLocation}${
      l.reward ? `\nImbalan: ${formatRupiah(l.reward)}` : ""
    }\nHubungi: ${l.contactName} (${l.contactPhone})`;

  return (
    <div className="space-y-4">
      {urgent.length > 0 && (
        <div className="rounded-2xl bg-fuchsia-600 text-white p-4 space-y-2 shadow-lg shadow-fuchsia-600/25">
          <p className="text-xs font-black tracking-wide">🚨 DICARI SEGERA</p>
          {urgent.map((u) => (
            <div key={u.id} className="flex items-center gap-3">
              {u.photoUrl && <img src={u.photoUrl} alt="" className="w-12 h-12 rounded-xl object-cover border-2 border-white/60" />}
              <div className="min-w-0 flex-1 text-xs">
                <p className="font-extrabold">{LOST_FOUND_CATEGORY_META[u.category].emoji} {u.title}</p>
                <p className="opacity-90 truncate">Terakhir di {u.lastSeenLocation} · {timeAgo(u.createdAt)}</p>
              </div>
              <a href={`tel:${u.contactPhone}`} className="shrink-0 min-h-[40px] px-3 rounded-xl bg-white text-fuchsia-700 text-[11px] font-black flex items-center">
                Saya lihat
              </a>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari barang, hewan, lokasi..." className={`${inputClass} pl-9`} />
        </div>
        <Segmented
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: "SEMUA", label: "Semua" },
            { value: "HILANG", label: "Hilang" },
            { value: "DITEMUKAN", label: "Ditemukan" },
          ]}
        />
        <button onClick={() => setShowForm((v) => !v)} className={`${primaryBtn} flex items-center justify-center gap-1.5`}>
          <Plus className="w-4 h-4" /> Buat Info
        </button>
      </div>

      {showForm && <LostFoundForm update={update} user={user} onDone={() => setShowForm(false)} />}

      <Segmented
        value={tab}
        onChange={setTab}
        className="w-full sm:w-72"
        options={[
          { value: "AKTIF", label: `Aktif (${state.lostFound.filter((l) => l.status === "AKTIF").length})` },
          { value: "SELESAI", label: "Selesai" },
        ]}
      />

      {listed.length === 0 ? (
        <Empty>Belum ada info.</Empty>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3">
          {listed.map((l) => {
            const meta = LOST_FOUND_CATEGORY_META[l.category];
            const canResolve = isPetugas || l.contactName === user.name;
            return (
              <li key={l.id} className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] overflow-hidden flex flex-col">
                <div className="relative aspect-[16/9] bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-5xl">
                  {l.photoUrl ? <img src={l.photoUrl} alt="" className="absolute inset-0 w-full h-full object-cover" /> : meta.emoji}
                  <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black text-white ${l.type === "HILANG" ? "bg-violet-600" : "bg-sky-600"}`}>
                    {l.type}
                  </span>
                  {l.reward ? (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-900">
                      🎁 {formatRupiah(l.reward)}
                    </span>
                  ) : null}
                </div>
                <div className="p-3.5 space-y-1 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Pill tone="slate">{meta.label}</Pill>
                    <span className="text-[10px] text-slate-500">{timeAgo(l.createdAt)}</span>
                  </div>
                  <p className="text-sm font-extrabold">{l.title}</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-3">{l.description}</p>
                  <p className="text-[11px] text-slate-500">📍 {l.lastSeenLocation}</p>
                  <p className="text-[11px] text-slate-500">👤 {l.contactName}{l.houseBlock ? ` (${l.houseBlock})` : ""}</p>
                </div>
                {l.status === "AKTIF" && (
                  <div className="grid grid-cols-3 border-t border-neutral-100 dark:border-neutral-800 text-[11px] font-bold">
                    <a href={`tel:${l.contactPhone}`} className="min-h-[42px] flex items-center justify-center gap-1 text-emerald-700 dark:text-emerald-400">
                      <Phone className="w-3.5 h-3.5" /> Hubungi
                    </a>
                    <a href={waLink(shareText(l))} target="_blank" rel="noopener noreferrer" className="min-h-[42px] flex items-center justify-center gap-1 border-x border-neutral-100 dark:border-neutral-800">
                      <Share2 className="w-3.5 h-3.5" /> Sebar
                    </a>
                    {canResolve ? (
                      <button onClick={() => resolve(l)} className="min-h-[42px] flex items-center justify-center gap-1 text-slate-600 dark:text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
                      </button>
                    ) : (
                      <span className="min-h-[42px]" />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function LostFoundForm({ update, user, onDone }: { update: KeamananUpdater; user: SecurityUser; onDone: () => void }) {
  const [type, setType] = React.useState<LostFoundType>("HILANG");
  const [category, setCategory] = React.useState<LostFoundCategory>("BARANG");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [reward, setReward] = React.useState("");
  const [photoUrl, setPhotoUrl] = React.useState<string>();
  const [point, setPoint] = React.useState<LatLng | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !location.trim()) {
      toast.error("Judul, ciri-ciri, dan lokasi wajib diisi.");
      return;
    }
    const item: LostFoundItem = {
      id: uid("lf"),
      type,
      category,
      title: title.trim(),
      description: description.trim(),
      photoUrl,
      lastSeenLocation: location.trim(),
      lat: point?.lat,
      lng: point?.lng,
      contactName: user.name,
      contactPhone: user.phone,
      houseBlock: user.houseBlock,
      reward: type === "HILANG" && Number(reward) > 0 ? Number(reward) : undefined,
      status: "AKTIF",
      createdAt: new Date().toISOString(),
    };
    update((s) => ({ ...s, lostFound: [item, ...s.lostFound] }));
    toast.success(LOST_FOUND_CATEGORY_META[category].urgent ? "Info disebar ke seluruh warga & petugas SEKARANG." : "Info dipublikasikan.");
    onDone();
  };

  return (
    <Panel title="Buat Info Hilang / Ditemukan">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Segmented value={type} onChange={setType} options={[{ value: "HILANG", label: "🔎 Saya kehilangan" }, { value: "DITEMUKAN", label: "📦 Saya menemukan" }]} />
        <div className="flex gap-1.5 overflow-x-auto">
          {(Object.keys(LOST_FOUND_CATEGORY_META) as LostFoundCategory[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`shrink-0 min-h-[36px] px-2.5 rounded-xl text-[11px] font-bold border ${
                category === c ? "bg-violet-600 text-white border-violet-600" : "border-neutral-200 dark:border-neutral-800"
              }`}
            >
              {LOST_FOUND_CATEGORY_META[c].emoji} {LOST_FOUND_CATEGORY_META[c].label}
            </button>
          ))}
        </div>
        <Field label="Judul">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="mis. Anak laki-laki 6 th, baju merah" />
        </Field>
        <Field label="Lokasi terakhir / ditemukan">
          <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} placeholder="mis. Taman Blok B" />
        </Field>
        <Field label="Ciri-ciri">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass} />
        </Field>
        <div className="space-y-3">
          <PhotoInput value={photoUrl} onChange={setPhotoUrl} />
          {type === "HILANG" && (
            <Field label="Imbalan (opsional)">
              <input type="number" min={0} inputMode="numeric" value={reward} onChange={(e) => setReward(e.target.value)} className={inputClass} placeholder="0" />
            </Field>
          )}
        </div>
        <div className="md:col-span-2">
          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Titik di peta</p>
          <LocationPicker value={point} onChange={setPoint} />
        </div>
        <div className="md:col-span-2 flex gap-2 justify-end">
          <button type="button" onClick={onDone} className={ghostBtn}>Batal</button>
          <button type="submit" className={primaryBtn}>Publikasikan</button>
        </div>
      </form>
    </Panel>
  );
}
