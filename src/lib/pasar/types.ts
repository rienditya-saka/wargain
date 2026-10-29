export type ShopCategory =
  | "KULINER" | "KUE" | "SAYUR" | "FASHION" | "KEBUTUHAN" | "JASA_RUMAH" | "JASA_SERVIS" | "LES" | "KECANTIKAN" | "LAUNDRY" | "LAINNYA";
export type ProductType = "PRODUK" | "JASA";
export type OrderStatus = "MENUNGGU" | "DIKONFIRMASI" | "DIPROSES" | "SIAP" | "DIANTAR" | "SELESAI" | "DITOLAK" | "DIBATALKAN";
export type PaymentMethod = "TUNAI" | "TRANSFER" | "QRIS";
export type PaymentStatus = "BELUM_BAYAR" | "MENUNGGU_VERIFIKASI" | "LUNAS" | "DITOLAK" | "DIKEMBALIKAN";
export type Fulfillment = "AMBIL" | "ANTAR" | "DI_TEMPAT" | "KE_RUMAH";

export interface WeeklyHour {
  day: number; // 0 = Minggu
  start: string;
  end: string;
}

export interface PaymentMethods {
  cash: boolean;
  transfer: { bank: string; accountNo: string; accountName: string } | null;
  qris: { imageUrl: string } | null;
}

export interface Shop {
  id: string;
  communityId: string;
  ownerId: string;
  name: string;
  tagline?: string | null;
  description: string;
  category: ShopCategory;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  houseBlock?: string | null;
  phone?: string | null;
  isOpen: boolean;
  weeklyHours: WeeklyHour[];
  closedDates: string[];
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFee: number;
  minOrder: number;
  paymentMethods: PaymentMethods;
  ratingAvg: number;
  ratingCount: number;
  orderCount: number;
  status: "AKTIF" | "DINONAKTIFKAN";
  createdAt: string;
  updatedAt: string;
}

export interface Variant {
  name: string;
  priceDelta: number;
}

export interface Product {
  id: string;
  communityId: string;
  shopId: string;
  type: ProductType;
  name: string;
  description: string;
  category: string;
  price: number;
  comparePrice?: number | null;
  unit: string;
  images: string[];
  trackStock: boolean;
  stock?: number | null;
  lowStockAt: number;
  variants: Variant[];
  preorderDays: number;
  maxPerOrder?: number | null;
  durationMin?: number | null;
  slotCapacity: number;
  serviceLocation?: "DI_TEMPAT" | "KE_RUMAH" | null;
  isActive: boolean;
  soldCount: number;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  variant?: string | null;
  price: number;
  qty: number;
  subtotal: number;
  unit: string;
}

export interface Order {
  id: string;
  communityId: string;
  shopId: string;
  orderNumber: string;
  type: ProductType;
  buyerId: string;
  buyerName: string;
  buyerBlock?: string | null;
  buyerPhone?: string | null;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  fulfillment: Fulfillment;
  scheduledAt?: string | null;
  scheduledEnd?: string | null;
  notes?: string | null;
  status: OrderStatus;
  statusHistory: { status: string; at: string; by: string; note?: string }[];
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentProofUrl?: string | null;
  paidAt?: string | null;
  stockReserved: boolean;
  cancelReason?: string | null;
  rating?: number | null;
  review?: string | null;
  reviewedAt?: string | null;
  sellerReply?: string | null;
  createdAt: string;
  updatedAt: string;
  shop?: Pick<Shop, "id" | "name" | "logoUrl" | "phone" | "houseBlock" | "paymentMethods" | "ownerId">;
}

export const SHOP_CATEGORY_META: Record<ShopCategory, { label: string; emoji: string }> = {
  KULINER: { label: "Makanan & Minuman", emoji: "🍲" },
  KUE: { label: "Kue & Camilan", emoji: "🧁" },
  SAYUR: { label: "Sayur & Sembako", emoji: "🥬" },
  KEBUTUHAN: { label: "Kebutuhan Rumah", emoji: "🧴" },
  FASHION: { label: "Fashion", emoji: "👕" },
  LAUNDRY: { label: "Laundry", emoji: "🧺" },
  JASA_RUMAH: { label: "Jasa Rumah Tangga", emoji: "🧹" },
  JASA_SERVIS: { label: "Servis & Perbaikan", emoji: "🔧" },
  KECANTIKAN: { label: "Kecantikan & Pijat", emoji: "💆" },
  LES: { label: "Les & Kursus", emoji: "📚" },
  LAINNYA: { label: "Lainnya", emoji: "🛍️" },
};

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; tone: string; step: number }> = {
  MENUNGGU: { label: "Menunggu konfirmasi", tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300", step: 0 },
  DIKONFIRMASI: { label: "Dikonfirmasi", tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300", step: 1 },
  DIPROSES: { label: "Sedang diproses", tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300", step: 2 },
  SIAP: { label: "Siap diambil", tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", step: 3 },
  DIANTAR: { label: "Sedang diantar", tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", step: 3 },
  SELESAI: { label: "Selesai", tone: "bg-emerald-600 text-white", step: 4 },
  DITOLAK: { label: "Ditolak penjual", tone: "bg-red-500/10 text-red-600", step: -1 },
  DIBATALKAN: { label: "Dibatalkan", tone: "bg-slate-500/10 text-slate-500", step: -1 },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; tone: string }> = {
  BELUM_BAYAR: { label: "Belum bayar", tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  MENUNGGU_VERIFIKASI: { label: "Menunggu verifikasi", tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  LUNAS: { label: "Lunas", tone: "bg-emerald-600 text-white" },
  DITOLAK: { label: "Bukti ditolak", tone: "bg-red-500/10 text-red-600" },
  DIKEMBALIKAN: { label: "Dikembalikan", tone: "bg-slate-500/10 text-slate-500" },
};

export const FULFILLMENT_LABEL: Record<Fulfillment, string> = {
  AMBIL: "Ambil sendiri",
  ANTAR: "Diantar",
  DI_TEMPAT: "Datang ke tempat penjual",
  KE_RUMAH: "Penjual datang ke rumah",
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = { TUNAI: "Tunai", TRANSFER: "Transfer bank", QRIS: "QRIS" };

export const ACTIVE_BOOKING: OrderStatus[] = ["MENUNGGU", "DIKONFIRMASI", "DIPROSES", "SIAP", "DIANTAR"];

export const rupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
