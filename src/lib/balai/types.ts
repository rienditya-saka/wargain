// Balai Warga: kabar terbaru, polling, musyawarah, galang dana, inventaris RT, kontak penting.

export type KabarCategory = "INFO" | "DUKA" | "KELAHIRAN" | "PERNIKAHAN" | "SAKIT" | "PRESTASI" | "WARGA_BARU" | "PEMADAMAN";

export const KABAR_META: Record<KabarCategory, { label: string; emoji: string; tone: string; gradient: string; priority: "NORMAL" | "HIGH" }> = {
  INFO: { label: "Info Warga", emoji: "📣", tone: "text-emerald-700 dark:text-emerald-300", gradient: "from-emerald-500/15 to-teal-500/5 border-emerald-500/25", priority: "NORMAL" },
  DUKA: { label: "Kabar Duka", emoji: "🕊️", tone: "text-slate-700 dark:text-slate-200", gradient: "from-slate-500/20 to-slate-500/5 border-slate-500/30", priority: "HIGH" },
  KELAHIRAN: { label: "Kelahiran", emoji: "👶", tone: "text-sky-700 dark:text-sky-300", gradient: "from-sky-500/15 to-pink-500/5 border-sky-500/25", priority: "NORMAL" },
  PERNIKAHAN: { label: "Pernikahan", emoji: "💍", tone: "text-rose-700 dark:text-rose-300", gradient: "from-rose-500/15 to-amber-500/5 border-rose-500/25", priority: "NORMAL" },
  SAKIT: { label: "Warga Sakit", emoji: "🏥", tone: "text-amber-700 dark:text-amber-300", gradient: "from-amber-500/15 to-orange-500/5 border-amber-500/25", priority: "NORMAL" },
  PRESTASI: { label: "Prestasi Warga", emoji: "🏆", tone: "text-yellow-700 dark:text-yellow-300", gradient: "from-yellow-500/20 to-amber-500/5 border-yellow-500/30", priority: "NORMAL" },
  WARGA_BARU: { label: "Warga Baru", emoji: "🏡", tone: "text-teal-700 dark:text-teal-300", gradient: "from-teal-500/15 to-emerald-500/5 border-teal-500/25", priority: "NORMAL" },
  PEMADAMAN: { label: "Gangguan Layanan", emoji: "⚡", tone: "text-orange-700 dark:text-orange-300", gradient: "from-orange-500/15 to-red-500/5 border-orange-500/25", priority: "HIGH" },
};

export interface PollOption {
  id: string;
  label: string;
}

export interface Poll {
  id: string;
  communityId: string;
  title: string;
  description: string;
  options: PollOption[];
  maxChoices: number;
  anonymous: boolean;
  voteScope: "USER" | "HOUSE";
  audience: "SEMUA" | "PENGURUS";
  closesAt: string;
  status: "AKTIF" | "DITUTUP";
  meetingId?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface PollResult {
  counts: Record<string, number>;
  totalVoters: number;
  eligible: number;
  myChoice: string[] | null;
  votedBy?: string | null; // HOUSE scope: who in my household voted
  voters?: { name: string; houseBlock: string | null; optionIds: string[] }[]; // non-anonymous only
}

export type PollWithResult = Poll & { result: PollResult; creatorName?: string | null };

export interface AgendaItem {
  id: string;
  title: string;
  presenter?: string;
}

export interface Decision {
  id: string;
  text: string;
  pic?: string;
  dueDate?: string | null;
  done: boolean;
}

export type MeetingStatus = "TERJADWAL" | "BERLANGSUNG" | "SELESAI" | "DIBATALKAN";

export interface Meeting {
  id: string;
  communityId: string;
  title: string;
  description: string;
  startAt: string;
  endAt?: string | null;
  location: string;
  onlineUrl?: string | null;
  agenda: AgendaItem[];
  audience: "SEMUA" | "KEPALA_KELUARGA" | "PENGURUS";
  status: MeetingStatus;
  minutes?: string | null;
  decisions: Decision[];
  cancelReason?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface Attendee {
  id: string;
  meetingId: string;
  userId: string;
  name: string;
  houseBlock?: string | null;
  rsvp: "HADIR" | "MUNGKIN" | "TIDAK";
  checkedInAt?: string | null;
}

export type MeetingWithStats = Meeting & {
  stats: { hadir: number; mungkin: number; tidak: number; checkedIn: number; houses: number; totalHouses: number };
  myRsvp: Attendee | null;
  polls: PollWithResult[];
};

export const MEETING_STATUS_META: Record<MeetingStatus, { label: string; tone: string }> = {
  TERJADWAL: { label: "Terjadwal", tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  BERLANGSUNG: { label: "Sedang berlangsung", tone: "bg-red-500/10 text-red-600 dark:text-red-400" },
  SELESAI: { label: "Selesai", tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  DIBATALKAN: { label: "Dibatalkan", tone: "bg-slate-500/10 text-slate-500" },
};

export type FundCategory = "DUKA" | "SAKIT" | "BENCANA" | "PEMBANGUNAN" | "KEGIATAN" | "LAINNYA";
export const FUND_META: Record<FundCategory, { label: string; emoji: string }> = {
  DUKA: { label: "Santunan Duka", emoji: "🕊️" },
  SAKIT: { label: "Bantuan Sakit", emoji: "🏥" },
  BENCANA: { label: "Bencana", emoji: "🌊" },
  PEMBANGUNAN: { label: "Pembangunan", emoji: "🏗️" },
  KEGIATAN: { label: "Kegiatan Warga", emoji: "🎉" },
  LAINNYA: { label: "Lainnya", emoji: "🤲" },
};

export interface Fundraiser {
  id: string;
  communityId: string;
  title: string;
  story: string;
  category: FundCategory;
  beneficiary?: string | null;
  targetAmount: number;
  deadline?: string | null;
  coverUrl?: string | null;
  paymentInfo?: string | null;
  status: "AKTIF" | "SELESAI";
  createdBy?: string | null;
  createdAt: string;
}

export interface Donation {
  id: string;
  fundraiserId: string;
  donorId?: string | null;
  donorName: string;
  anonymous: boolean;
  amount: number;
  message?: string | null;
  method: "TRANSFER" | "TUNAI";
  proofUrl?: string | null;
  status: "MENUNGGU" | "DITERIMA" | "DITOLAK";
  createdAt: string;
}

export type FundraiserWithStats = Fundraiser & {
  collected: number;
  donors: number;
  pending: number;
  recent: { name: string; amount: number; message?: string | null; createdAt: string }[];
  myDonations: Donation[];
};

export type InventoryCategory = "TENDA" | "KURSI_MEJA" | "SOUND" | "ALAT_KERJA" | "DAPUR" | "LAINNYA";
export const INVENTORY_META: Record<InventoryCategory, { label: string; emoji: string }> = {
  TENDA: { label: "Tenda", emoji: "⛺" },
  KURSI_MEJA: { label: "Kursi & Meja", emoji: "🪑" },
  SOUND: { label: "Sound & Elektronik", emoji: "🔊" },
  ALAT_KERJA: { label: "Alat Kerja Bakti", emoji: "🧹" },
  DAPUR: { label: "Peralatan Dapur", emoji: "🍲" },
  LAINNYA: { label: "Lainnya", emoji: "📦" },
};

export interface InventoryItem {
  id: string;
  communityId: string;
  name: string;
  category: InventoryCategory;
  description: string;
  quantity: number;
  unit: string;
  photoUrl?: string | null;
  feePerDay: number;
  maxDays: number;
  condition: "BAIK" | "PERLU_PERBAIKAN";
  isActive: boolean;
}

export type LoanStatus = "DIAJUKAN" | "DISETUJUI" | "DIPINJAM" | "DIKEMBALIKAN" | "DITOLAK" | "DIBATALKAN";
export const ACTIVE_LOAN: LoanStatus[] = ["DIAJUKAN", "DISETUJUI", "DIPINJAM"];
export const LOAN_STATUS_META: Record<LoanStatus, { label: string; tone: string }> = {
  DIAJUKAN: { label: "Menunggu persetujuan", tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  DISETUJUI: { label: "Disetujui · siap diambil", tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  DIPINJAM: { label: "Sedang dipinjam", tone: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
  DIKEMBALIKAN: { label: "Sudah dikembalikan", tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  DITOLAK: { label: "Ditolak", tone: "bg-red-500/10 text-red-600" },
  DIBATALKAN: { label: "Dibatalkan", tone: "bg-slate-500/10 text-slate-500" },
};

export interface Loan {
  id: string;
  itemId: string;
  borrowerId: string;
  borrowerName: string;
  houseBlock?: string | null;
  qty: number;
  startDate: string;
  endDate: string;
  purpose: string;
  fee: number;
  status: LoanStatus;
  returnNote?: string | null;
  decisionNote?: string | null;
  createdAt: string;
  item?: { name: string; unit: string; photoUrl?: string | null; category: InventoryCategory };
}

export type ContactCategory = "DARURAT" | "KESEHATAN" | "PEMERINTAHAN" | "UTILITAS" | "PENGURUS" | "LAYANAN";
export const CONTACT_META: Record<ContactCategory, { label: string; emoji: string }> = {
  DARURAT: { label: "Darurat", emoji: "🚨" },
  PENGURUS: { label: "Pengurus RT", emoji: "🧑‍💼" },
  KESEHATAN: { label: "Kesehatan", emoji: "🏥" },
  PEMERINTAHAN: { label: "Pemerintahan", emoji: "🏛️" },
  UTILITAS: { label: "Listrik, Air & Gas", emoji: "⚡" },
  LAYANAN: { label: "Layanan Umum", emoji: "🧰" },
};

export interface Contact {
  id: string;
  name: string;
  category: ContactCategory;
  phone: string;
  address?: string | null;
  notes?: string | null;
  sortOrder: number;
}

export const rupiah = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export const fmtDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00+07:00` : iso).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric" });

export function timeLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Ditutup";
  const h = Math.floor(ms / 3_600_000);
  if (h >= 48) return `${Math.floor(h / 24)} hari lagi`;
  if (h >= 1) return `${h} jam lagi`;
  return `${Math.max(1, Math.floor(ms / 60_000))} menit lagi`;
}
