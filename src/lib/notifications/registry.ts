// Single source of truth for modules and notification types (used by server & client).
// A new module only needs to add its entries here, then call notify()/publishFeedPost().

export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export const MODULES = {
  FEED: { label: "Feed Warga", emoji: "📰", href: "/feed" },
  SOSIAL: { label: "Kegiatan Sosial", emoji: "🤝", href: "/sosial" },
  KEAMANAN: { label: "Keamanan", emoji: "🛡️", href: "/keamanan" },
  KAS: { label: "Kas & Iuran", emoji: "💰", href: "/kas" },
  SURAT: { label: "Layanan Surat", emoji: "📄", href: "/surat" },
  SISTEM: { label: "Sistem", emoji: "⚙️", href: "/feed" },
} as const;

export type ModuleKey = keyof typeof MODULES;

export const NOTIFICATION_TYPES: Record<string, { module: ModuleKey; label: string; priority: NotificationPriority }> = {
  // Feed
  FEED_ANNOUNCEMENT: { module: "FEED", label: "Pengumuman RT", priority: "HIGH" },
  FEED_COMMENT: { module: "FEED", label: "Komentar di post saya", priority: "NORMAL" },
  FEED_LIKE: { module: "FEED", label: "Suka di post saya", priority: "LOW" },
  FEED_REPORT: { module: "FEED", label: "Aduan warga", priority: "NORMAL" },
  // Sosial
  SOCIAL_NEW_EVENT: { module: "SOSIAL", label: "Kegiatan baru", priority: "NORMAL" },
  SOCIAL_AUTO_ENROLLED: { module: "SOSIAL", label: "Terdaftar otomatis", priority: "NORMAL" },
  SOCIAL_REGISTERED: { module: "SOSIAL", label: "Pendaftaran berhasil", priority: "LOW" },
  SOCIAL_REMINDER: { module: "SOSIAL", label: "Pengingat kegiatan", priority: "HIGH" },
  SOCIAL_CANCELLED: { module: "SOSIAL", label: "Kegiatan dibatalkan", priority: "HIGH" },
  SOCIAL_UPDATED: { module: "SOSIAL", label: "Perubahan jadwal", priority: "HIGH" },
  SOCIAL_RESULT: { module: "SOSIAL", label: "Hasil posyandu", priority: "NORMAL" },
  KMS_GROWTH_ALERT: { module: "SOSIAL", label: "Peringatan gizi & tumbuh kembang", priority: "HIGH" },
  KMS_IMMUNIZATION_DUE: { module: "SOSIAL", label: "Jadwal imunisasi anak", priority: "HIGH" },
  // Keamanan
  SECURITY_PANIC: { module: "KEAMANAN", label: "Sinyal panic", priority: "URGENT" },
  SECURITY_PANIC_RESPONDED: { module: "KEAMANAN", label: "Panic direspon petugas", priority: "URGENT" },
  SECURITY_DISASTER: { module: "KEAMANAN", label: "Siaga bencana", priority: "URGENT" },
  SECURITY_LOST_URGENT: { module: "KEAMANAN", label: "Anak / lansia hilang", priority: "URGENT" },
  SECURITY_WATCHLIST: { module: "KEAMANAN", label: "Info waspada", priority: "HIGH" },
  SECURITY_GUEST_WAITING: { module: "KEAMANAN", label: "Tamu menunggu di gerbang", priority: "HIGH" },
  SECURITY_INCIDENT: { module: "KEAMANAN", label: "Laporan kejadian baru", priority: "NORMAL" },
  SECURITY_LOST_FOUND: { module: "KEAMANAN", label: "Info hilang & ditemukan", priority: "LOW" },
  // Kas
  KAS_BILL_ISSUED: { module: "KAS", label: "Tagihan terbit", priority: "NORMAL" },
  KAS_BILL_PAID: { module: "KAS", label: "Pembayaran diterima", priority: "NORMAL" },
  KAS_FINE: { module: "KAS", label: "Denda", priority: "HIGH" },
  // Surat
  SURAT_NEW_REQUEST: { module: "SURAT", label: "Permohonan surat baru", priority: "NORMAL" },
  SURAT_STATUS: { module: "SURAT", label: "Status surat", priority: "HIGH" },
};

export function typeMeta(type: string) {
  return NOTIFICATION_TYPES[type] ?? { module: "SISTEM" as ModuleKey, label: type, priority: "NORMAL" as NotificationPriority };
}

export const PRIORITY_STYLE: Record<NotificationPriority, { dot: string; ring: string; label: string }> = {
  LOW: { dot: "bg-slate-400", ring: "", label: "Info" },
  NORMAL: { dot: "bg-emerald-500", ring: "", label: "Normal" },
  HIGH: { dot: "bg-amber-500", ring: "ring-1 ring-amber-500/30", label: "Penting" },
  URGENT: { dot: "bg-red-600 animate-pulse", ring: "ring-1 ring-red-500/40", label: "Darurat" },
};

export const PENGURUS_ROLES = ["TENANT_ADMIN", "KETUA", "SEKRETARIS", "BENDAHARA", "HUMAS"];
