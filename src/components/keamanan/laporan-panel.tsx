"use client";

import * as React from "react";
import { toast } from "sonner";
import { Megaphone, EyeOff, ShieldAlert } from "lucide-react";
import {
  IncidentCategory,
  IncidentReport,
  IncidentStatus,
  INCIDENT_CATEGORY_LABEL,
  KeamananState,
  KeamananUpdater,
} from "@/lib/keamanan/types";
import { formatDateTime, uid } from "@/lib/keamanan/store";
import { Empty, Field, Panel, Pill, PillTone, SecurityUser, inputClass } from "./ui";
import { LocationPicker, LatLng } from "./location-picker";

const STATUS_TONE: Record<IncidentStatus, PillTone> = {
  DILAPORKAN: "amber",
  DITINDAKLANJUTI: "blue",
  SELESAI: "emerald",
};

export function LaporanPanel({
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
  const [category, setCategory] = React.useState<IncidentCategory>("ORANG_MENCURIGAKAN");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [anonymous, setAnonymous] = React.useState(false);
  const [point, setPoint] = React.useState<LatLng | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<IncidentStatus | "ALL">("ALL");
  const [followUps, setFollowUps] = React.useState<Record<string, string>>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Judul & kronologi wajib diisi.");
      return;
    }
    const report: IncidentReport = {
      id: uid("inc"),
      category,
      title: title.trim(),
      description: description.trim(),
      location: location.trim() || user.houseBlock,
      reporter: anonymous ? "Anonim" : `${user.name} (${user.houseBlock})`,
      anonymous,
      createdAt: new Date().toISOString(),
      status: "DILAPORKAN",
      lat: point?.lat,
      lng: point?.lng,
    };
    update((s) => ({ ...s, incidents: [report, ...s.incidents] }));
    setPoint(null);
    setTitle("");
    setDescription("");
    setLocation("");
    toast.success("Laporan terkirim ke tim keamanan.");
  };

  const setStatus = (report: IncidentReport, status: IncidentStatus) => {
    const followUp = followUps[report.id]?.trim();
    update((s) => ({
      ...s,
      incidents: s.incidents.map((i) => (i.id === report.id ? { ...i, status, followUp: followUp || i.followUp } : i)),
    }));
    setFollowUps((f) => ({ ...f, [report.id]: "" }));
  };

  const promoteToWatchlist = (r: IncidentReport) => {
    if (state.watchlist.some((w) => w.description === r.description)) {
      toast("Sudah ada di daftar waspada.");
      return;
    }
    update((s) => ({
      ...s,
      watchlist: [
        {
          id: uid("watch"),
          kind: r.category === "KENDARAAN_MENCURIGAKAN" ? "KENDARAAN" : "ORANG",
          label: r.title,
          description: r.description,
          level: "WASPADA",
          lastSeenAt: r.createdAt,
          lastSeenLocation: r.location,
          lat: r.lat,
          lng: r.lng,
          reportedBy: r.reporter,
          active: true,
          createdAt: new Date().toISOString(),
        },
        ...s.watchlist,
      ],
    }));
    toast.success("Ditambahkan ke daftar waspada. Tambahkan plat di tab Waspada jika diketahui.");
  };

  const listed = state.incidents.filter((i) => statusFilter === "ALL" || i.status === statusFilter);

  const byCategory = (Object.keys(INCIDENT_CATEGORY_LABEL) as IncidentCategory[])
    .map((c) => ({ c, n: state.incidents.filter((i) => i.category === c).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
      <div className="xl:col-span-2 space-y-4">
        <Panel title="Lapor Kejadian / Hal Mencurigakan" description="Bukan darurat? Laporkan di sini, bukan lewat tombol panic." icon={Megaphone}>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Kategori">
              <select value={category} onChange={(e) => setCategory(e.target.value as IncidentCategory)} className={inputClass}>
                {(Object.keys(INCIDENT_CATEGORY_LABEL) as IncidentCategory[]).map((c) => (
                  <option key={c} value={c}>{INCIDENT_CATEGORY_LABEL[c]}</option>
                ))}
              </select>
            </Field>
            <Field label="Judul singkat">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="mis. Pintu portal belakang rusak" className={inputClass} />
            </Field>
            <Field label="Kronologi / ciri-ciri">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputClass} placeholder="Waktu, ciri orang/kendaraan, arah pergi..." />
            </Field>
            <Field label="Lokasi">
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="mis. Depan Blok G / Jalan belakang masjid" className={inputClass} />
            </Field>
            <div>
              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Titik kejadian (untuk peta sebaran)</p>
              <LocationPicker value={point} onChange={setPoint} />
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="accent-emerald-600 w-4 h-4" />
              <EyeOff className="w-3.5 h-3.5" /> Kirim sebagai anonim
            </label>
            <button type="submit" className="w-full min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">
              Kirim Laporan
            </button>
          </form>
        </Panel>

        {isPetugas && byCategory.length > 0 && (
          <Panel title="Rekap Kategori">
            <ul className="space-y-1.5">
              {byCategory.map(({ c, n }) => (
                <li key={c} className="text-xs">
                  <div className="flex justify-between mb-0.5"><span>{INCIDENT_CATEGORY_LABEL[c]}</span><b>{n}</b></div>
                  <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(n / state.incidents.length) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      <div className="xl:col-span-3">
        <Panel
          title={isPetugas ? "Antrean Laporan Warga" : "Laporan Lingkungan"}
          action={
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as IncidentStatus | "ALL")} className={`${inputClass} w-40`}>
              <option value="ALL">Semua status</option>
              <option value="DILAPORKAN">Dilaporkan</option>
              <option value="DITINDAKLANJUTI">Ditindaklanjuti</option>
              <option value="SELESAI">Selesai</option>
            </select>
          }
        >
          {listed.length === 0 ? (
            <Empty>Belum ada laporan.</Empty>
          ) : (
            <ul className="space-y-2.5">
              {listed.map((r) => (
                <li key={r.id} className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-extrabold">{r.title}</p>
                    <Pill tone={STATUS_TONE[r.status]}>{r.status}</Pill>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {INCIDENT_CATEGORY_LABEL[r.category]} · {r.location} · {formatDateTime(r.createdAt)} · oleh {r.reporter}
                  </p>
                  <p className="text-xs text-slate-700 dark:text-slate-300">{r.description}</p>
                  {r.followUp && (
                    <p className="text-[11px] p-2 rounded-lg bg-blue-500/5 border border-blue-500/20 text-blue-700 dark:text-blue-300">
                      Tindak lanjut: {r.followUp}
                    </p>
                  )}
                  {isPetugas && r.status !== "SELESAI" && (
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <input
                        value={followUps[r.id] ?? ""}
                        onChange={(e) => setFollowUps((f) => ({ ...f, [r.id]: e.target.value }))}
                        placeholder="Catatan tindak lanjut"
                        className={inputClass}
                      />
                      <div className="flex gap-2 shrink-0">
                        {r.status === "DILAPORKAN" && (
                          <button onClick={() => setStatus(r, "DITINDAKLANJUTI")} className="min-h-[40px] px-3 rounded-xl bg-blue-600 text-white text-[11px] font-bold">
                            Tindak lanjut
                          </button>
                        )}
                        <button onClick={() => setStatus(r, "SELESAI")} className="min-h-[40px] px-3 rounded-xl bg-emerald-600 text-white text-[11px] font-bold">
                          Selesai
                        </button>
                        {(r.category === "ORANG_MENCURIGAKAN" || r.category === "KENDARAAN_MENCURIGAKAN") && (
                          <button onClick={() => promoteToWatchlist(r)} className="min-h-[40px] px-3 rounded-xl bg-amber-500 text-white text-[11px] font-bold flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5" /> Waspada
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
