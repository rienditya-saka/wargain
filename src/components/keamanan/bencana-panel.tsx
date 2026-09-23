"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Tent, Siren, HeartHandshake, Plus, Users, Phone, PackageOpen } from "lucide-react";
import {
  DISASTER_POST_META,
  DisasterPost,
  DisasterPostType,
  KeamananState,
  KeamananUpdater,
  SafetyCheckin,
} from "@/lib/keamanan/types";
import { getCurrentPosition, timeAgo, uid } from "@/lib/keamanan/store";
import { disasterMarkers, safetyCheckinMarkers, vulnerableMarkers } from "./map-layers";
import { LocationPicker, LatLng } from "./location-picker";
import { Empty, Field, Panel, Pill, SecurityUser, StatCard, ghostBtn, inputClass, primaryBtn } from "./ui";

const SecurityLeafletMap = dynamic(
  () => import("./security-leaflet-map").then((m) => m.SecurityLeafletMap),
  { ssr: false, loading: () => <div className="h-[320px] rounded-2xl bg-neutral-100 dark:bg-neutral-900 animate-pulse" /> }
);

const DISASTER_PRESETS = ["Banjir", "Kebakaran Besar", "Gempa Bumi", "Angin Puting Beliung", "Tanah Longsor"];

export function DisasterBanner({ state, onOpen }: { state: KeamananState; onOpen: () => void }) {
  if (!state.settings.disasterActive) return null;
  return (
    <button onClick={onOpen} className="w-full text-left rounded-2xl bg-blue-700 text-white p-3.5 flex items-center gap-3 shadow-lg shadow-blue-700/30">
      <Siren className="w-6 h-6 shrink-0 animate-pulse" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-black">MODE SIAGA BENCANA: {state.settings.disasterTitle ?? "Aktif"}</p>
        <p className="text-[11px] opacity-90">Laporkan kondisi keluarga Anda & lihat posko terdekat.</p>
      </div>
      <span className="text-[11px] font-black bg-white text-blue-700 px-3 py-1.5 rounded-lg shrink-0">Buka</span>
    </button>
  );
}

export function BencanaPanel({
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
  const { settings } = state;
  const since = settings.disasterStartedAt;
  const eventCheckins = React.useMemo(
    () => state.safetyCheckins.filter((c) => !since || c.createdAt >= since),
    [state.safetyCheckins, since]
  );
  const latestByBlock = React.useMemo(() => {
    const m = new Map<string, SafetyCheckin>();
    eventCheckins.forEach((c) => {
      const prev = m.get(c.houseBlock);
      if (!prev || prev.createdAt < c.createdAt) m.set(c.houseBlock, c);
    });
    return m;
  }, [eventCheckins]);

  const needHelp = Array.from(latestByBlock.values()).filter((c) => c.status === "BUTUH_BANTUAN");
  const safeCount = Array.from(latestByBlock.values()).filter((c) => c.status === "AMAN").length;
  const occupiedHouses = state.houses.filter((h) => !["KOSONG", "RENOVASI"].includes(h.occupancyStatus)).length;
  const vulnerableUnchecked = state.vulnerable.filter((v) => !latestByBlock.has(v.blockNumber));
  const myCheckin = latestByBlock.get(user.houseBlock);

  const markers = React.useMemo(
    () => [...disasterMarkers(state), ...(isPetugas ? [...vulnerableMarkers(state), ...safetyCheckinMarkers(state, since)] : [])],
    [state, isPetugas, since]
  );

  return (
    <div className="space-y-4">
      {isPetugas && <DisasterModeControl state={state} update={update} />}

      {settings.disasterActive && !isPetugas && <SafetyCheckinCard update={update} user={user} current={myCheckin} />}

      {isPetugas && settings.disasterActive && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatCard label="Lapor aman" value={safeCount} tone="text-emerald-600" />
          <StatCard label="Butuh bantuan" value={needHelp.length} tone={needHelp.length ? "text-red-600" : undefined} />
          <StatCard label="Belum lapor" value={Math.max(0, occupiedHouses - latestByBlock.size)} tone="text-amber-600" />
          <StatCard label="Pengungsi di posko" value={state.disasterPosts.reduce((n, p) => n + p.occupants, 0)} />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3 space-y-4">
          <SecurityLeafletMap extraMarkers={markers} showLegend={false} className="h-[45vh] min-h-[300px] md:h-[420px]" />

          {isPetugas && settings.disasterActive && (
            <Panel title="Butuh Bantuan / Evakuasi" icon={HeartHandshake} className={needHelp.length ? "border-red-500/60" : ""}>
              {needHelp.length === 0 ? (
                <Empty>Belum ada permintaan bantuan.</Empty>
              ) : (
                <ul className="space-y-2">
                  {needHelp.map((c) => (
                    <li key={c.id} className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between gap-2">
                      <div className="min-w-0 text-xs">
                        <p className="font-extrabold">{c.name} · {c.houseBlock} · {c.peopleCount} orang</p>
                        <p className="text-slate-600 dark:text-slate-300 truncate">{c.note || "Tanpa keterangan"} · {timeAgo(c.createdAt)}</p>
                      </div>
                      <a href={`tel:${c.phone}`} className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0" aria-label="Telepon">
                        <Phone className="w-4 h-4" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          {isPetugas && (
            <Panel title="Warga Rentan (Prioritas Evakuasi)" description="Diambil dari Data Kependudukan: lansia, balita, disabilitas." icon={Users}>
              {state.vulnerable.length === 0 ? (
                <Empty>Belum ada data warga rentan dengan titik lokasi.</Empty>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {state.vulnerable.map((v) => {
                    const checked = latestByBlock.get(v.blockNumber);
                    return (
                      <li key={v.id} className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <p className="font-bold truncate">{v.headName}</p>
                          <p className="text-[10px] text-slate-500">{v.blockNumber} · {v.socialCategory}</p>
                        </div>
                        {settings.disasterActive ? (
                          checked ? (
                            <Pill tone={checked.status === "AMAN" ? "emerald" : "red"}>{checked.status === "AMAN" ? "AMAN" : "BANTU"}</Pill>
                          ) : (
                            <a href={`tel:${v.phone ?? ""}`} className="h-8 px-2.5 rounded-lg bg-amber-500 text-white text-[10px] font-black flex items-center">Cek</a>
                          )
                        ) : (
                          <Pill tone="slate">{v.socialCategory}</Pill>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {settings.disasterActive && vulnerableUnchecked.length > 0 && (
                <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">{vulnerableUnchecked.length} warga rentan belum melapor, hubungi segera.</p>
              )}
            </Panel>
          )}
        </div>

        <div className="xl:col-span-2">
          <PostList state={state} update={update} isPetugas={isPetugas} />
        </div>
      </div>
    </div>
  );
}

function DisasterModeControl({ state, update }: { state: KeamananState; update: KeamananUpdater }) {
  const [title, setTitle] = React.useState(state.settings.disasterTitle ?? "Banjir");
  const active = state.settings.disasterActive;

  const toggle = () => {
    if (!active && !window.confirm(`Aktifkan mode siaga "${title}"? Semua warga akan melihat banner & diminta lapor kondisi.`)) return;
    update((s) => ({
      ...s,
      settings: active
        ? { ...s.settings, disasterActive: false }
        : { ...s.settings, disasterActive: true, disasterTitle: title.trim() || "Bencana", disasterStartedAt: new Date().toISOString() },
    }));
    toast[active ? "success" : "warning"](active ? "Mode siaga dinonaktifkan." : "MODE SIAGA AKTIF. Warga diminta melapor kondisi.");
  };

  return (
    <div className={`rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center gap-3 ${active ? "bg-blue-700 text-white border-blue-700" : "bg-white dark:bg-[#131F17] border-neutral-200/80 dark:border-neutral-800/80"}`}>
      <Siren className={`w-6 h-6 shrink-0 ${active ? "animate-pulse" : "text-blue-600"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black">{active ? `Mode siaga aktif: ${state.settings.disasterTitle}` : "Mode Siaga Bencana"}</p>
        <p className={`text-[11px] ${active ? "opacity-90" : "text-slate-500"}`}>
          {active
            ? `Dimulai ${timeAgo(state.settings.disasterStartedAt ?? new Date().toISOString())}. Warga melihat banner & tombol "Saya Aman / Butuh Bantuan".`
            : "Aktifkan saat banjir/kebakaran/gempa untuk mengumpulkan status keselamatan seluruh warga."}
        </p>
      </div>
      {!active && (
        <select value={title} onChange={(e) => setTitle(e.target.value)} className={`${inputClass} sm:w-44`}>
          {DISASTER_PRESETS.map((p) => <option key={p}>{p}</option>)}
        </select>
      )}
      <button onClick={toggle} className={`min-h-[44px] px-4 rounded-xl text-xs font-black shrink-0 ${active ? "bg-white text-blue-700" : "bg-blue-600 text-white"}`}>
        {active ? "Akhiri Siaga" : "Aktifkan Siaga"}
      </button>
    </div>
  );
}

function SafetyCheckinCard({ update, user, current }: { update: KeamananUpdater; user: SecurityUser; current?: SafetyCheckin }) {
  const [peopleCount, setPeopleCount] = React.useState(current?.peopleCount ?? 1);
  const [note, setNote] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const send = async (status: SafetyCheckin["status"]) => {
    setSending(true);
    const pos = await getCurrentPosition(6000);
    const checkin: SafetyCheckin = {
      id: uid("safe"),
      name: user.name,
      houseBlock: user.houseBlock,
      phone: user.phone,
      status,
      note: note.trim() || undefined,
      peopleCount,
      lat: pos?.lat,
      lng: pos?.lng,
      createdAt: new Date().toISOString(),
    };
    update((s) => ({ ...s, safetyCheckins: [checkin, ...s.safetyCheckins] }));
    setSending(false);
    setNote("");
    if (status === "AMAN") toast.success("Terima kasih, status AMAN tercatat.");
    else toast.error("Permintaan bantuan terkirim. Tim evakuasi akan menghubungi Anda.");
  };

  return (
    <Panel title="Bagaimana kondisi keluarga Anda?" description={current ? `Laporan terakhir: ${current.status === "AMAN" ? "AMAN" : "BUTUH BANTUAN"} (${timeAgo(current.createdAt)})` : "Belum melapor"} icon={HeartHandshake} className="border-blue-500/50">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Jumlah orang di rumah">
          <input type="number" min={1} inputMode="numeric" value={peopleCount} onChange={(e) => setPeopleCount(Math.max(1, Number(e.target.value)))} className={inputClass} />
        </Field>
        <Field label="Keterangan">
          <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} placeholder="mis. air sepinggang, ada lansia" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button disabled={sending} onClick={() => send("AMAN")} className="min-h-[56px] rounded-2xl bg-emerald-600 text-white font-black text-sm disabled:opacity-50">
          ✅ Kami Aman
        </button>
        <button disabled={sending} onClick={() => send("BUTUH_BANTUAN")} className="min-h-[56px] rounded-2xl bg-red-600 text-white font-black text-sm disabled:opacity-50">
          🆘 Butuh Bantuan
        </button>
      </div>
    </Panel>
  );
}

function PostList({ state, update, isPetugas }: { state: KeamananState; update: KeamananUpdater; isPetugas: boolean }) {
  const [showForm, setShowForm] = React.useState(false);

  const setOccupants = (p: DisasterPost, delta: number) =>
    update((s) => ({
      ...s,
      disasterPosts: s.disasterPosts.map((x) => (x.id === p.id ? { ...x, occupants: Math.max(0, x.occupants + delta) } : x)),
    }));

  const editNeeds = (p: DisasterPost) => {
    const value = window.prompt("Kebutuhan logistik (pisahkan koma)", p.needs.join(", "));
    if (value === null) return;
    const needs = value.split(",").map((n) => n.trim()).filter(Boolean);
    update((s) => ({ ...s, disasterPosts: s.disasterPosts.map((x) => (x.id === p.id ? { ...x, needs } : x)) }));
  };

  return (
    <Panel
      title="Posko & Titik Kumpul"
      icon={Tent}
      action={
        isPetugas ? (
          <button onClick={() => setShowForm((v) => !v)} className="h-9 px-3 rounded-xl bg-blue-600 text-white text-[11px] font-bold flex items-center gap-1 shrink-0">
            <Plus className="w-3.5 h-3.5" /> Posko
          </button>
        ) : undefined
      }
    >
      {showForm && <PostForm update={update} onDone={() => setShowForm(false)} />}
      {state.disasterPosts.length === 0 ? (
        <Empty>Belum ada posko.</Empty>
      ) : (
        <ul className="space-y-2.5">
          {state.disasterPosts.map((p) => {
            const meta = DISASTER_POST_META[p.type];
            const pct = p.capacity ? Math.min(100, Math.round((p.occupants / p.capacity) * 100)) : 0;
            return (
              <li key={p.id} className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold">{meta.emoji} {p.name}</p>
                    <p className="text-[10px] text-slate-500">{meta.label} · {p.contactName}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <a href={`tel:${p.contactPhone}`} className="w-8 h-8 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-center" aria-label="Telepon posko">
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 px-2.5 rounded-lg bg-blue-600 text-white text-[10px] font-bold flex items-center"
                    >
                      Rute
                    </a>
                  </div>
                </div>
                {p.capacity > 0 && (
                  <div>
                    <div className="flex justify-between text-[10px] font-semibold mb-0.5">
                      <span>Terisi {p.occupants}/{p.capacity}</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <div className={`h-full rounded-full ${pct > 85 ? "bg-red-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
                {p.needs.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <PackageOpen className="w-3.5 h-3.5 text-amber-600" />
                    {p.needs.map((n) => <Pill key={n} tone="amber">{n}</Pill>)}
                  </div>
                )}
                {isPetugas && (
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => setOccupants(p, -1)} className="h-8 w-8 rounded-lg border border-neutral-200 dark:border-neutral-700 font-black">−</button>
                    <button onClick={() => setOccupants(p, 1)} className="h-8 w-8 rounded-lg border border-neutral-200 dark:border-neutral-700 font-black">+</button>
                    <button onClick={() => setOccupants(p, 10)} className="h-8 px-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-[10px] font-bold">+10</button>
                    <button onClick={() => editNeeds(p)} className="h-8 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-[10px] font-bold">Kebutuhan</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function PostForm({ update, onDone }: { update: KeamananUpdater; onDone: () => void }) {
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<DisasterPostType>("POSKO");
  const [capacity, setCapacity] = React.useState(50);
  const [contactName, setContactName] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [point, setPoint] = React.useState<LatLng | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !point || !contactPhone.trim()) {
      toast.error("Nama, titik lokasi, dan kontak wajib diisi.");
      return;
    }
    const post: DisasterPost = {
      id: uid("posko"),
      name: name.trim(),
      type,
      lat: point.lat,
      lng: point.lng,
      capacity,
      occupants: 0,
      contactName: contactName.trim() || "Koordinator",
      contactPhone: contactPhone.trim(),
      needs: [],
      active: true,
      createdAt: new Date().toISOString(),
    };
    update((s) => ({ ...s, disasterPosts: [...s.disasterPosts, post] }));
    toast.success("Posko ditambahkan ke peta.");
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-2.5 p-3 rounded-xl bg-neutral-50 dark:bg-[#0B130E]">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama posko / lokasi" className={inputClass} />
      <div className="grid grid-cols-2 gap-2">
        <select value={type} onChange={(e) => setType(e.target.value as DisasterPostType)} className={inputClass}>
          {(Object.keys(DISASTER_POST_META) as DisasterPostType[]).map((t) => <option key={t} value={t}>{DISASTER_POST_META[t].label}</option>)}
        </select>
        <input type="number" min={0} inputMode="numeric" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} placeholder="Kapasitas" className={inputClass} />
        <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nama PJ" className={inputClass} />
        <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} inputMode="tel" placeholder="No. HP PJ" className={inputClass} />
      </div>
      <LocationPicker value={point} onChange={setPoint} />
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onDone} className={ghostBtn}>Batal</button>
        <button type="submit" className={primaryBtn}>Simpan</button>
      </div>
    </form>
  );
}
