export type PanicType = "MEDIS" | "KEBAKARAN" | "PENCURIAN" | "KDRT" | "BENCANA" | "LAINNYA";
export type PanicStatus = "BARU" | "DIRESPON" | "SELESAI" | "DIBATALKAN";

export interface PanicAlert {
  id: string;
  senderName: string;
  houseBlock: string;
  phone: string;
  type: PanicType;
  note?: string;
  lat: number;
  lng: number;
  accuracy?: number;
  createdAt: string;
  status: PanicStatus;
  responder?: string;
  respondedAt?: string;
  resolvedAt?: string;
  resolutionNote?: string;
}

export type AttendanceStatus = "BELUM" | "HADIR" | "IZIN" | "ALPA";

export interface RondaMember {
  name: string;
  houseBlock: string;
  status: AttendanceStatus;
  checkInAt?: string;
}

export interface RondaShift {
  id: string;
  date: string; // yyyy-mm-dd
  startTime: string;
  endTime: string;
  post: string;
  members: RondaMember[];
}

export interface PatrolCheckpoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lastScanAt?: string;
  lastScanBy?: string;
}

export type VisitorKind = "TAMU" | "KURIR" | "PEKERJA" | "OJOL";
export type GateStatus = "MENUNGGU_KONFIRMASI" | "DIIZINKAN" | "DITOLAK" | "KELUAR";

export interface GateLog {
  id: string;
  kind: VisitorKind;
  name: string;
  plate?: string;
  destinationBlock: string;
  purpose: string;
  inAt: string;
  outAt?: string;
  status: GateStatus;
  inviteCode?: string;
  officer: string;
}

export interface GuestInvite {
  id: string;
  code: string;
  guestName: string;
  plate?: string;
  hostName: string;
  hostBlock: string;
  visitDate: string;
  note?: string;
  used: boolean;
}

export type IncidentCategory =
  | "PENCURIAN"
  | "ORANG_MENCURIGAKAN"
  | "KENDARAAN_MENCURIGAKAN"
  | "FASILITAS_RUSAK"
  | "KERIBUTAN"
  | "LAINNYA";
export type IncidentStatus = "DILAPORKAN" | "DITINDAKLANJUTI" | "SELESAI";

export interface IncidentReport {
  id: string;
  category: IncidentCategory;
  title: string;
  description: string;
  location: string;
  reporter: string;
  anonymous: boolean;
  createdAt: string;
  status: IncidentStatus;
  followUp?: string;
  lat?: number;
  lng?: number;
}

export interface HouseWatchCheck {
  at: string;
  by: string;
  note: string;
}

export interface HouseWatch {
  id: string;
  houseBlock: string;
  ownerName: string;
  contact: string;
  from: string;
  to: string;
  note: string;
  checks: HouseWatchCheck[];
  lat?: number;
  lng?: number;
}

// ---------- Daftar waspada ----------
export type WatchKind = "ORANG" | "KENDARAAN";
export type WatchLevel = "WASPADA" | "BAHAYA";

export interface WatchlistEntry {
  id: string;
  kind: WatchKind;
  label: string;
  plate?: string;
  description: string;
  photoUrl?: string;
  level: WatchLevel;
  lastSeenAt?: string;
  lastSeenLocation?: string;
  lat?: number;
  lng?: number;
  reportedBy: string;
  active: boolean;
  createdAt: string;
}

// ---------- Hilang & ditemukan ----------
export type LostFoundType = "HILANG" | "DITEMUKAN";
export type LostFoundCategory = "ANAK" | "LANSIA" | "HEWAN" | "KENDARAAN" | "BARANG" | "DOKUMEN";

export interface LostFoundItem {
  id: string;
  type: LostFoundType;
  category: LostFoundCategory;
  title: string;
  description: string;
  photoUrl?: string;
  lastSeenLocation: string;
  lat?: number;
  lng?: number;
  contactName: string;
  contactPhone: string;
  houseBlock?: string;
  reward?: number;
  status: "AKTIF" | "SELESAI";
  createdAt: string;
  resolvedAt?: string;
}

// ---------- Serah terima shift ----------
export interface HandoverChecklistItem {
  item: string;
  ok: boolean;
  note?: string;
}

export interface ShiftHandover {
  id: string;
  shiftLabel: string;
  fromOfficer: string;
  toOfficer: string;
  summary: string;
  checklist: HandoverChecklistItem[];
  packagesHeld: number;
  keysHeld: string;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

// ---------- Denda ronda ----------
export interface RondaFine {
  id: string;
  shiftId: string;
  shiftDate: string;
  memberName: string;
  houseBlock: string;
  amount: number;
  status: "TERBIT" | "LUNAS" | "DIBATALKAN";
  billId?: string;
  billNumber?: string;
  createdAt: string;
}

// ---------- Kendaraan warga & ANPR ----------
export type VehicleType = "MOBIL" | "MOTOR";

export interface ResidentVehicle {
  id: string;
  plate: string;
  type: VehicleType;
  brandColor: string;
  ownerName: string;
  houseBlock: string;
  stickerCode?: string;
  rfidTag?: string;
  status: "MENUNGGU_VERIFIKASI" | "AKTIF" | "NONAKTIF";
  createdAt: string;
}

export type VehicleAccessResult = "WARGA" | "TAMU_UNDANGAN" | "PEKERJA" | "WASPADA" | "TIDAK_DIKENAL";

export interface VehicleAccessLog {
  id: string;
  plate: string;
  direction: "MASUK" | "KELUAR";
  method: "ANPR" | "RFID" | "MANUAL";
  result: VehicleAccessResult;
  matchedLabel?: string;
  gateOpened: boolean;
  confidence?: number;
  officer: string;
  createdAt: string;
}

// ---------- Kartu pekerja ----------
export type WorkerRole = "ART" | "SOPIR" | "TUKANG" | "TUKANG_KEBUN" | "PENGASUH" | "LAINNYA";

export interface WorkerPass {
  id: string;
  code: string;
  name: string;
  role: WorkerRole;
  phone: string;
  nik?: string;
  photoUrl?: string;
  plate?: string;
  employerName: string;
  houseBlock: string;
  validFrom: string;
  validUntil: string;
  allowedDays: number[]; // 0=Minggu..6=Sabtu
  allowedStart: string;
  allowedEnd: string;
  liveIn: boolean;
  status: "AKTIF" | "DICABUT";
  createdAt: string;
}

// ---------- CCTV ----------
export type CctvStreamType = "HLS" | "MJPEG" | "SNAPSHOT" | "EMBED" | "BELUM_DIATUR";

export interface CctvCamera {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  streamType: CctvStreamType;
  streamUrl?: string;
  ownerType: "RT" | "WARGA";
  ownerName: string;
  isShared: boolean;
  status: "ONLINE" | "OFFLINE";
  createdAt: string;
}

// ---------- Bencana ----------
export type DisasterPostType = "POSKO" | "TITIK_KUMPUL" | "DAPUR_UMUM" | "POSKO_KESEHATAN";

export interface DisasterPost {
  id: string;
  name: string;
  type: DisasterPostType;
  lat: number;
  lng: number;
  capacity: number;
  occupants: number;
  contactName: string;
  contactPhone: string;
  needs: string[];
  active: boolean;
  notes?: string;
  createdAt: string;
}

export interface SafetyCheckin {
  id: string;
  name: string;
  houseBlock: string;
  phone: string;
  status: "AMAN" | "BUTUH_BANTUAN";
  note?: string;
  peopleCount: number;
  lat?: number;
  lng?: number;
  createdAt: string;
}

// ---------- Pengaturan per komunitas ----------
export type KawasanType = "CLUSTER" | "KAVLING" | "KAMPUNG";

export interface SecuritySettings {
  id: string;
  kawasanType: KawasanType;
  rondaFineEnabled: boolean;
  rondaFineAmount: number;
  disasterActive: boolean;
  disasterTitle?: string;
  disasterStartedAt?: string;
}

// ---------- Data rumah (read-only dari modul Kependudukan) ----------
export interface SecurityHouse {
  id: string;
  blockNumber: string;
  ownerName: string;
  occupancyStatus: string;
  lat: number;
  lng: number;
}

export interface VulnerableResident {
  id: string;
  headName: string;
  blockNumber: string;
  socialCategory: string;
  phone?: string;
  lat: number;
  lng: number;
}

export interface KeamananState {
  alerts: PanicAlert[];
  shifts: RondaShift[];
  checkpoints: PatrolCheckpoint[];
  gateLogs: GateLog[];
  invites: GuestInvite[];
  incidents: IncidentReport[];
  houseWatches: HouseWatch[];
  watchlist: WatchlistEntry[];
  lostFound: LostFoundItem[];
  handovers: ShiftHandover[];
  fines: RondaFine[];
  vehicles: ResidentVehicle[];
  vehicleLogs: VehicleAccessLog[];
  workers: WorkerPass[];
  cctvs: CctvCamera[];
  disasterPosts: DisasterPost[];
  safetyCheckins: SafetyCheckin[];
  settings: SecuritySettings;
  houses: SecurityHouse[];
  vulnerable: VulnerableResident[];
}

export type CollectionKey = Exclude<keyof KeamananState, "settings" | "houses" | "vulnerable">;

export type KeamananUpdater = (fn: (prev: KeamananState) => KeamananState) => void;

export const PANIC_TYPE_META: Record<PanicType, { label: string; emoji: string }> = {
  MEDIS: { label: "Darurat Medis", emoji: "🚑" },
  KEBAKARAN: { label: "Kebakaran", emoji: "🔥" },
  PENCURIAN: { label: "Maling / Perampokan", emoji: "🚨" },
  KDRT: { label: "Kekerasan / KDRT", emoji: "🆘" },
  BENCANA: { label: "Banjir / Bencana", emoji: "🌊" },
  LAINNYA: { label: "Darurat Lainnya", emoji: "⚠️" },
};

export const INCIDENT_CATEGORY_LABEL: Record<IncidentCategory, string> = {
  PENCURIAN: "Pencurian / Kehilangan",
  ORANG_MENCURIGAKAN: "Orang Mencurigakan",
  KENDARAAN_MENCURIGAKAN: "Kendaraan Mencurigakan",
  FASILITAS_RUSAK: "Fasilitas Rusak (PJU, Portal, CCTV)",
  KERIBUTAN: "Keributan / Gangguan",
  LAINNYA: "Lainnya",
};

export const VISITOR_KIND_LABEL: Record<VisitorKind, string> = {
  TAMU: "Tamu",
  KURIR: "Kurir Paket",
  PEKERJA: "Pekerja / Tukang",
  OJOL: "Ojol / Antar Makanan",
};

export const WATCH_LEVEL_LABEL: Record<WatchLevel, string> = {
  WASPADA: "Waspada",
  BAHAYA: "Bahaya",
};

export const LOST_FOUND_CATEGORY_META: Record<LostFoundCategory, { label: string; emoji: string; urgent: boolean }> = {
  ANAK: { label: "Anak", emoji: "🧒", urgent: true },
  LANSIA: { label: "Lansia", emoji: "👴", urgent: true },
  HEWAN: { label: "Hewan Peliharaan", emoji: "🐈", urgent: false },
  KENDARAAN: { label: "Kendaraan", emoji: "🏍️", urgent: false },
  BARANG: { label: "Barang", emoji: "🎒", urgent: false },
  DOKUMEN: { label: "Dokumen / Dompet", emoji: "👛", urgent: false },
};

export const WORKER_ROLE_LABEL: Record<WorkerRole, string> = {
  ART: "Asisten Rumah Tangga",
  SOPIR: "Sopir Pribadi",
  TUKANG: "Tukang / Renovasi",
  TUKANG_KEBUN: "Tukang Kebun",
  PENGASUH: "Pengasuh / Baby Sitter",
  LAINNYA: "Lainnya",
};

export const DISASTER_POST_META: Record<DisasterPostType, { label: string; emoji: string }> = {
  POSKO: { label: "Posko Pengungsian", emoji: "⛺" },
  TITIK_KUMPUL: { label: "Titik Kumpul", emoji: "📍" },
  DAPUR_UMUM: { label: "Dapur Umum", emoji: "🍲" },
  POSKO_KESEHATAN: { label: "Posko Kesehatan", emoji: "🏥" },
};

export const VEHICLE_RESULT_META: Record<VehicleAccessResult, { label: string; tone: "emerald" | "blue" | "amber" | "red" | "slate" }> = {
  WARGA: { label: "Kendaraan Warga", tone: "emerald" },
  TAMU_UNDANGAN: { label: "Tamu Undangan", tone: "blue" },
  PEKERJA: { label: "Pekerja Terdaftar", tone: "blue" },
  WASPADA: { label: "DAFTAR WASPADA", tone: "red" },
  TIDAK_DIKENAL: { label: "Tidak Dikenal", tone: "amber" },
};

export const KAWASAN_LABEL: Record<KawasanType, string> = {
  CLUSTER: "Cluster / Perumahan 1 Gerbang",
  KAVLING: "Kavling / Perumahan Terbuka",
  KAMPUNG: "Kampung / Pemukiman",
};

export const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
