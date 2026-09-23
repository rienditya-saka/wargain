"use client";

import * as React from "react";
import { toast } from "sonner";
import { Video, Plus, Maximize2, WifiOff, Settings2, X } from "lucide-react";
import { CctvCamera, CctvStreamType, KeamananState, KeamananUpdater } from "@/lib/keamanan/types";
import { distanceMeters, uid } from "@/lib/keamanan/store";
import { LocationPicker, LatLng } from "./location-picker";
import { Empty, Field, Panel, Pill, Segmented, SecurityUser, ghostBtn, inputClass, primaryBtn } from "./ui";

const STREAM_TYPE_LABEL: Record<CctvStreamType, string> = {
  HLS: "HLS (.m3u8) / MP4",
  MJPEG: "MJPEG stream",
  SNAPSHOT: "Snapshot JPG (refresh 5 dtk)",
  EMBED: "Embed (iframe / YouTube Live)",
  BELUM_DIATUR: "Belum diatur",
};

export function nearestCameras(state: KeamananState, point: { lat: number; lng: number }, radius = 200) {
  return state.cctvs
    .filter((c) => c.isShared || c.ownerType === "RT")
    .map((c) => ({ camera: c, dist: distanceMeters(point, c) }))
    .filter((x) => x.dist <= radius)
    .sort((a, b) => a.dist - b.dist);
}

export function CctvView({ camera, className }: { camera: CctvCamera; className?: string }) {
  const [tick, setTick] = React.useState(0);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setFailed(false);
    if (camera.streamType !== "SNAPSHOT") return;
    const t = setInterval(() => setTick((v) => v + 1), 5000);
    return () => clearInterval(t);
  }, [camera.streamType, camera.streamUrl]);

  const base = `relative bg-black overflow-hidden ${className ?? "aspect-video rounded-xl"}`;
  const overlay = (
    <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
      <span className="px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-bold truncate max-w-[70%]">{camera.name}</span>
      {camera.status === "ONLINE" && camera.streamUrl && !failed ? (
        <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-black flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
        </span>
      ) : null}
    </div>
  );

  if (camera.status === "OFFLINE" || failed) {
    return (
      <div className={`${base} flex flex-col items-center justify-center text-slate-400 gap-1`}>
        {overlay}
        <WifiOff className="w-6 h-6" />
        <span className="text-[11px] font-bold">{failed ? "Stream gagal dimuat" : "Kamera offline"}</span>
      </div>
    );
  }

  if (!camera.streamUrl || camera.streamType === "BELUM_DIATUR") {
    return (
      <div className={`${base} flex flex-col items-center justify-center gap-1.5 text-center px-4 bg-[repeating-linear-gradient(45deg,#0f172a,#0f172a_10px,#111827_10px,#111827_20px)]`}>
        {overlay}
        <Video className="w-6 h-6 text-slate-500" />
        <span className="text-[11px] font-bold text-slate-300">Stream belum dihubungkan</span>
        <span className="text-[10px] text-slate-500">Isi URL HLS/MJPEG/snapshot dari NVR/DVR (RTSP perlu dikonversi ke HLS)</span>
      </div>
    );
  }

  const url = camera.streamType === "SNAPSHOT" ? `${camera.streamUrl}${camera.streamUrl.includes("?") ? "&" : "?"}t=${tick}` : camera.streamUrl;

  return (
    <div className={base}>
      {camera.streamType === "HLS" && (
        <video src={url} autoPlay muted playsInline controls className="w-full h-full object-cover" onError={() => setFailed(true)} />
      )}
      {(camera.streamType === "MJPEG" || camera.streamType === "SNAPSHOT") && (
        <img src={url} alt={camera.name} className="w-full h-full object-cover" onError={() => setFailed(true)} />
      )}
      {camera.streamType === "EMBED" && (
        <iframe src={url} title={camera.name} className="w-full h-full" allow="autoplay; fullscreen" sandbox="allow-scripts allow-same-origin allow-presentation" />
      )}
      {overlay}
    </div>
  );
}

export function CctvPanel({
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
  const [filter, setFilter] = React.useState<"SEMUA" | "RT" | "WARGA">("SEMUA");
  const [fullscreen, setFullscreen] = React.useState<CctvCamera | null>(null);
  const [editing, setEditing] = React.useState<CctvCamera | "new" | null>(null);

  const visible = state.cctvs
    .filter((c) => isPetugas || c.isShared || c.ownerName === user.name)
    .filter((c) => filter === "SEMUA" || c.ownerType === filter);
  const online = state.cctvs.filter((c) => c.status === "ONLINE").length;

  const canEdit = (c: CctvCamera) => isPetugas || c.ownerName === user.name;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Pill tone="emerald">{online} online</Pill>
          <Pill tone="slate">{state.cctvs.length - online} offline</Pill>
        </div>
        <div className="flex gap-2">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[{ value: "SEMUA", label: "Semua" }, { value: "RT", label: "Milik RT" }, { value: "WARGA", label: "Warga" }]}
          />
          <button onClick={() => setEditing("new")} className={`${primaryBtn} flex items-center gap-1.5 shrink-0`}>
            <Plus className="w-4 h-4" /> {isPetugas ? "Kamera" : "Bagikan CCTV"}
          </button>
        </div>
      </div>

      {editing && (
        <CctvForm
          camera={editing === "new" ? null : editing}
          isPetugas={isPetugas}
          user={user}
          update={update}
          onDone={() => setEditing(null)}
        />
      )}

      {visible.length === 0 ? (
        <Empty>Belum ada kamera.</Empty>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3">
          {visible.map((c) => (
            <li key={c.id} className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] overflow-hidden">
              <CctvView camera={c} className="aspect-video" />
              <div className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-extrabold truncate">{c.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {c.location} · {c.ownerType === "RT" ? "Milik RT" : `Dibagikan ${c.ownerName}`}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setFullscreen(c)} className="w-8 h-8 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-center" aria-label="Perbesar">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  {canEdit(c) && (
                    <button onClick={() => setEditing(c)} className="w-8 h-8 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-center" aria-label="Pengaturan kamera">
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-slate-500">
        Tips integrasi: kebanyakan NVR/DVR (Hikvision, Dahua, EZVIZ) mengeluarkan RTSP. Pakai gateway seperti MediaMTX/go2rtc di jaringan pos satpam
        untuk mengubahnya ke HLS atau MJPEG, lalu tempel URL-nya di sini.
      </p>

      {fullscreen && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col p-3 sm:p-6" onClick={() => setFullscreen(null)}>
          <div className="flex items-center justify-between text-white mb-2">
            <p className="text-sm font-bold">{fullscreen.name}</p>
            <button className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center" aria-label="Tutup">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <CctvView camera={fullscreen} className="w-full max-w-5xl aspect-video rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}

function CctvForm({
  camera,
  isPetugas,
  user,
  update,
  onDone,
}: {
  camera: CctvCamera | null;
  isPetugas: boolean;
  user: SecurityUser;
  update: KeamananUpdater;
  onDone: () => void;
}) {
  const [name, setName] = React.useState(camera?.name ?? "");
  const [location, setLocation] = React.useState(camera?.location ?? (isPetugas ? "" : `Depan rumah ${user.houseBlock}`));
  const [streamType, setStreamType] = React.useState<CctvStreamType>(camera?.streamType ?? "HLS");
  const [streamUrl, setStreamUrl] = React.useState(camera?.streamUrl ?? "");
  const [status, setStatus] = React.useState<CctvCamera["status"]>(camera?.status ?? "ONLINE");
  const [isShared, setIsShared] = React.useState(camera?.isShared ?? true);
  const [point, setPoint] = React.useState<LatLng | null>(camera ? { lat: camera.lat, lng: camera.lng } : null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !point) {
      toast.error("Nama kamera dan titik lokasi wajib diisi.");
      return;
    }
    if (streamUrl && !/^https:\/\//i.test(streamUrl)) {
      toast.error("URL stream harus https:// agar bisa diputar di browser.");
      return;
    }
    const next: CctvCamera = {
      id: camera?.id ?? uid("cctv"),
      name: name.trim(),
      location: location.trim() || "-",
      lat: point.lat,
      lng: point.lng,
      streamType: streamUrl ? streamType : "BELUM_DIATUR",
      streamUrl: streamUrl.trim() || undefined,
      ownerType: camera?.ownerType ?? (isPetugas ? "RT" : "WARGA"),
      ownerName: camera?.ownerName ?? (isPetugas ? "Pengurus RT" : user.name),
      isShared,
      status,
      createdAt: camera?.createdAt ?? new Date().toISOString(),
    };
    update((s) => ({
      ...s,
      cctvs: camera ? s.cctvs.map((c) => (c.id === camera.id ? next : c)) : [next, ...s.cctvs],
    }));
    toast.success(camera ? "Kamera diperbarui." : "Kamera ditambahkan ke peta keamanan.");
    onDone();
  };

  const remove = () => {
    if (!camera || !window.confirm(`Hapus kamera ${camera.name}?`)) return;
    update((s) => ({ ...s, cctvs: s.cctvs.filter((c) => c.id !== camera.id) }));
    onDone();
  };

  return (
    <Panel title={camera ? "Pengaturan Kamera" : isPetugas ? "Tambah Kamera RT" : "Bagikan CCTV Rumah"} icon={Video}>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Nama kamera">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="mis. Perempatan Blok A" />
        </Field>
        <Field label="Keterangan lokasi">
          <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Jenis stream">
          <select value={streamType} onChange={(e) => setStreamType(e.target.value as CctvStreamType)} className={inputClass}>
            {(["HLS", "MJPEG", "SNAPSHOT", "EMBED"] as CctvStreamType[]).map((t) => <option key={t} value={t}>{STREAM_TYPE_LABEL[t]}</option>)}
          </select>
        </Field>
        <Field label="URL stream (https)">
          <input value={streamUrl} onChange={(e) => setStreamUrl(e.target.value)} className={`${inputClass} font-mono`} placeholder="https://nvr.example.com/cam1/index.m3u8" />
        </Field>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={status === "ONLINE"} onChange={(e) => setStatus(e.target.checked ? "ONLINE" : "OFFLINE")} className="w-4 h-4 accent-emerald-600" />
            Online
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
            Bisa dilihat warga lain
          </label>
        </div>
        <div className="md:col-span-2">
          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Titik kamera di peta</p>
          <LocationPicker value={point} onChange={setPoint} />
        </div>
        <div className="md:col-span-2 flex gap-2 justify-end">
          {camera && <button type="button" onClick={remove} className={`${ghostBtn} text-red-600 mr-auto`}>Hapus</button>}
          <button type="button" onClick={onDone} className={ghostBtn}>Batal</button>
          <button type="submit" className={primaryBtn}>Simpan</button>
        </div>
      </form>
    </Panel>
  );
}
