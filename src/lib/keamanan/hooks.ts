import { CommunityContext } from "@/lib/community/context";
import { notify } from "@/lib/notifications/server";
import { PENGURUS_ROLES } from "@/lib/notifications/registry";
import { publishFeedPost, updateFeedPostByEntity } from "@/lib/feed/server";
import {
  CollectionKey,
  DisasterPost,
  GateLog,
  IncidentReport,
  INCIDENT_CATEGORY_LABEL,
  LOST_FOUND_CATEGORY_META,
  LostFoundItem,
  PANIC_TYPE_META,
  PanicAlert,
  SecuritySettings,
  WatchlistEntry,
} from "./types";

type Row = Record<string, any>;
const HOUR = 3_600_000;

// Side effects of keamanan changes: notifications + feed posts. prev is the row before the upsert
// (undefined for a new row). All helpers swallow errors, so the sync itself never fails because of them.
export async function runKeamananHooks(communityId: string, ctx: CommunityContext, key: CollectionKey, row: Row, prev?: Row) {
  switch (key) {
    case "alerts":
      return onPanic(communityId, ctx, row as PanicAlert, prev as PanicAlert | undefined);
    case "watchlist":
      return onWatchlist(communityId, ctx, row as WatchlistEntry, prev as WatchlistEntry | undefined);
    case "lostFound":
      return onLostFound(communityId, ctx, row as LostFoundItem, prev as LostFoundItem | undefined);
    case "gateLogs":
      return onGate(communityId, ctx, row as GateLog, prev as GateLog | undefined);
    case "incidents":
      return onIncident(communityId, ctx, row as IncidentReport, prev as IncidentReport | undefined);
    default:
      return;
  }
}

async function onPanic(communityId: string, ctx: CommunityContext, a: PanicAlert, prev?: PanicAlert) {
  const meta = PANIC_TYPE_META[a.type] ?? PANIC_TYPE_META.LAINNYA;
  const entity = { type: "SECURITY_PANIC", id: a.id };
  if (!prev && a.status === "BARU") {
    await notify({
      communityId, ctx, type: "SECURITY_PANIC", entity,
      title: `🚨 PANIC ${meta.label.toUpperCase()}: ${a.senderName} (${a.houseBlock})`,
      body: `${a.note ? `"${a.note}" · ` : ""}Buka Command Center untuk melihat titik GPS & merespon.`,
      link: "/keamanan?tab=darurat",
      target: { roles: PENGURUS_ROLES },
      actorName: a.senderName,
      dedupeKey: `panic:${a.id}`,
    });
    return;
  }
  if (prev && prev.status === "BARU" && a.status === "DIRESPON") {
    await notify({
      communityId, ctx, type: "SECURITY_PANIC_RESPONDED", entity,
      title: `🛡️ ${a.responder ?? "Petugas"} sedang menuju lokasi Anda`,
      body: `Sinyal ${meta.label.toLowerCase()} dari ${a.houseBlock} sudah direspon. Tetap tenang & cari tempat aman.`,
      link: "/keamanan?tab=darurat",
      target: { houseBlocks: [a.houseBlock] },
      dedupeKey: `panic-resp:${a.id}`,
    });
  }
}

async function onWatchlist(communityId: string, ctx: CommunityContext, w: WatchlistEntry, prev?: WatchlistEntry) {
  const entity = { type: "SECURITY_WATCHLIST", id: w.id };
  if (prev?.active && !w.active) {
    await updateFeedPostByEntity(communityId, "KEAMANAN", entity, { status: "HIDDEN" });
    return;
  }
  if (!w.active) return;
  const changed = !prev || prev.level !== w.level || prev.description !== w.description || prev.lastSeenAt !== w.lastSeenAt;
  if (!changed) return;

  await publishFeedPost({
    communityId, module: "KEAMANAN", type: "SECURITY_ALERT", entity,
    title: `${w.level === "BAHAYA" ? "⚠️ BAHAYA" : "Waspada"}: ${w.label}`,
    content: w.description,
    images: w.photoUrl ? [w.photoUrl] : [],
    payload: { kind: w.kind, level: w.level, plate: w.plate, lastSeenAt: w.lastSeenAt, lastSeenLocation: w.lastSeenLocation, lat: w.lat, lng: w.lng },
    author: { name: "Tim Keamanan RT", role: "KEAMANAN" },
    bump: !prev || prev.lastSeenAt !== w.lastSeenAt,
  });

  const escalated = w.level === "BAHAYA" && (!prev || prev.level !== "BAHAYA");
  const sightedAgain = w.level === "BAHAYA" && prev && prev.lastSeenAt !== w.lastSeenAt;
  if (escalated || sightedAgain) {
    await notify({
      communityId, ctx, type: "SECURITY_WATCHLIST", entity,
      title: `⚠️ ${sightedAgain ? "Terlihat lagi" : "Waspada"}: ${w.label}${w.plate ? ` (${w.plate})` : ""}`,
      body: `${w.lastSeenLocation ? `Lokasi: ${w.lastSeenLocation}. ` : ""}${w.description}`,
      link: "/keamanan?tab=waspada",
      target: { all: true },
      dedupeKey: `watch:${w.id}:${w.lastSeenAt ?? ""}`,
    });
  }
}

async function onLostFound(communityId: string, ctx: CommunityContext, l: LostFoundItem, prev?: LostFoundItem) {
  const meta = LOST_FOUND_CATEGORY_META[l.category];
  const entity = { type: "LOST_FOUND", id: l.id };
  const urgent = l.type === "HILANG" && meta?.urgent;
  if (!prev) {
    await publishFeedPost({
      communityId, module: "KEAMANAN", type: "LOST_FOUND", entity,
      title: `${l.type === "HILANG" ? "🔎 DICARI" : "📦 DITEMUKAN"}: ${l.title}`,
      content: l.description,
      images: l.photoUrl ? [l.photoUrl] : [],
      payload: { kind: l.type, category: l.category, lastSeenLocation: l.lastSeenLocation, contactName: l.contactName, contactPhone: l.contactPhone, reward: l.reward, status: l.status },
      author: { name: l.contactName, role: "WARGA", block: l.houseBlock ?? null },
      pinnedUntil: urgent ? new Date(Date.now() + 24 * HOUR).toISOString() : null,
    });
    if (urgent) {
      await notify({
        communityId, ctx, type: "SECURITY_LOST_URGENT", entity,
        title: `🚨 DICARI SEGERA: ${l.title}`,
        body: `${meta.emoji} Terakhir terlihat di ${l.lastSeenLocation}. Jika melihat, hubungi ${l.contactName} (${l.contactPhone}).`,
        link: "/keamanan?tab=hilang",
        target: { all: true },
        dedupeKey: `lost:${l.id}`,
      });
    }
    return;
  }
  if (prev.status !== l.status && l.status === "SELESAI") {
    await updateFeedPostByEntity(communityId, "KEAMANAN", entity, { payload: { status: "SELESAI" }, pinnedUntil: null });
  }
}

async function onGate(communityId: string, ctx: CommunityContext, g: GateLog, prev?: GateLog) {
  if (g.status !== "MENUNGGU_KONFIRMASI" || prev?.status === "MENUNGGU_KONFIRMASI") return;
  await notify({
    communityId, ctx, type: "SECURITY_GUEST_WAITING", entity: { type: "GATE_LOG", id: g.id },
    title: `🚪 ${g.name} menunggu di gerbang`,
    body: `${g.purpose}${g.plate ? ` · ${g.plate}` : ""}. Izinkan atau tolak dari menu Tamu Saya.`,
    link: "/keamanan?tab=gerbang",
    target: { houseBlocks: [g.destinationBlock] },
    actorName: g.officer,
    dedupeKey: `gate:${g.id}`,
  });
}

async function onIncident(communityId: string, ctx: CommunityContext, r: IncidentReport, prev?: IncidentReport) {
  if (prev) return;
  await notify({
    communityId, ctx, type: "SECURITY_INCIDENT", entity: { type: "INCIDENT", id: r.id },
    title: `📝 Laporan baru: ${r.title}`,
    body: `${INCIDENT_CATEGORY_LABEL[r.category]} · ${r.location} · oleh ${r.reporter}`,
    link: "/keamanan?tab=laporan",
    target: { roles: PENGURUS_ROLES },
    dedupeKey: `incident:${r.id}`,
  });
}

export async function runDisasterHook(communityId: string, ctx: CommunityContext, next: SecuritySettings, prev: SecuritySettings | null, posts: DisasterPost[]) {
  const wasActive = !!prev?.disasterActive;
  if (next.disasterActive === wasActive) return;
  const startedAt = next.disasterStartedAt ?? prev?.disasterStartedAt ?? new Date().toISOString();
  const entity = { type: "DISASTER", id: startedAt };

  if (next.disasterActive) {
    const active = posts.filter((p) => p.active).map((p) => p.name);
    await publishFeedPost({
      communityId, module: "KEAMANAN", type: "DISASTER", entity,
      title: `🌊 SIAGA BENCANA: ${next.disasterTitle ?? "Bencana"}`,
      content: `Laporkan kondisi keluarga Anda (Aman / Butuh Bantuan) di menu Posko Bencana.${active.length ? ` Posko & titik kumpul: ${active.join(", ")}.` : ""}`,
      payload: { active: true, title: next.disasterTitle, startedAt, posts: active },
      author: { name: "Pengurus RT", role: "KEAMANAN" },
      pinnedUntil: new Date(Date.now() + 7 * 24 * HOUR).toISOString(),
    });
    await notify({
      communityId, ctx, type: "SECURITY_DISASTER", entity,
      title: `🚨 SIAGA BENCANA: ${next.disasterTitle ?? "Bencana"}`,
      body: "Buka aplikasi & laporkan kondisi keluarga Anda. Ikuti arahan petugas, cek posko terdekat.",
      link: "/keamanan?tab=bencana",
      target: { all: true },
      dedupeKey: `disaster:${startedAt}`,
    });
  } else {
    await updateFeedPostByEntity(communityId, "KEAMANAN", entity, { payload: { active: false, endedAt: new Date().toISOString() }, pinnedUntil: null });
    await notify({
      communityId, ctx, type: "SECURITY_DISASTER", entity, priority: "NORMAL",
      title: `✅ Status siaga ${next.disasterTitle ?? "bencana"} dicabut`,
      body: "Kondisi sudah aman. Terima kasih atas kerja sama seluruh warga.",
      link: "/keamanan?tab=bencana",
      target: { all: true },
      dedupeKey: `disaster-end:${startedAt}`,
    });
  }
}
