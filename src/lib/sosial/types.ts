export type SocialCategory =
  | "POSYANDU_BALITA"
  | "POSYANDU_LANSIA"
  | "KERJA_BAKTI"
  | "PENGAJIAN"
  | "SENAM"
  | "DONOR_DARAH"
  | "VAKSINASI"
  | "BAKTI_SOSIAL"
  | "RAPAT_WARGA"
  | "LOMBA"
  | "LAINNYA";

export type SocialAudience = "SEMUA" | "BALITA" | "LANSIA" | "ANAK" | "REMAJA" | "KEPALA_KELUARGA" | "IBU";
export type SocialEventStatus = "TERJADWAL" | "SELESAI" | "DIBATALKAN";
export type RegistrationSource = "MANDIRI" | "OTOMATIS" | "PETUGAS";
export type RegistrationStatus = "TERDAFTAR" | "HADIR" | "TIDAK_HADIR" | "BATAL";

export interface SocialEvent {
  id: string;
  communityId: string;
  seriesId?: string | null;
  title: string;
  category: SocialCategory;
  description: string;
  location: string;
  lat?: number | null;
  lng?: number | null;
  startAt: string;
  endAt?: string | null;
  audience: SocialAudience;
  autoEnroll: boolean;
  registrationOpen: boolean;
  capacity?: number | null;
  services: string[];
  organizerName: string;
  contactPhone?: string | null;
  coverUrl?: string | null;
  status: SocialEventStatus;
  cancelReason?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  // computed by the API
  registeredCount?: number;
  attendedCount?: number;
}

export interface Measurements {
  beratKg?: number;
  tinggiCm?: number;
  lingkarKepalaCm?: number;
  lingkarLenganCm?: number;
  tensi?: string;
  gulaDarah?: number;
  kolesterol?: number;
  asamUrat?: number;
  imunisasi?: string;
  vitaminA?: boolean;
  vaksin?: string[]; // schedule codes, see src/lib/kms/immunization.ts
  caraUkur?: "LENGTH" | "HEIGHT";
  catatan?: string;
}

export interface SocialRegistration {
  id: string;
  communityId: string;
  eventId: string;
  citizenId?: string | null;
  participantName: string;
  houseBlock?: string | null;
  age?: number | null;
  gender?: string | null;
  registeredBy?: string | null;
  source: RegistrationSource;
  status: RegistrationStatus;
  checkInAt?: string | null;
  measurements: Measurements;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  communityId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  eventId?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface HouseholdMember {
  id: string;
  fullName: string;
  age: number;
  gender: string;
  role: string;
  birthDate?: string | null;
  houseBlock?: string | null;
}

export const CATEGORY_META: Record<
  SocialCategory,
  { label: string; emoji: string; tone: string; audience: SocialAudience; autoEnroll: boolean; services: string[]; defaultTitle: string; durationMin: number }
> = {
  POSYANDU_BALITA: {
    label: "Posyandu Balita", emoji: "👶", tone: "from-pink-500 to-rose-500", audience: "BALITA", autoEnroll: true,
    services: ["Timbang BB", "Ukur TB", "Lingkar Kepala", "Imunisasi", "Vitamin A", "PMT"], defaultTitle: "Posyandu Balita", durationMin: 180,
  },
  POSYANDU_LANSIA: {
    label: "Posyandu Lansia", emoji: "👵", tone: "from-amber-500 to-orange-500", audience: "LANSIA", autoEnroll: true,
    services: ["Cek Tensi", "Gula Darah", "Kolesterol", "Asam Urat", "Timbang BB", "Senam Lansia"], defaultTitle: "Posyandu Lansia", durationMin: 180,
  },
  KERJA_BAKTI: { label: "Kerja Bakti", emoji: "🧹", tone: "from-emerald-500 to-teal-600", audience: "KEPALA_KELUARGA", autoEnroll: false, services: [], defaultTitle: "Kerja Bakti Lingkungan", durationMin: 180 },
  PENGAJIAN: { label: "Pengajian", emoji: "🕌", tone: "from-teal-600 to-cyan-700", audience: "SEMUA", autoEnroll: false, services: [], defaultTitle: "Pengajian Rutin", durationMin: 120 },
  SENAM: { label: "Senam Bersama", emoji: "🤸", tone: "from-lime-500 to-green-600", audience: "SEMUA", autoEnroll: false, services: [], defaultTitle: "Senam Pagi Bersama", durationMin: 90 },
  DONOR_DARAH: { label: "Donor Darah", emoji: "🩸", tone: "from-red-500 to-red-700", audience: "SEMUA", autoEnroll: false, services: ["Cek Hb", "Cek Tensi"], defaultTitle: "Donor Darah PMI", durationMin: 240 },
  VAKSINASI: { label: "Vaksinasi", emoji: "💉", tone: "from-sky-500 to-blue-600", audience: "SEMUA", autoEnroll: false, services: [], defaultTitle: "Vaksinasi Warga", durationMin: 240 },
  BAKTI_SOSIAL: { label: "Bakti Sosial", emoji: "🤝", tone: "from-violet-500 to-purple-600", audience: "SEMUA", autoEnroll: false, services: [], defaultTitle: "Bakti Sosial", durationMin: 180 },
  RAPAT_WARGA: { label: "Rapat Warga", emoji: "📋", tone: "from-slate-600 to-slate-800", audience: "KEPALA_KELUARGA", autoEnroll: false, services: [], defaultTitle: "Rapat Warga", durationMin: 120 },
  LOMBA: { label: "Lomba / Acara", emoji: "🏆", tone: "from-yellow-500 to-amber-600", audience: "SEMUA", autoEnroll: false, services: [], defaultTitle: "Lomba 17 Agustus", durationMin: 240 },
  LAINNYA: { label: "Lainnya", emoji: "📌", tone: "from-emerald-600 to-emerald-800", audience: "SEMUA", autoEnroll: false, services: [], defaultTitle: "Kegiatan Warga", durationMin: 120 },
};

export const AUDIENCE_META: Record<SocialAudience, { label: string; short: string }> = {
  SEMUA: { label: "Semua warga", short: "Semua" },
  BALITA: { label: "Balita (0–59 bulan)", short: "Balita" },
  LANSIA: { label: "Lansia (60+ tahun)", short: "Lansia" },
  ANAK: { label: "Anak (5–12 tahun)", short: "Anak" },
  REMAJA: { label: "Remaja (13–21 tahun)", short: "Remaja" },
  KEPALA_KELUARGA: { label: "Perwakilan tiap KK", short: "Per KK" },
  IBU: { label: "Ibu / perempuan dewasa", short: "Ibu" },
};

export const PENGURUS_ROLES = ["TENANT_ADMIN", "KETUA", "SEKRETARIS", "BENDAHARA", "HUMAS"];

export function ageInMonths(birthDate?: string | null, fallbackAgeYears?: number | null, at = new Date()) {
  if (birthDate) {
    const b = new Date(`${birthDate.slice(0, 10)}T00:00:00`);
    return (at.getFullYear() - b.getFullYear()) * 12 + (at.getMonth() - b.getMonth()) - (at.getDate() < b.getDate() ? 1 : 0);
  }
  return (fallbackAgeYears ?? 0) * 12;
}

// Who a targeted event is meant for. Used for auto-enroll and for "kegiatan untuk keluarga Anda".
export function isEligible(
  audience: SocialAudience,
  c: { age: number; gender: string; role: string; birthDate?: string | null },
  at = new Date()
) {
  const months = ageInMonths(c.birthDate, c.age, at);
  const years = Math.floor(months / 12);
  switch (audience) {
    case "BALITA":
      return months >= 0 && months < 60;
    case "LANSIA":
      return years >= 60;
    case "ANAK":
      return years >= 5 && years <= 12;
    case "REMAJA":
      return years >= 13 && years <= 21;
    case "KEPALA_KELUARGA":
      return c.role === "KEPALA_KELUARGA";
    case "IBU":
      return c.gender === "P" && years >= 18;
    default:
      return true;
  }
}

const TZ = "Asia/Jakarta";

export function formatEventDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TZ });
}

export function formatEventTime(startIso: string, endIso?: string | null) {
  const f = (s: string) => new Date(s).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  return endIso ? `${f(startIso)}–${f(endIso)} WIB` : `${f(startIso)} WIB`;
}

export function dateBadge(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("id-ID", { day: "2-digit", timeZone: TZ }),
    month: d.toLocaleDateString("id-ID", { month: "short", timeZone: TZ }).toUpperCase(),
    weekday: d.toLocaleDateString("id-ID", { weekday: "short", timeZone: TZ }),
  };
}

export function relativeDay(iso: string, now = new Date()) {
  const key = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
  const target = new Date(`${key(new Date(iso))}T00:00:00`);
  const today = new Date(`${key(now)}T00:00:00`);
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Hari ini";
  if (diff === 1) return "Besok";
  if (diff > 1 && diff <= 7) return `${diff} hari lagi`;
  if (diff < 0) return `${-diff} hari lalu`;
  return null;
}
