import { supabaseAdmin } from "@/lib/supabase-admin";
import { notify } from "@/lib/notifications/server";
import { publishFeedPost, updateFeedPostByEntity } from "@/lib/feed/server";
import { slotsFor, jakartaDateKey } from "./slots";
import {
  ACTIVE_BOOKING, FULFILLMENT_LABEL, ORDER_STATUS_META, Order, OrderItem, OrderStatus, PaymentMethod, Product, Shop, Fulfillment, rupiah,
} from "./types";

export class PasarError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface Actor {
  id: string;
  fullName: string;
  role: string;
  communityId: string;
  houseBlock: string | null;
  phone: string | null;
}

export async function loadActor(userId?: string | null): Promise<Actor> {
  if (!userId) throw new PasarError("Silakan login dulu.", 401);
  const { data } = await supabaseAdmin.from("users").select("id, fullName, role, communityId, houseBlock, phone").eq("id", userId).maybeSingle();
  if (!data) throw new PasarError("Akun tidak ditemukan.", 401);
  return data as Actor;
}

export async function loadShop(shopId: string) {
  const { data } = await supabaseAdmin.from("shops").select("*").eq("id", shopId).maybeSingle();
  if (!data) throw new PasarError("Lapak tidak ditemukan.", 404);
  return data as Shop;
}

export async function myShop(actor: Actor) {
  const { data } = await supabaseAdmin.from("shops").select("*").eq("communityId", actor.communityId).eq("ownerId", actor.id).maybeSingle();
  return (data as Shop) ?? null;
}

function orderNumber() {
  const d = jakartaDateKey().replace(/-/g, "").slice(2);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PSR-${d}-${rand}`;
}

const orderLink = (o: { id: string }, seller: boolean) => `/pasar?tab=${seller ? "lapak" : "pesanan"}&order=${encodeURIComponent(o.id)}`;

function stockItems(items: OrderItem[], products: Map<string, Product>) {
  // only tracked stock is reserved; the same product may appear with different variants
  const byProduct = new Map<string, number>();
  items.forEach((i) => {
    const p = products.get(i.productId);
    if (p?.type === "PRODUK" && p.trackStock && p.stock != null) byProduct.set(i.productId, (byProduct.get(i.productId) ?? 0) + i.qty);
  });
  return Array.from(byProduct.entries()).map(([productId, qty]) => ({ productId, qty }));
}

async function adjustStock(items: { productId: string; qty: number }[], direction: -1 | 1) {
  if (!items.length) return;
  const { error } = await supabaseAdmin.rpc("shop_adjust_stock", { p_items: items, p_direction: direction });
  if (error) {
    const m = error.message.match(/STOK_HABIS:(.+)/);
    throw new PasarError(m ? `Stok "${m[1]}" tidak cukup. Kurangi jumlah atau pilih produk lain.` : error.message, 409);
  }
}

async function lowStockCheck(shop: Shop, productIds: string[]) {
  if (!productIds.length) return;
  const { data } = await supabaseAdmin.from("shop_products").select("id, name, stock, lowStockAt, trackStock").in("id", productIds);
  const today = jakartaDateKey();
  for (const p of data ?? []) {
    if (!p.trackStock || p.stock == null || p.stock > p.lowStockAt) continue;
    await notify({
      communityId: shop.communityId, type: "PASAR_LOW_STOCK", entity: { type: "PRODUCT", id: p.id },
      title: p.stock === 0 ? `📦 Stok ${p.name} HABIS` : `📦 Stok ${p.name} tinggal ${p.stock}`,
      body: "Tambah stok supaya warga tetap bisa memesan.",
      link: "/pasar?tab=lapak&view=produk",
      target: { userIds: [shop.ownerId] },
      dedupeKey: `lowstock:${p.id}:${p.stock}:${today}`,
    });
  }
}

// ---------------- Create order / booking ----------------

export interface CreateOrderInput {
  shopId: string;
  items: { productId: string; qty: number; variant?: string | null }[];
  fulfillment: Fulfillment;
  paymentMethod: PaymentMethod;
  scheduledAt?: string | null; // booking slot start (JASA) or requested ready time (pre-order)
  notes?: string | null;
}

export async function createOrder(actor: Actor, input: CreateOrderInput): Promise<Order> {
  const shop = await loadShop(input.shopId);
  if (shop.communityId !== actor.communityId) throw new PasarError("Lapak tidak ditemukan.", 404);
  if (shop.status !== "AKTIF" || !shop.isOpen) throw new PasarError("Lapak sedang tutup, coba lagi nanti.");
  if (shop.ownerId === actor.id) throw new PasarError("Tidak bisa memesan di lapak sendiri.");
  if (!input.items?.length) throw new PasarError("Keranjang masih kosong.");

  const { data: rows } = await supabaseAdmin.from("shop_products").select("*").in("id", input.items.map((i) => i.productId));
  const products = new Map((rows as Product[] ?? []).map((p) => [p.id, p]));
  const items: OrderItem[] = input.items.map((i) => {
    const p = products.get(i.productId);
    if (!p || p.shopId !== shop.id || !p.isActive) throw new PasarError("Ada produk yang sudah tidak dijual.");
    const qty = Math.floor(Number(i.qty));
    if (!(qty >= 1)) throw new PasarError("Jumlah tidak valid.");
    if (p.maxPerOrder && qty > p.maxPerOrder) throw new PasarError(`Maksimal ${p.maxPerOrder} ${p.unit} untuk ${p.name}.`);
    const variant = i.variant ? p.variants.find((v) => v.name === i.variant) : null;
    if (i.variant && !variant) throw new PasarError(`Varian "${i.variant}" tidak tersedia.`);
    const price = p.price + (variant?.priceDelta ?? 0);
    return { productId: p.id, name: p.name, variant: variant?.name ?? null, price, qty, subtotal: price * qty, unit: p.unit };
  });

  const types = new Set(items.map((i) => products.get(i.productId)!.type));
  if (types.size > 1) throw new PasarError("Produk dan jasa dipesan terpisah.");
  const type = [...types][0];

  const pm = shop.paymentMethods ?? { cash: true, transfer: null, qris: null };
  if ((input.paymentMethod === "TUNAI" && !pm.cash) || (input.paymentMethod === "TRANSFER" && !pm.transfer) || (input.paymentMethod === "QRIS" && !pm.qris)) {
    throw new PasarError("Metode pembayaran ini tidak tersedia di lapak.");
  }

  let scheduledAt: string | null = null;
  let scheduledEnd: string | null = null;
  let fulfillment: Fulfillment = input.fulfillment;

  if (type === "JASA") {
    if (items.length !== 1 || items[0].qty !== 1) throw new PasarError("Booking jasa satu layanan per pesanan.");
    const p = products.get(items[0].productId)!;
    if (!input.scheduledAt) throw new PasarError("Pilih jadwal terlebih dahulu.");
    const start = new Date(input.scheduledAt);
    const dateKey = jakartaDateKey(start);
    const duration = p.durationMin ?? 60;
    const dayStart = new Date(`${dateKey}T00:00:00+07:00`).toISOString();
    const dayEnd = new Date(`${dateKey}T23:59:59+07:00`).toISOString();
    const { data: bookings } = await supabaseAdmin
      .from("shop_orders")
      .select("scheduledAt, scheduledEnd, items")
      .eq("shopId", shop.id)
      .in("status", ACTIVE_BOOKING)
      .gte("scheduledAt", dayStart)
      .lte("scheduledAt", dayEnd);
    const sameProduct = (bookings ?? []).filter((b: any) => b.items?.[0]?.productId === p.id && b.scheduledAt && b.scheduledEnd);
    const slot = slotsFor({
      dateKey, weeklyHours: shop.weeklyHours, closedDates: shop.closedDates, durationMin: duration, capacity: p.slotCapacity,
      bookings: sameProduct.map((b: any) => ({ start: b.scheduledAt, end: b.scheduledEnd })),
    }).find((s) => new Date(s.start).getTime() === start.getTime());
    if (!slot) throw new PasarError("Jadwal di luar jam layanan.");
    if (slot.reason === "PENUH") throw new PasarError("Slot ini baru saja penuh, pilih jam lain.", 409);
    if (slot.reason === "LEWAT") throw new PasarError("Slot sudah lewat / terlalu dekat, pilih jam lain.");
    scheduledAt = slot.start;
    scheduledEnd = slot.end;
    fulfillment = p.serviceLocation === "KE_RUMAH" ? "KE_RUMAH" : "DI_TEMPAT";
  } else {
    if (fulfillment === "ANTAR" && !shop.deliveryEnabled) throw new PasarError("Lapak ini tidak melayani antar.");
    if (fulfillment === "AMBIL" && !shop.pickupEnabled) throw new PasarError("Lapak ini tidak melayani ambil sendiri.");
    if (fulfillment !== "ANTAR" && fulfillment !== "AMBIL") fulfillment = "AMBIL";
    const lead = Math.max(...items.map((i) => products.get(i.productId)!.preorderDays));
    if (lead > 0) {
      const earliest = new Date(`${jakartaDateKey(new Date(Date.now() + lead * 86_400_000))}T00:00:00+07:00`);
      const wanted = input.scheduledAt ? new Date(input.scheduledAt) : null;
      if (!wanted || wanted < earliest) throw new PasarError(`Pesanan ini pre-order, pilih tanggal paling cepat ${lead} hari lagi.`);
      scheduledAt = wanted.toISOString();
    }
  }

  const subtotal = items.reduce((n, i) => n + i.subtotal, 0);
  if (shop.minOrder && subtotal < shop.minOrder) throw new PasarError(`Minimal belanja ${rupiah(shop.minOrder)}.`);
  const deliveryFee = fulfillment === "ANTAR" ? shop.deliveryFee : 0;

  const reserve = stockItems(items, products);
  await adjustStock(reserve, -1);

  const now = new Date().toISOString();
  const row = {
    id: `ord_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    communityId: shop.communityId,
    shopId: shop.id,
    orderNumber: orderNumber(),
    type,
    buyerId: actor.id,
    buyerName: actor.fullName,
    buyerBlock: actor.houseBlock,
    buyerPhone: actor.phone,
    items,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    fulfillment,
    scheduledAt,
    scheduledEnd,
    notes: input.notes?.trim().slice(0, 500) || null,
    status: "MENUNGGU" as OrderStatus,
    statusHistory: [{ status: "MENUNGGU", at: now, by: actor.fullName }],
    paymentMethod: input.paymentMethod,
    paymentStatus: "BELUM_BAYAR",
    stockReserved: reserve.length > 0,
    createdAt: now,
    updatedAt: now,
  };
  const { data, error } = await supabaseAdmin.from("shop_orders").insert(row).select().single();
  if (error) {
    await adjustStock(reserve, 1).catch(() => {});
    throw new PasarError(error.message, 500);
  }

  const what = type === "JASA"
    ? `Booking ${items[0].name} · ${new Date(scheduledAt!).toLocaleString("id-ID", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}`
    : items.map((i) => `${i.qty}× ${i.name}`).join(", ");
  await notify({
    communityId: shop.communityId, type: "PASAR_NEW_ORDER", entity: { type: "ORDER", id: data.id },
    title: `🛒 ${type === "JASA" ? "Booking" : "Pesanan"} baru dari ${actor.fullName}${actor.houseBlock ? ` (${actor.houseBlock})` : ""}`,
    body: `${what} · ${rupiah(row.total)} · ${FULFILLMENT_LABEL[fulfillment]}. Konfirmasi sekarang.`,
    link: orderLink(data, true),
    target: { userIds: [shop.ownerId] },
    actorName: actor.fullName,
  });
  await lowStockCheck(shop, reserve.map((r) => r.productId));
  return data as Order;
}

// ---------------- Transitions ----------------

export type OrderAction =
  | "CONFIRM" | "REJECT" | "PROCESS" | "READY" | "DELIVER" | "COMPLETE" | "CANCEL"
  | "UPLOAD_PROOF" | "VERIFY_PAYMENT" | "REJECT_PAYMENT" | "MARK_PAID" | "REVIEW" | "REPLY_REVIEW";

const SELLER_MOVES: Partial<Record<OrderAction, { from: OrderStatus[]; to: OrderStatus }>> = {
  CONFIRM: { from: ["MENUNGGU"], to: "DIKONFIRMASI" },
  REJECT: { from: ["MENUNGGU"], to: "DITOLAK" },
  PROCESS: { from: ["DIKONFIRMASI"], to: "DIPROSES" },
  READY: { from: ["DIKONFIRMASI", "DIPROSES"], to: "SIAP" },
  DELIVER: { from: ["DIKONFIRMASI", "DIPROSES", "SIAP"], to: "DIANTAR" },
  COMPLETE: { from: ["DIKONFIRMASI", "DIPROSES", "SIAP", "DIANTAR"], to: "SELESAI" },
  CANCEL: { from: ["DIKONFIRMASI", "DIPROSES", "SIAP"], to: "DIBATALKAN" },
};

// Buyers may cancel before confirmation (bookings: up to 2 hours before the slot) and confirm receipt.
const BUYER_CANCEL_WINDOW_MS = 2 * 3_600_000;

async function recomputeRatings(shopId: string, productIds: string[]) {
  const { data: rated } = await supabaseAdmin.from("shop_orders").select("rating, items").eq("shopId", shopId).not("rating", "is", null);
  const all = rated ?? [];
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : 0);
  await supabaseAdmin.from("shops").update({ ratingAvg: avg(all.map((r) => r.rating!)), ratingCount: all.length }).eq("id", shopId);
  for (const pid of productIds) {
    const mine = all.filter((r: any) => (r.items as OrderItem[]).some((i) => i.productId === pid)).map((r) => r.rating!);
    await supabaseAdmin.from("shop_products").update({ ratingAvg: avg(mine), ratingCount: mine.length }).eq("id", pid);
  }
}

export async function transition(actor: Actor, orderId: string, action: OrderAction, payload: { note?: string; proofUrl?: string; rating?: number; review?: string } = {}) {
  const { data: order } = await supabaseAdmin.from("shop_orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) throw new PasarError("Pesanan tidak ditemukan.", 404);
  const shop = await loadShop(order.shopId);
  const isSeller = shop.ownerId === actor.id;
  const isBuyer = order.buyerId === actor.id;
  if (!isSeller && !isBuyer) throw new PasarError("Tidak diizinkan.", 403);

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { updatedAt: now };
  let nextStatus: OrderStatus | null = null;
  let notifyBuyer: { title: string; body: string; type?: string } | null = null;
  let notifySeller: { title: string; body: string; type: string } | null = null;
  const note = payload.note?.trim().slice(0, 300) || undefined;

  if (SELLER_MOVES[action] && isSeller) {
    const move = SELLER_MOVES[action]!;
    if (!move.from.includes(order.status)) throw new PasarError(`Pesanan sudah "${ORDER_STATUS_META[order.status as OrderStatus].label}".`);
    if ((action === "REJECT" || action === "CANCEL") && !note) throw new PasarError("Tuliskan alasannya untuk pembeli.");
    nextStatus = move.to;
    if (note && (action === "REJECT" || action === "CANCEL")) patch.cancelReason = note;
    const texts: Partial<Record<OrderAction, string>> = {
      CONFIRM: order.type === "JASA" ? "Booking Anda dikonfirmasi ✅" : "Pesanan dikonfirmasi ✅",
      REJECT: "Pesanan ditolak penjual",
      PROCESS: "Pesanan sedang disiapkan 👩‍🍳",
      READY: order.fulfillment === "AMBIL" ? "Pesanan siap diambil 🎉" : "Pesanan siap",
      DELIVER: "Pesanan sedang diantar 🛵",
      COMPLETE: "Pesanan selesai. Terima kasih!",
      CANCEL: "Pesanan dibatalkan penjual",
    };
    notifyBuyer = {
      type: action === "REJECT" || action === "CANCEL" ? "PASAR_ORDER_CANCELLED" : "PASAR_ORDER_STATUS",
      title: `${texts[action]} · ${shop.name}`,
      body: note ? `Catatan penjual: ${note}` : `${order.orderNumber} · ${rupiah(order.total)}`,
    };
  } else if (action === "CANCEL" && isBuyer) {
    const beforeConfirm = order.status === "MENUNGGU";
    const bookingEarly = order.type === "JASA" && order.status === "DIKONFIRMASI" && order.scheduledAt && new Date(order.scheduledAt).getTime() - Date.now() > BUYER_CANCEL_WINDOW_MS;
    if (!beforeConfirm && !bookingEarly) throw new PasarError("Pesanan sudah diproses. Hubungi penjual untuk membatalkan.");
    nextStatus = "DIBATALKAN";
    patch.cancelReason = note ?? "Dibatalkan pembeli";
    notifySeller = { type: "PASAR_ORDER_CANCELLED", title: `❌ ${order.orderNumber} dibatalkan ${order.buyerName}`, body: note ?? (order.type === "JASA" ? "Slot booking kembali tersedia." : "Stok dikembalikan otomatis.") };
  } else if (action === "COMPLETE" && isBuyer) {
    if (!["SIAP", "DIANTAR"].includes(order.status)) throw new PasarError("Pesanan belum siap / diantar.");
    nextStatus = "SELESAI";
    notifySeller = { type: "PASAR_ORDER_STATUS", title: `✅ ${order.buyerName} sudah menerima pesanan`, body: `${order.orderNumber} selesai.` };
  } else if (action === "UPLOAD_PROOF" && isBuyer) {
    if (!["TRANSFER", "QRIS"].includes(order.paymentMethod)) throw new PasarError("Pesanan tunai tidak perlu bukti transfer.");
    if (["LUNAS", "DIKEMBALIKAN"].includes(order.paymentStatus)) throw new PasarError("Pembayaran sudah diproses.");
    if (!payload.proofUrl?.startsWith("data:image/") && !payload.proofUrl?.startsWith("https://")) throw new PasarError("Unggah foto bukti pembayaran.");
    patch.paymentProofUrl = payload.proofUrl;
    patch.paymentStatus = "MENUNGGU_VERIFIKASI";
    notifySeller = { type: "PASAR_PAYMENT_PROOF", title: `💳 Bukti bayar ${rupiah(order.total)} dari ${order.buyerName}`, body: `${order.orderNumber} · cek mutasi rekening / QRIS lalu verifikasi.` };
  } else if ((action === "VERIFY_PAYMENT" || action === "REJECT_PAYMENT") && isSeller) {
    if (order.paymentStatus !== "MENUNGGU_VERIFIKASI") throw new PasarError("Tidak ada bukti bayar yang menunggu verifikasi.");
    const ok = action === "VERIFY_PAYMENT";
    if (!ok && !note) throw new PasarError("Tuliskan alasan bukti ditolak.");
    patch.paymentStatus = ok ? "LUNAS" : "DITOLAK";
    if (ok) patch.paidAt = now;
    notifyBuyer = {
      type: "PASAR_PAYMENT_RESULT",
      title: ok ? `✅ Pembayaran ${order.orderNumber} terverifikasi` : `⚠️ Bukti bayar ${order.orderNumber} ditolak`,
      body: ok ? `${rupiah(order.total)} diterima ${shop.name}.` : `${note} Silakan unggah ulang bukti yang benar.`,
    };
  } else if (action === "MARK_PAID" && isSeller) {
    if (order.paymentStatus === "LUNAS") throw new PasarError("Sudah lunas.");
    patch.paymentStatus = "LUNAS";
    patch.paidAt = now;
  } else if (action === "REVIEW" && isBuyer) {
    if (order.status !== "SELESAI") throw new PasarError("Ulasan bisa diberikan setelah pesanan selesai.");
    if (order.rating) throw new PasarError("Anda sudah memberi ulasan.");
    const rating = Math.round(Number(payload.rating));
    if (!(rating >= 1 && rating <= 5)) throw new PasarError("Pilih 1–5 bintang.");
    patch.rating = rating;
    patch.review = payload.review?.trim().slice(0, 500) || null;
    patch.reviewedAt = now;
    notifySeller = { type: "PASAR_REVIEW", title: `${"⭐".repeat(rating)} ulasan dari ${order.buyerName}`, body: payload.review?.slice(0, 140) || order.orderNumber };
  } else if (action === "REPLY_REVIEW" && isSeller) {
    if (!order.rating) throw new PasarError("Belum ada ulasan.");
    patch.sellerReply = note ?? null;
  } else {
    throw new PasarError("Aksi tidak diizinkan untuk pesanan ini.", 403);
  }

  if (nextStatus) {
    patch.status = nextStatus;
    patch.statusHistory = [...(order.statusHistory ?? []), { status: nextStatus, at: now, by: actor.fullName, note }];
    // Rejected / cancelled orders give their stock back.
    if ((nextStatus === "DITOLAK" || nextStatus === "DIBATALKAN") && order.stockReserved) {
      const { data: prods } = await supabaseAdmin.from("shop_products").select("*").in("id", (order.items as OrderItem[]).map((i) => i.productId));
      await adjustStock(stockItems(order.items, new Map((prods as Product[] ?? []).map((p) => [p.id, p]))), 1);
      patch.stockReserved = false;
    }
    if (nextStatus === "SELESAI" && order.paymentMethod === "TUNAI" && order.paymentStatus !== "LUNAS") {
      patch.paymentStatus = "LUNAS";
      patch.paidAt = now;
    }
  }

  const { data: updated, error } = await supabaseAdmin.from("shop_orders").update(patch).eq("id", order.id).select().single();
  if (error) throw new PasarError(error.message, 500);

  if (nextStatus === "SELESAI") {
    for (const i of order.items as OrderItem[]) {
      const { data: p } = await supabaseAdmin.from("shop_products").select("soldCount").eq("id", i.productId).maybeSingle();
      if (p) await supabaseAdmin.from("shop_products").update({ soldCount: (p.soldCount ?? 0) + i.qty }).eq("id", i.productId);
    }
    await supabaseAdmin.from("shops").update({ orderCount: (shop.orderCount ?? 0) + 1 }).eq("id", shop.id);
  }
  if (action === "REVIEW") await recomputeRatings(shop.id, (order.items as OrderItem[]).map((i) => i.productId));

  if (notifyBuyer) {
    await notify({
      communityId: order.communityId, type: notifyBuyer.type ?? "PASAR_ORDER_STATUS", entity: { type: "ORDER", id: order.id },
      title: notifyBuyer.title, body: notifyBuyer.body, link: orderLink(order, false),
      target: { userIds: [order.buyerId] }, actorName: shop.name,
    });
  }
  if (notifySeller) {
    await notify({
      communityId: order.communityId, type: notifySeller.type, entity: { type: "ORDER", id: order.id },
      title: notifySeller.title, body: notifySeller.body, link: orderLink(order, true),
      target: { userIds: [shop.ownerId] }, actorName: order.buyerName,
    });
  }
  return updated as Order;
}

// ---------------- Feed ----------------

export async function publishProductToFeed(shop: Shop, p: Product) {
  await publishFeedPost({
    communityId: shop.communityId,
    module: "PASAR",
    type: "COMMERCE",
    entity: { type: "PRODUCT", id: p.id },
    title: p.name,
    content: p.description,
    images: p.images.slice(0, 4),
    payload: {
      productId: p.id, shopId: shop.id, shopName: shop.name, price: p.price, comparePrice: p.comparePrice, unit: p.unit,
      productType: p.type, contactPhone: shop.phone, itemCategory: shop.category,
    },
    author: { name: shop.name, role: "PENJUAL", block: shop.houseBlock ?? null },
  });
}

export async function hideProductFromFeed(shop: Shop, productId: string) {
  await updateFeedPostByEntity(shop.communityId, "PASAR", { type: "PRODUCT", id: productId }, { status: "HIDDEN" });
}
