"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseClient } from "@/lib/supabase-client";
import { COLLECTION_KEYS, COLLECTION_TABLES } from "./tables";
import { CollectionKey, KeamananState, KeamananUpdater, SecuritySettings } from "./types";

// Two modes:
// - "supabase": state loads from /api/keamanan/state, every update is diffed and
//   persisted through /api/keamanan/sync, other devices' changes arrive via Realtime.
// - "demo": security tables not migrated yet; state lives in localStorage and syncs
//   across tabs through the `storage` event.
const STORAGE_KEY = "wargain_keamanan_v2";

export type KeamananMode = "loading" | "supabase" | "demo";

export const COMMUNITY_CENTER = { lat: -6.2615, lng: 106.8106 };

export const SECURITY_POSTS = [
  { id: "pos_utama", name: "Pos Satpam Gerbang Utama", lat: -6.2606, lng: 106.8095 },
  { id: "pos_ronda", name: "Pos Ronda Blok C", lat: -6.2627, lng: 106.8121 },
];

export function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function minutesAgo(min: number) {
  return new Date(Date.now() - min * 60_000).toISOString();
}

function daysFromToday(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return toDateKey(d);
}

function near(dLat: number, dLng: number) {
  return { lat: COMMUNITY_CENTER.lat + dLat, lng: COMMUNITY_CENTER.lng + dLng };
}

const RONDA_ROSTER = [
  ["Pak Bambang", "A-01"], ["Pak Hendra", "A-07"], ["Mas Rizky", "B-03"], ["Pak Joko", "B-11"],
  ["Pak Slamet", "C-02"], ["Mas Dimas", "C-09"], ["Pak Agus", "D-04"], ["Pak Yusuf", "D-12"],
  ["Pak Rahmat", "E-05"], ["Mas Fajar", "E-08"], ["Pak Wawan", "F-01"], ["Pak Teguh", "F-06"],
  ["Pak Andi", "G-03"], ["Mas Bayu", "G-10"],
];

export interface SeedResident {
  name: string;
  houseBlock: string;
}

export const DEFAULT_SETTINGS: SecuritySettings = {
  id: "settings_local",
  kawasanType: "CLUSTER",
  rondaFineEnabled: true,
  rondaFineAmount: 20000,
  disasterActive: false,
};

function seedShifts(resident?: SeedResident): KeamananState["shifts"] {
  return Array.from({ length: 7 }, (_, i) => {
    const offset = i - 1;
    // Put the logged-in resident on tonight's shift so the warga flow is demoable.
    const a = offset === 0 && resident ? [resident.name, resident.houseBlock] : RONDA_ROSTER[(i * 2) % RONDA_ROSTER.length];
    const b = RONDA_ROSTER[(i * 2 + 1) % RONDA_ROSTER.length];
    const past = offset < 0;
    return {
      id: uid("shift"),
      date: daysFromToday(offset),
      startTime: "22:00",
      endTime: "04:00",
      post: i % 2 === 0 ? "Pos Ronda Blok C" : "Pos Satpam Gerbang Utama",
      members: [
        { name: a[0], houseBlock: a[1], status: past ? "HADIR" : "BELUM", checkInAt: past ? minutesAgo(60 * 24) : undefined },
        { name: b[0], houseBlock: b[1], status: past ? "ALPA" : "BELUM" },
      ],
    };
  });
}

function seedHouses(): KeamananState["houses"] {
  const blocks = ["A", "B", "C", "D", "E", "F", "G"];
  const statuses = ["DITEMPATI", "DITEMPATI", "DITEMPATI", "KOSONG", "DITEMPATI", "RENOVASI", "DITEMPATI", "DISEWAKAN"];
  return blocks.flatMap((blk, bi) =>
    [1, 4, 8, 11].map((n, ni) => {
      const p = near((bi - 3) * 0.00055, (ni - 1.5) * 0.0007);
      return {
        id: `demo_house_${blk}${n}`,
        blockNumber: `${blk}-${String(n).padStart(2, "0")}`,
        ownerName: RONDA_ROSTER[(bi * 2 + ni) % RONDA_ROSTER.length][0],
        occupancyStatus: statuses[(bi + ni * 3) % statuses.length],
        lat: p.lat,
        lng: p.lng,
      };
    })
  );
}

export function createSeedState(resident?: SeedResident): KeamananState {
  const hostName = resident?.name ?? "Pak Bambang";
  const hostBlock = resident?.houseBlock ?? "A-01";

  return {
    alerts: [
      {
        id: uid("sos"),
        senderName: "Ibu Sari Wulandari",
        houseBlock: "D-08",
        phone: "081298765432",
        type: "MEDIS",
        note: "Bapak pingsan di kamar mandi",
        ...near(-0.0016, 0.0006),
        createdAt: minutesAgo(60 * 26),
        status: "SELESAI",
        responder: "Satpam Budi",
        respondedAt: minutesAgo(60 * 26 - 3),
        resolvedAt: minutesAgo(60 * 25),
        resolutionNote: "Dibawa ke RS dengan mobil Pak RT",
      },
    ],
    shifts: seedShifts(resident),
    checkpoints: [
      { id: uid("cp"), name: "Gerbang Utama", lat: -6.2604, lng: 106.8093, lastScanAt: minutesAgo(40), lastScanBy: "Satpam Budi" },
      { id: uid("cp"), name: "Taman Bermain Blok B", lat: -6.2612, lng: 106.8114, lastScanAt: minutesAgo(95), lastScanBy: "Satpam Budi" },
      { id: uid("cp"), name: "Masjid Al-Ikhlas", lat: -6.2622, lng: 106.8101 },
      { id: uid("cp"), name: "Pintu Belakang (Kali)", lat: -6.2638, lng: 106.8127, lastScanAt: minutesAgo(250), lastScanBy: "Pak Hendra" },
      { id: uid("cp"), name: "Lapangan Blok F", lat: -6.2629, lng: 106.8089 },
    ],
    gateLogs: [
      {
        id: uid("gate"), kind: "TAMU", name: "Sdr. Yoga (teman kantor)", plate: "B 6677 PQR",
        destinationBlock: hostBlock, purpose: "Ambil dokumen", inAt: minutesAgo(2), status: "MENUNGGU_KONFIRMASI", officer: "Satpam Budi",
      },
      {
        id: uid("gate"), kind: "KURIR", name: "J&T Express - Andre", plate: "B 4521 KJT",
        destinationBlock: "B-03", purpose: "Antar paket", inAt: minutesAgo(12), status: "DIIZINKAN", officer: "Satpam Budi",
      },
      {
        id: uid("gate"), kind: "PEKERJA", name: "Tukang AC - Pak Maman", plate: "B 3312 TUV",
        destinationBlock: "A-07", purpose: "Service AC", inAt: minutesAgo(80), status: "DIIZINKAN", officer: "Satpam Budi",
      },
      {
        id: uid("gate"), kind: "TAMU", name: "Keluarga Bpk. Harun", plate: "D 1180 AB",
        destinationBlock: "C-02", purpose: "Silaturahmi", inAt: minutesAgo(60 * 5), outAt: minutesAgo(60 * 3), status: "KELUAR", officer: "Satpam Eko",
      },
    ],
    invites: [
      { id: uid("inv"), code: `WG-${uid("").slice(-4).toUpperCase()}`, guestName: "Rina (Adik)", plate: "B 2210 XYZ", hostName, hostBlock, visitDate: daysFromToday(0), used: false },
    ],
    incidents: [
      {
        id: uid("inc"), category: "FASILITAS_RUSAK", title: "Lampu jalan Blok E mati",
        description: "Sudah 3 malam lampu PJU depan E-05 s/d E-10 mati, jalan jadi gelap.",
        location: "Jl. Blok E", reporter: "Pak Rahmat", anonymous: false, createdAt: minutesAgo(60 * 30), status: "DITINDAKLANJUTI",
        followUp: "Sudah dilaporkan ke PLN, teknisi dijadwalkan Kamis.", ...near(0.0006, -0.0004),
      },
      {
        id: uid("inc"), category: "ORANG_MENCURIGAKAN", title: "Motor mondar-mandir tanpa plat",
        description: "2 orang berboncengan motor matic hitam tanpa plat, 3x lewat depan rumah sambil lihat-lihat.",
        location: "Depan Blok G", reporter: "Anonim", anonymous: true, createdAt: minutesAgo(60 * 4), status: "DILAPORKAN", ...near(0.0016, 0.0008),
      },
      {
        id: uid("inc"), category: "PENCURIAN", title: "Helm hilang di carport",
        description: "Helm di atas motor hilang dini hari sekitar jam 02.00.",
        location: "G-10", reporter: "Mas Bayu (G-10)", anonymous: false, createdAt: minutesAgo(60 * 24 * 3 + 120), status: "SELESAI", ...near(0.0017, 0.0011),
      },
      {
        id: uid("inc"), category: "PENCURIAN", title: "Percobaan congkel pagar",
        description: "Ada bekas congkelan di gembok pagar, CCTV menangkap 1 orang jam 01.40.",
        location: "G-03", reporter: "Pak Andi (G-03)", anonymous: false, createdAt: minutesAgo(60 * 24 * 6 + 200), status: "DITINDAKLANJUTI", ...near(0.0015, 0.0005),
      },
      {
        id: uid("inc"), category: "KERIBUTAN", title: "Balap liar malam minggu",
        description: "Motor knalpot brong kebut-kebutan di jalan belakang.",
        location: "Jalan belakang kali", reporter: "Anonim", anonymous: true, createdAt: minutesAgo(60 * 24 * 2 + 60), status: "DILAPORKAN", ...near(-0.0022, 0.0019),
      },
    ],
    houseWatches: [
      {
        id: uid("hw"), houseBlock: "F-06", ownerName: "Pak Teguh", contact: "081311112222",
        from: daysFromToday(-2), to: daysFromToday(5), note: "Mudik ke Solo. Lampu teras nyala otomatis, kunci cadangan di Pak RT.",
        checks: [{ at: minutesAgo(60 * 9), by: "Satpam Eko", note: "Pagar terkunci, aman" }], ...near(-0.0012, -0.0009),
      },
    ],
    watchlist: [
      {
        id: uid("watch"), kind: "KENDARAAN", label: "Motor matic hitam tanpa plat",
        description: "2 orang, jaket hitam, helm full face. Sering lihat-lihat rumah kosong.",
        level: "WASPADA", lastSeenAt: minutesAgo(60 * 4), lastSeenLocation: "Depan Blok G", ...near(0.0016, 0.0008),
        reportedBy: "Satpam Budi", active: true, createdAt: minutesAgo(60 * 4),
      },
      {
        id: uid("watch"), kind: "KENDARAAN", label: "Avanza silver", plate: "B 1777 XX",
        description: "Terekam CCTV saat percobaan congkel pagar G-03. Sudah dilaporkan ke Polsek.",
        level: "BAHAYA", lastSeenAt: minutesAgo(60 * 24 * 6), lastSeenLocation: "Gerbang belakang", ...near(-0.0023, 0.0021),
        reportedBy: "Ketua RT", active: true, createdAt: minutesAgo(60 * 24 * 6),
      },
      {
        id: uid("watch"), kind: "ORANG", label: "Sales door-to-door mengaku petugas PLN",
        description: "Pria ±40 th, rompi oranye, minta masuk rumah untuk 'cek meteran'. PLN tidak pernah mengirim petugas tanpa surat tugas.",
        level: "WASPADA", lastSeenAt: minutesAgo(60 * 30), lastSeenLocation: "Blok D", ...near(-0.0009, 0.0002),
        reportedBy: "Ibu Sari (D-08)", active: true, createdAt: minutesAgo(60 * 30),
      },
    ],
    lostFound: [
      {
        id: uid("lf"), type: "HILANG", category: "HEWAN", title: "Kucing oren 'Mochi'",
        description: "Kucing jantan oren, kalung merah dengan lonceng. Jinak, takut suara motor.",
        lastSeenLocation: "Taman Blok B", ...near(0.0003, 0.0008), contactName: "Mas Rizky", contactPhone: "081355556666",
        houseBlock: "B-03", reward: 200000, status: "AKTIF", createdAt: minutesAgo(60 * 20),
      },
      {
        id: uid("lf"), type: "DITEMUKAN", category: "DOKUMEN", title: "Dompet coklat berisi KTP & SIM",
        description: "Ditemukan di dekat masjid setelah sholat Jumat. Dititipkan di pos satpam.",
        lastSeenLocation: "Masjid Al-Ikhlas", lat: -6.2622, lng: 106.8101, contactName: "Pos Satpam", contactPhone: "081200001111",
        status: "AKTIF", createdAt: minutesAgo(60 * 50),
      },
    ],
    handovers: [
      {
        id: uid("ho"), shiftLabel: "Malam (22:00-06:00)", fromOfficer: "Satpam Eko", toOfficer: "Satpam Budi",
        summary: "Malam aman. Jam 01.30 ada motor tanpa plat lewat 2x, sudah dicatat di daftar waspada. Lampu PJU Blok E masih mati.",
        checklist: [
          { item: "Kunci gerbang & portal", ok: true },
          { item: "HT / radio (2 unit)", ok: true },
          { item: "Senter & baterai", ok: false, note: "Baterai senter habis, perlu beli" },
          { item: "Monitor CCTV normal", ok: true },
          { item: "Buku tamu terisi", ok: true },
        ],
        packagesHeld: 3, keysHeld: "Kunci cadangan F-06 (titip rumah)", createdAt: minutesAgo(60 * 3),
        acknowledgedAt: minutesAgo(60 * 3 - 5), acknowledgedBy: "Satpam Budi",
      },
    ],
    fines: [],
    vehicles: [
      { id: uid("veh"), plate: "B 1234 ABC", type: "MOBIL", brandColor: "Honda HR-V Putih", ownerName: hostName, houseBlock: hostBlock, stickerCode: "STK-0001", rfidTag: "RFID-8F21A0", status: "AKTIF", createdAt: minutesAgo(60 * 24 * 60) },
      { id: uid("veh"), plate: "B 3456 KLM", type: "MOTOR", brandColor: "Yamaha NMAX Hitam", ownerName: "Pak Hendra", houseBlock: "A-07", stickerCode: "STK-0002", status: "AKTIF", createdAt: minutesAgo(60 * 24 * 40) },
      { id: uid("veh"), plate: "B 9012 DEF", type: "MOBIL", brandColor: "Toyota Innova Hitam", ownerName: "Pak Joko", houseBlock: "B-11", status: "MENUNGGU_VERIFIKASI", createdAt: minutesAgo(60 * 5) },
    ],
    vehicleLogs: [
      { id: uid("vlog"), plate: "B 1234 ABC", direction: "KELUAR", method: "RFID", result: "WARGA", matchedLabel: `${hostName} (${hostBlock})`, gateOpened: true, officer: "Sistem", createdAt: minutesAgo(60 * 2) },
      { id: uid("vlog"), plate: "B 6677 PQR", direction: "MASUK", method: "ANPR", result: "TIDAK_DIKENAL", gateOpened: false, confidence: 0.91, officer: "Satpam Budi", createdAt: minutesAgo(2) },
    ],
    workers: [
      {
        id: uid("wp"), code: `PK-${uid("").slice(-4).toUpperCase()}`, name: "Bi Iyah", role: "ART", phone: "081277778888", employerName: hostName, houseBlock: hostBlock,
        validFrom: daysFromToday(-30), validUntil: daysFromToday(150), allowedDays: [1, 2, 3, 4, 5, 6], allowedStart: "06:30", allowedEnd: "16:00",
        liveIn: false, status: "AKTIF", createdAt: minutesAgo(60 * 24 * 30),
      },
      {
        id: uid("wp"), code: `PK-${uid("").slice(-4).toUpperCase()}`, name: "Pak Udin", role: "TUKANG_KEBUN", phone: "081299990000", employerName: "Pak Hendra", houseBlock: "A-07",
        validFrom: daysFromToday(-10), validUntil: daysFromToday(80), allowedDays: [3, 6], allowedStart: "07:00", allowedEnd: "12:00",
        liveIn: false, status: "AKTIF", createdAt: minutesAgo(60 * 24 * 10),
      },
    ],
    cctvs: [
      { id: uid("cctv"), name: "Gerbang Utama (Masuk)", location: "Pos satpam", lat: -6.2605, lng: 106.8094, streamType: "BELUM_DIATUR", ownerType: "RT", ownerName: "Pengurus RT", isShared: true, status: "ONLINE", createdAt: minutesAgo(60 * 24 * 90) },
      { id: uid("cctv"), name: "Perempatan Blok C-D", location: "Tiang PJU C-D", ...near(-0.0008, 0.0006), streamType: "BELUM_DIATUR", ownerType: "RT", ownerName: "Pengurus RT", isShared: true, status: "ONLINE", createdAt: minutesAgo(60 * 24 * 90) },
      { id: uid("cctv"), name: "Jalan Belakang Kali", location: "Pintu belakang", lat: -6.2637, lng: 106.8126, streamType: "BELUM_DIATUR", ownerType: "RT", ownerName: "Pengurus RT", isShared: true, status: "OFFLINE", createdAt: minutesAgo(60 * 24 * 90) },
      { id: uid("cctv"), name: "Depan Rumah G-03", location: "Teras G-03", ...near(0.0015, 0.0005), streamType: "BELUM_DIATUR", ownerType: "WARGA", ownerName: "Pak Andi", isShared: true, status: "ONLINE", createdAt: minutesAgo(60 * 24 * 7) },
    ],
    disasterPosts: [
      {
        id: uid("posko"), name: "Masjid Al-Ikhlas", type: "POSKO", lat: -6.2622, lng: 106.8101, capacity: 150, occupants: 0,
        contactName: "Pak Slamet (DKM)", contactPhone: "081244445555", needs: ["Tikar", "Selimut", "Air mineral"], active: true, createdAt: minutesAgo(60 * 24 * 90),
      },
      {
        id: uid("posko"), name: "Lapangan Blok F", type: "TITIK_KUMPUL", lat: -6.2629, lng: 106.8089, capacity: 400, occupants: 0,
        contactName: "Koordinator Keamanan", contactPhone: "081200001111", needs: [], active: true, createdAt: minutesAgo(60 * 24 * 90),
      },
      {
        id: uid("posko"), name: "Balai Warga", type: "POSKO_KESEHATAN", ...near(0.0002, -0.0012), capacity: 30, occupants: 0,
        contactName: "Bu Bidan Rina", contactPhone: "081266667777", needs: ["Obat demam", "Oralit"], active: true, createdAt: minutesAgo(60 * 24 * 90),
      },
    ],
    safetyCheckins: [],
    settings: { ...DEFAULT_SETTINGS },
    houses: seedHouses(),
    vulnerable: [
      { id: "demo_vul_1", headName: "Mbah Karto", blockNumber: "C-04", socialCategory: "LANSIA", phone: "081211110000", ...near(0.0, -0.0004) },
      { id: "demo_vul_2", headName: "Ibu Nur (bayi 3 bln)", blockNumber: "E-08", socialCategory: "BALITA", phone: "081211112222", ...near(0.0011, 0.0003) },
      { id: "demo_vul_3", headName: "Pak Darto (kursi roda)", blockNumber: "B-08", socialCategory: "DISABILITAS", phone: "081211113333", ...near(-0.0011, 0.0004) },
    ],
  };
}

function withDefaults(partial: Partial<KeamananState>, resident?: SeedResident): KeamananState {
  const seed = createSeedState(resident);
  const merged = { ...seed } as KeamananState;
  (Object.keys(seed) as (keyof KeamananState)[]).forEach((k) => {
    if (partial[k] !== undefined && partial[k] !== null) (merged as any)[k] = partial[k];
  });
  return merged;
}

function loadLocal(resident?: SeedResident): KeamananState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return withDefaults(JSON.parse(raw), resident);
  } catch {
    // ignore corrupt/blocked storage and fall back to seed
  }
  return createSeedState(resident);
}

function saveLocal(state: KeamananState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full/blocked: keep in-memory state
  }
}

interface SyncPayload {
  upserts: Partial<Record<CollectionKey, unknown[]>>;
  deletes: Partial<Record<CollectionKey, string[]>>;
  settings?: SecuritySettings;
}

// Immutable updates mean a changed row is a new object; identity comparison finds the diff.
function diffState(prev: KeamananState, next: KeamananState): SyncPayload | null {
  const payload: SyncPayload = { upserts: {}, deletes: {} };
  let dirty = false;
  COLLECTION_KEYS.forEach((key) => {
    const before = prev[key] as { id: string }[];
    const after = next[key] as { id: string }[];
    if (before === after) return;
    const beforeById = new Map(before.map((r) => [r.id, r]));
    const changed = after.filter((r) => beforeById.get(r.id) !== r);
    const afterIds = new Set(after.map((r) => r.id));
    const removed = before.filter((r) => !afterIds.has(r.id)).map((r) => r.id);
    if (changed.length) {
      payload.upserts[key] = changed;
      dirty = true;
    }
    if (removed.length) {
      payload.deletes[key] = removed;
      dirty = true;
    }
  });
  if (prev.settings !== next.settings) {
    payload.settings = next.settings;
    dirty = true;
  }
  return dirty ? payload : null;
}

function tableToCollection(table: string): CollectionKey | undefined {
  return COLLECTION_KEYS.find((k) => COLLECTION_TABLES[k] === table);
}

export interface KeamananStore {
  state: KeamananState | null;
  update: KeamananUpdater;
  mode: KeamananMode;
  syncError: string | null;
  loadSampleData: () => Promise<void>;
  refresh: () => Promise<void>;
  issueFine: (fine: KeamananState["fines"][number]) => Promise<{ ok: boolean; error?: string }>;
}

export function useKeamananState(communityId: string, resident?: SeedResident): KeamananStore {
  const residentRef = useRef(resident);
  residentRef.current = resident;
  const stateRef = useRef<KeamananState | null>(null);
  const modeRef = useRef<KeamananMode>("loading");
  const syncChainRef = useRef<Promise<void>>(Promise.resolve());

  const [state, setStateRaw] = useState<KeamananState | null>(null);
  const [mode, setModeRaw] = useState<KeamananMode>("loading");
  const [syncError, setSyncError] = useState<string | null>(null);

  const setState = useCallback((next: KeamananState) => {
    stateRef.current = next;
    setStateRaw(next);
  }, []);

  const setMode = useCallback((m: KeamananMode) => {
    modeRef.current = m;
    setModeRaw(m);
  }, []);

  // Requests run one after another so upserts of the same row land in order.
  const pushSync = useCallback(
    (payload: SyncPayload) => {
      syncChainRef.current = syncChainRef.current.then(async () => {
        try {
          const res = await fetch("/api/keamanan/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ communityId, ...payload }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setSyncError(data.errors?.join("; ") || data.error || "Gagal menyimpan ke server");
          } else {
            setSyncError(null);
          }
        } catch {
          setSyncError("Koneksi terputus, perubahan belum tersimpan ke server");
        }
      });
      return syncChainRef.current;
    },
    [communityId]
  );

  const fetchRemote = useCallback(async () => {
    const res = await fetch(`/api/keamanan/state?communityId=${encodeURIComponent(communityId)}`);
    const data = await res.json();
    return data as { ready: boolean; state?: Partial<KeamananState>; error?: string };
  }, [communityId]);

  const hydrateRemote = useCallback(
    (remote: Partial<KeamananState>) => {
      const collections = {} as Record<CollectionKey, unknown[]>;
      COLLECTION_KEYS.forEach((k) => (collections[k] = (remote[k] as unknown[]) ?? []));
      setState({
        ...(collections as unknown as KeamananState),
        settings: remote.settings ?? { ...DEFAULT_SETTINGS },
        houses: remote.houses ?? [],
        vulnerable: remote.vulnerable ?? [],
      });
    },
    [setState]
  );

  // Initial load: prefer Supabase, fall back to demo when tables are missing.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const remote = await fetchRemote();
        if (cancelled) return;
        if (remote.ready && remote.state) {
          hydrateRemote(remote.state);
          setMode("supabase");
          return;
        }
        console.info("[keamanan] Supabase belum siap, memakai mode demo:", remote.error);
      } catch (err) {
        console.info("[keamanan] Gagal memuat dari server, memakai mode demo", err);
      }
      if (cancelled) return;
      setState(loadLocal(residentRef.current));
      setMode("demo");
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchRemote, hydrateRemote, setMode, setState]);

  // Demo mode: cross-tab sync.
  useEffect(() => {
    if (mode !== "demo") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        setState(withDefaults(JSON.parse(e.newValue), residentRef.current));
      } catch {
        // ignore
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [mode, setState]);

  // Supabase mode: realtime row changes from other devices.
  useEffect(() => {
    if (mode !== "supabase") return;
    const channel = supabaseClient.channel(`keamanan:${communityId}`);
    const tables = [...Object.values(COLLECTION_TABLES), "security_settings"];
    tables.forEach((table) => {
      channel.on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table, filter: `communityId=eq.${communityId}` },
        (payload: any) => {
          const current = stateRef.current;
          if (!current) return;
          if (table === "security_settings") {
            if (payload.new) setState({ ...current, settings: payload.new });
            return;
          }
          const key = tableToCollection(table);
          if (!key) return;
          const list = current[key] as { id: string }[];
          if (payload.eventType === "DELETE") {
            const id = payload.old?.id;
            if (id) setState({ ...current, [key]: list.filter((r) => r.id !== id) });
            return;
          }
          const row = payload.new as { id: string };
          const exists = list.some((r) => r.id === row.id);
          setState({
            ...current,
            [key]: exists ? list.map((r) => (r.id === row.id ? row : r)) : [row, ...list],
          });
        }
      );
    });
    channel.subscribe();
    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [mode, communityId, setState]);

  const update: KeamananUpdater = useCallback(
    (fn) => {
      const prev = stateRef.current;
      if (!prev) return;
      const next = fn(prev);
      if (next === prev) return;
      setState(next);
      if (modeRef.current === "demo") {
        saveLocal(next);
      } else if (modeRef.current === "supabase") {
        const payload = diffState(prev, next);
        if (payload) pushSync(payload);
      }
    },
    [pushSync, setState]
  );

  const refresh = useCallback(async () => {
    if (modeRef.current !== "supabase") return;
    const remote = await fetchRemote();
    if (remote.ready && remote.state) hydrateRemote(remote.state);
  }, [fetchRemote, hydrateRemote]);

  const loadSampleData = useCallback(async () => {
    const seed = createSeedState(residentRef.current);
    if (modeRef.current === "demo") {
      saveLocal(seed);
      setState(seed);
      return;
    }
    const payload: SyncPayload = { upserts: {}, deletes: {}, settings: seed.settings };
    COLLECTION_KEYS.forEach((k) => {
      if ((seed[k] as unknown[]).length) payload.upserts[k] = seed[k] as unknown[];
    });
    await pushSync(payload);
    await refresh();
  }, [pushSync, refresh, setState]);

  const issueFine: KeamananStore["issueFine"] = useCallback(
    async (fine) => {
      if (modeRef.current === "demo") {
        update((s) => ({ ...s, fines: [{ ...fine, billNumber: `DND-DEMO-${fine.id.slice(-4).toUpperCase()}` }, ...s.fines] }));
        return { ok: true };
      }
      try {
        const res = await fetch("/api/keamanan/denda", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ communityId, fine }),
        });
        const data = await res.json();
        if (!res.ok) return { ok: false, error: data.error };
        const current = stateRef.current;
        if (current && !current.fines.some((f) => f.id === data.fine.id)) {
          setState({ ...current, fines: [data.fine, ...current.fines] });
        }
        return { ok: true };
      } catch {
        return { ok: false, error: "Koneksi ke server gagal." };
      }
    },
    [communityId, setState, update]
  );

  return { state, update, mode, syncError, loadSampleData, refresh, issueFine };
}

export function formatTime(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export function formatDateLabel(dateKey: string) {
  const [y, m, d] = dateKey.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" });
}

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export function timeAgo(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} mnt lalu`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371e3;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function getCurrentPosition(timeout = 8000): Promise<{ lat: number; lng: number; accuracy?: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout, maximumAge: 0 }
    );
  });
}

// Downscale a picked photo to a small JPEG data URL (keeps DB rows light).
export function fileToResizedDataUrl(file: File, maxSize = 640, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Gambar tidak valid"));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
