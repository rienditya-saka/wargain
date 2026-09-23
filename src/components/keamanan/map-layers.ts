import {
  DISASTER_POST_META,
  INCIDENT_CATEGORY_LABEL,
  IncidentCategory,
  KeamananState,
  LOST_FOUND_CATEGORY_META,
} from "@/lib/keamanan/types";
import { formatDateLabel, formatDateTime, timeAgo, toDateKey } from "@/lib/keamanan/store";
import type { MapCircle, MapMarker } from "./security-leaflet-map";

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function badge(bg: string, emoji: string, size = 26, extra = "") {
  return `<div class="rounded-full ${bg} border-2 border-white shadow-md flex items-center justify-center ${extra}" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.5)}px">${emoji}</div>`;
}

function popup(title: string, lines: (string | undefined | false)[], color = "#0f172a") {
  return `<div style="min-width:170px;max-width:240px">
    <div style="font-weight:800;font-size:12px;color:${color}">${title}</div>
    ${lines.filter(Boolean).map((l) => `<div style="font-size:11px;margin-top:2px;color:#475569">${l}</div>`).join("")}
  </div>`;
}

export const INCIDENT_EMOJI: Record<IncidentCategory, string> = {
  PENCURIAN: "🥷",
  ORANG_MENCURIGAKAN: "👀",
  KENDARAAN_MENCURIGAKAN: "🚗",
  FASILITAS_RUSAK: "💡",
  KERIBUTAN: "📢",
  LAINNYA: "📝",
};

export type LayerKey =
  | "kejadian"
  | "sebaran"
  | "waspada"
  | "hilang"
  | "rumahKosong"
  | "cctv"
  | "posko"
  | "rentan"
  | "cekAman"
  | "patroli";

export const LAYER_META: Record<LayerKey, { label: string; emoji: string; petugasOnly?: boolean }> = {
  kejadian: { label: "Laporan Kejadian", emoji: "📝" },
  sebaran: { label: "Sebaran Rawan", emoji: "🔥" },
  waspada: { label: "Daftar Waspada", emoji: "⚠️" },
  hilang: { label: "Hilang & Ditemukan", emoji: "🔎" },
  rumahKosong: { label: "Rumah Kosong", emoji: "🏚️", petugasOnly: true },
  cctv: { label: "CCTV", emoji: "📹" },
  posko: { label: "Posko Bencana", emoji: "⛺" },
  rentan: { label: "Warga Rentan", emoji: "🧓", petugasOnly: true },
  cekAman: { label: "Cek Keselamatan", emoji: "🙋", petugasOnly: true },
  patroli: { label: "Checkpoint Patroli", emoji: "📍" },
};

export function incidentMarkers(state: KeamananState, sinceDays = 30): MapMarker[] {
  const since = Date.now() - sinceDays * 86_400_000;
  return state.incidents
    .filter((i) => i.lat != null && i.lng != null && new Date(i.createdAt).getTime() >= since)
    .map((i) => ({
      id: i.id,
      lat: i.lat!,
      lng: i.lng!,
      size: 26,
      html: badge(i.status === "SELESAI" ? "bg-slate-400" : "bg-orange-500", INCIDENT_EMOJI[i.category]),
      popup: popup(escapeHtml(i.title), [
        INCIDENT_CATEGORY_LABEL[i.category],
        `${escapeHtml(i.location)} · ${formatDateTime(i.createdAt)}`,
        `Status: <b>${i.status}</b>`,
      ], "#c2410c"),
    }));
}

// Heat-like layer: overlapping translucent circles make repeat hotspots visibly darker.
export function incidentHeatCircles(state: KeamananState, sinceDays = 90): MapCircle[] {
  const since = Date.now() - sinceDays * 86_400_000;
  const points = [
    ...state.incidents.filter((i) => i.lat != null && new Date(i.createdAt).getTime() >= since).map((i) => ({ id: i.id, lat: i.lat!, lng: i.lng!, w: i.category === "PENCURIAN" ? 1.6 : 1 })),
    ...state.alerts.filter((a) => a.type === "PENCURIAN" && new Date(a.createdAt).getTime() >= since).map((a) => ({ id: a.id, lat: a.lat, lng: a.lng, w: 2 })),
    ...state.watchlist.filter((w) => w.active && w.lat != null).map((w) => ({ id: w.id, lat: w.lat!, lng: w.lng!, w: 1 })),
  ];
  return points.flatMap((p) => [
    { id: `${p.id}_o`, lat: p.lat, lng: p.lng, radius: 70 * p.w, color: "#f97316", opacity: 0.12 },
    { id: `${p.id}_i`, lat: p.lat, lng: p.lng, radius: 30 * p.w, color: "#dc2626", opacity: 0.18 },
  ]);
}

export function watchlistMarkers(state: KeamananState): MapMarker[] {
  return state.watchlist
    .filter((w) => w.active && w.lat != null && w.lng != null)
    .map((w) => ({
      id: w.id,
      lat: w.lat!,
      lng: w.lng!,
      size: 30,
      zIndex: 500,
      html: badge(w.level === "BAHAYA" ? "bg-red-700" : "bg-amber-500", w.kind === "KENDARAAN" ? "🚘" : "🕵️", 30, w.level === "BAHAYA" ? "animate-pulse" : ""),
      popup: popup(`⚠️ ${escapeHtml(w.label)}`, [
        w.plate && `Plat: <b>${escapeHtml(w.plate)}</b>`,
        escapeHtml(w.description),
        w.lastSeenAt && `Terakhir terlihat ${timeAgo(w.lastSeenAt)}${w.lastSeenLocation ? ` di ${escapeHtml(w.lastSeenLocation)}` : ""}`,
      ], w.level === "BAHAYA" ? "#b91c1c" : "#b45309"),
    }));
}

export function lostFoundMarkers(state: KeamananState): MapMarker[] {
  return state.lostFound
    .filter((l) => l.status === "AKTIF" && l.lat != null && l.lng != null)
    .map((l) => {
      const meta = LOST_FOUND_CATEGORY_META[l.category];
      return {
        id: l.id,
        lat: l.lat!,
        lng: l.lng!,
        size: meta.urgent ? 32 : 26,
        zIndex: meta.urgent ? 800 : 100,
        html: badge(l.type === "HILANG" ? (meta.urgent ? "bg-fuchsia-600" : "bg-violet-500") : "bg-sky-500", meta.emoji, meta.urgent ? 32 : 26, meta.urgent ? "animate-pulse" : ""),
        popup: popup(`${l.type === "HILANG" ? "HILANG" : "DITEMUKAN"}: ${escapeHtml(l.title)}`, [
          `${escapeHtml(l.lastSeenLocation)} · ${timeAgo(l.createdAt)}`,
          `Hubungi ${escapeHtml(l.contactName)} (${escapeHtml(l.contactPhone)})`,
        ], "#7c3aed"),
      };
    });
}

export function emptyHouseMarkers(state: KeamananState): MapMarker[] {
  const today = toDateKey(new Date());
  const markers: MapMarker[] = state.houses
    .filter((h) => ["KOSONG", "RENOVASI"].includes(h.occupancyStatus) && h.lat != null)
    .map((h) => ({
      id: `house_${h.id}`,
      lat: h.lat,
      lng: h.lng,
      size: 24,
      html: badge(h.occupancyStatus === "KOSONG" ? "bg-slate-600" : "bg-yellow-600", h.occupancyStatus === "KOSONG" ? "🏚️" : "🚧", 24),
      popup: popup(`Rumah ${escapeHtml(h.blockNumber)}`, [
        h.occupancyStatus === "KOSONG" ? "Tidak berpenghuni" : "Sedang renovasi",
        `Pemilik: ${escapeHtml(h.ownerName)}`,
      ]),
    }));
  const housesByBlock = new Map(state.houses.map((h) => [h.blockNumber.toUpperCase(), h]));
  state.houseWatches
    .filter((w) => w.from <= today && w.to >= today)
    .forEach((w) => {
      const house = housesByBlock.get(w.houseBlock.toUpperCase());
      const lat = w.lat ?? house?.lat;
      const lng = w.lng ?? house?.lng;
      if (lat == null || lng == null) return;
      markers.push({
        id: `watch_${w.id}`,
        lat,
        lng,
        size: 28,
        zIndex: 300,
        html: badge("bg-teal-600", "🧳", 28),
        popup: popup(`Titip rumah ${escapeHtml(w.houseBlock)}`, [
          `${escapeHtml(w.ownerName)} pergi s/d ${formatDateLabel(w.to)}`,
          `Dicek ${w.checks.length}x${w.checks[0] ? `, terakhir ${timeAgo(w.checks[0].at)}` : ""}`,
        ], "#0f766e"),
      });
    });
  return markers;
}

export function cctvMarkers(state: KeamananState): MapMarker[] {
  return state.cctvs
    .filter((c) => c.isShared || c.ownerType === "RT")
    .map((c) => ({
      id: c.id,
      lat: c.lat,
      lng: c.lng,
      size: 26,
      html: badge(c.status === "ONLINE" ? "bg-indigo-600" : "bg-slate-400", "📹"),
      tooltip: `${escapeHtml(c.name)} · ${c.status}`,
    }));
}

export function disasterMarkers(state: KeamananState): MapMarker[] {
  return state.disasterPosts
    .filter((p) => p.active)
    .map((p) => ({
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      size: 32,
      zIndex: 400,
      html: badge("bg-blue-600", DISASTER_POST_META[p.type].emoji, 32),
      popup: popup(`${DISASTER_POST_META[p.type].emoji} ${escapeHtml(p.name)}`, [
        DISASTER_POST_META[p.type].label,
        p.capacity ? `Terisi ${p.occupants}/${p.capacity} orang` : undefined,
        p.needs.length ? `Butuh: ${escapeHtml(p.needs.join(", "))}` : undefined,
        `${escapeHtml(p.contactName)} · ${escapeHtml(p.contactPhone)}`,
      ], "#1d4ed8"),
    }));
}

export function vulnerableMarkers(state: KeamananState): MapMarker[] {
  const emoji: Record<string, string> = { LANSIA: "🧓", BALITA: "👶", DISABILITAS: "♿" };
  return state.vulnerable.map((v) => ({
    id: `vul_${v.id}`,
    lat: v.lat,
    lng: v.lng,
    size: 24,
    html: badge("bg-pink-500", emoji[v.socialCategory] ?? "❤️", 24),
    popup: popup(`${escapeHtml(v.headName)} · ${escapeHtml(v.blockNumber)}`, [v.socialCategory, v.phone && escapeHtml(v.phone)], "#be185d"),
  }));
}

export function safetyCheckinMarkers(state: KeamananState, since?: string): MapMarker[] {
  const latestByBlock = new Map<string, KeamananState["safetyCheckins"][number]>();
  state.safetyCheckins
    .filter((c) => !since || c.createdAt >= since)
    .forEach((c) => {
      const prev = latestByBlock.get(c.houseBlock);
      if (!prev || prev.createdAt < c.createdAt) latestByBlock.set(c.houseBlock, c);
    });
  const housesByBlock = new Map(state.houses.map((h) => [h.blockNumber.toUpperCase(), h]));
  return Array.from(latestByBlock.values()).flatMap((c) => {
    const house = housesByBlock.get(c.houseBlock.toUpperCase());
    const lat = c.lat ?? house?.lat;
    const lng = c.lng ?? house?.lng;
    if (lat == null || lng == null) return [];
    const help = c.status === "BUTUH_BANTUAN";
    return [{
      id: c.id,
      lat,
      lng,
      size: help ? 32 : 22,
      zIndex: help ? 900 : 50,
      html: badge(help ? "bg-red-600" : "bg-emerald-500", help ? "🆘" : "✓", help ? 32 : 22, help ? "animate-pulse" : ""),
      popup: popup(`${escapeHtml(c.name)} · ${escapeHtml(c.houseBlock)}`, [
        help ? "<b style='color:#dc2626'>BUTUH BANTUAN</b>" : "Aman",
        `${c.peopleCount} orang · ${timeAgo(c.createdAt)}`,
        c.note && escapeHtml(c.note),
      ]),
    }];
  });
}
