"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Layers, Flame, Clock } from "lucide-react";
import { INCIDENT_CATEGORY_LABEL, KeamananState } from "@/lib/keamanan/types";
import {
  LAYER_META,
  LayerKey,
  cctvMarkers,
  disasterMarkers,
  emptyHouseMarkers,
  incidentHeatCircles,
  incidentMarkers,
  lostFoundMarkers,
  safetyCheckinMarkers,
  vulnerableMarkers,
  watchlistMarkers,
} from "./map-layers";
import { Panel } from "./ui";

const SecurityLeafletMap = dynamic(
  () => import("./security-leaflet-map").then((m) => m.SecurityLeafletMap),
  { ssr: false, loading: () => <div className="h-[60vh] rounded-2xl bg-neutral-100 dark:bg-neutral-900 animate-pulse" /> }
);

const PERIODS = [
  { days: 7, label: "7 hari" },
  { days: 30, label: "30 hari" },
  { days: 90, label: "90 hari" },
];

export function PetaPanel({ state, isPetugas }: { state: KeamananState; isPetugas: boolean }) {
  const defaultLayers: LayerKey[] = state.settings.disasterActive
    ? ["posko", "cekAman", "rentan"]
    : ["kejadian", "sebaran", "waspada", "hilang", "cctv"];
  const [layers, setLayers] = React.useState<Set<LayerKey>>(new Set(defaultLayers));
  const [periodDays, setPeriodDays] = React.useState(30);

  const available = (Object.keys(LAYER_META) as LayerKey[]).filter((k) => isPetugas || !LAYER_META[k].petugasOnly);

  const toggle = (k: LayerKey) =>
    setLayers((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const markers = React.useMemo(() => {
    const out = [];
    if (layers.has("kejadian")) out.push(...incidentMarkers(state, periodDays));
    if (layers.has("waspada")) out.push(...watchlistMarkers(state));
    if (layers.has("hilang")) out.push(...lostFoundMarkers(state));
    if (layers.has("rumahKosong") && isPetugas) out.push(...emptyHouseMarkers(state));
    if (layers.has("cctv")) out.push(...cctvMarkers(state));
    if (layers.has("posko")) out.push(...disasterMarkers(state));
    if (layers.has("rentan") && isPetugas) out.push(...vulnerableMarkers(state));
    if (layers.has("cekAman") && isPetugas) out.push(...safetyCheckinMarkers(state, state.settings.disasterStartedAt));
    return out;
  }, [state, layers, periodDays, isPetugas]);

  const circles = React.useMemo(
    () => (layers.has("sebaran") ? incidentHeatCircles(state, periodDays) : []),
    [state, layers, periodDays]
  );

  const activeAlerts = React.useMemo(
    () => state.alerts.filter((a) => a.status === "BARU" || a.status === "DIRESPON"),
    [state.alerts]
  );

  const recentIncidents = React.useMemo(() => {
    const since = Date.now() - periodDays * 86_400_000;
    return state.incidents.filter((i) => new Date(i.createdAt).getTime() >= since);
  }, [state.incidents, periodDays]);

  const byHour = React.useMemo(() => {
    const buckets = Array.from({ length: 8 }, () => 0); // 3-hour buckets
    recentIncidents.forEach((i) => buckets[Math.floor(new Date(i.createdAt).getHours() / 3)]++);
    return buckets;
  }, [recentIncidents]);
  const maxBucket = Math.max(1, ...byHour);
  const peakBucket = byHour.indexOf(Math.max(...byHour));

  const byCategory = React.useMemo(() => {
    const counts = new Map<string, number>();
    recentIncidents.forEach((i) => counts.set(i.category, (counts.get(i.category) ?? 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [recentIncidents]);

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {available.map((k) => {
          const on = layers.has(k);
          return (
            <button
              key={k}
              onClick={() => toggle(k)}
              aria-pressed={on}
              className={`shrink-0 min-h-[36px] px-3 rounded-full text-[11px] font-bold border transition-colors flex items-center gap-1.5 ${
                on
                  ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
                  : "border-neutral-200 dark:border-neutral-800 text-slate-600 dark:text-slate-300 bg-white dark:bg-[#131F17]"
              }`}
            >
              <span>{LAYER_META[k].emoji}</span> {LAYER_META[k].label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 relative">
          <SecurityLeafletMap
            alerts={activeAlerts}
            checkpoints={layers.has("patroli") ? state.checkpoints : []}
            extraMarkers={markers}
            circles={circles}
            className="h-[62vh] min-h-[360px] md:h-[560px]"
          />
          <div className="absolute top-3 right-3 z-[400] flex rounded-xl bg-white/95 dark:bg-black/80 shadow text-[10px] font-bold overflow-hidden">
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => setPeriodDays(p.days)}
                className={`px-2.5 py-1.5 ${periodDays === p.days ? "bg-emerald-600 text-white" : "text-slate-600 dark:text-slate-300"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3 content-start">
          <Panel title="Jam Rawan" description={`${recentIncidents.length} laporan dalam ${periodDays} hari`} icon={Clock}>
            <div className="flex items-end gap-1.5 h-28">
              {byHour.map((n, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-[9px] font-bold text-slate-500">{n || ""}</span>
                  <div
                    className={`w-full rounded-t-md ${i === peakBucket && n > 0 ? "bg-red-500" : "bg-emerald-500/70"}`}
                    style={{ height: `${Math.max(4, (n / maxBucket) * 100)}%` }}
                  />
                  <span className="text-[9px] text-slate-500">{String(i * 3).padStart(2, "0")}</span>
                </div>
              ))}
            </div>
            {byHour[peakBucket] > 0 && (
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Paling rawan pukul <b>{String(peakBucket * 3).padStart(2, "0")}:00–{String(peakBucket * 3 + 3).padStart(2, "0")}:00</b>. Pertimbangkan patroli ekstra di jam ini.
              </p>
            )}
          </Panel>

          <Panel title="Kategori Terbanyak" icon={Flame}>
            {byCategory.length === 0 ? (
              <p className="text-xs text-slate-500">Belum ada laporan pada periode ini.</p>
            ) : (
              <ul className="space-y-1.5">
                {byCategory.map(([c, n]) => (
                  <li key={c} className="text-xs">
                    <div className="flex justify-between mb-0.5">
                      <span>{INCIDENT_CATEGORY_LABEL[c as keyof typeof INCIDENT_CATEGORY_LABEL]}</span>
                      <b>{n}</b>
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <div className="h-full rounded-full bg-orange-500" style={{ width: `${(n / recentIncidents.length) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Keterangan" icon={Layers} className="sm:col-span-2 xl:col-span-1">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Lingkaran oranye-merah menunjukkan titik rawan: makin pekat, makin sering kejadian (pencurian dihitung lebih berat).
              Titik merah berdenyut adalah sinyal panic yang masih aktif. Nyalakan/matikan layer lewat tombol di atas peta.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
