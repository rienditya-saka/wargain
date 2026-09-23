import { CollectionKey } from "./types";

// Client collection -> Supabase table. Row fields map 1:1 to (camelCase) columns.
export const COLLECTION_TABLES: Record<CollectionKey, string> = {
  alerts: "security_panic_alerts",
  shifts: "security_ronda_shifts",
  checkpoints: "security_patrol_checkpoints",
  gateLogs: "security_gate_logs",
  invites: "security_guest_invites",
  incidents: "security_incident_reports",
  houseWatches: "security_house_watches",
  watchlist: "security_watchlist",
  lostFound: "security_lost_found",
  handovers: "security_shift_handovers",
  fines: "security_ronda_fines",
  vehicles: "security_resident_vehicles",
  vehicleLogs: "security_vehicle_access_logs",
  workers: "security_worker_passes",
  cctvs: "security_cctv_cameras",
  disasterPosts: "security_disaster_posts",
  safetyCheckins: "security_safety_checkins",
};

export const COLLECTION_KEYS = Object.keys(COLLECTION_TABLES) as CollectionKey[];

export const COLLECTION_QUERY: Record<CollectionKey, { orderBy: string; ascending: boolean; limit: number }> = {
  alerts: { orderBy: "createdAt", ascending: false, limit: 200 },
  shifts: { orderBy: "date", ascending: true, limit: 120 },
  checkpoints: { orderBy: "name", ascending: true, limit: 100 },
  gateLogs: { orderBy: "inAt", ascending: false, limit: 300 },
  invites: { orderBy: "createdAt", ascending: false, limit: 200 },
  incidents: { orderBy: "createdAt", ascending: false, limit: 300 },
  houseWatches: { orderBy: "createdAt", ascending: false, limit: 100 },
  watchlist: { orderBy: "createdAt", ascending: false, limit: 200 },
  lostFound: { orderBy: "createdAt", ascending: false, limit: 200 },
  handovers: { orderBy: "createdAt", ascending: false, limit: 60 },
  fines: { orderBy: "createdAt", ascending: false, limit: 300 },
  vehicles: { orderBy: "houseBlock", ascending: true, limit: 500 },
  vehicleLogs: { orderBy: "createdAt", ascending: false, limit: 300 },
  workers: { orderBy: "createdAt", ascending: false, limit: 300 },
  cctvs: { orderBy: "name", ascending: true, limit: 100 },
  disasterPosts: { orderBy: "name", ascending: true, limit: 50 },
  safetyCheckins: { orderBy: "createdAt", ascending: false, limit: 500 },
};

export function isCollectionKey(value: string): value is CollectionKey {
  return value in COLLECTION_TABLES;
}
