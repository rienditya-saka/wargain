"use client";

import * as React from "react";
import { toast } from "sonner";
import { Bike, Store, Banknote, Landmark, QrCode, Trash2, CalendarCheck } from "lucide-react";
import type { Fulfillment, Order, PaymentMethod, Product } from "@/lib/pasar/types";
import { rupiah } from "@/lib/pasar/types";
import { pasarApi, type Cart, type ShopWithLoc } from "@/lib/pasar/client";
import type { Slot } from "@/lib/pasar/slots";
import { jakartaDateKey } from "@/lib/pasar/slots";
import { Sheet, Stepper } from "./sheet";

export interface BookingDraft {
  product: Product;
  slot: Slot;
}

export function CheckoutSheet({
  open,
  onClose,
  userId,
  shop,
  cart,
  products,
  booking,
  onQty,
  onPlaced,
}: {
  open: boolean;
  onClose: () => void;
  userId?: string;
  shop?: ShopWithLoc;
  cart: Cart;
  products: Map<string, Product>;
  booking: BookingDraft | null;
  onQty: (productId: string, variant: string | null | undefined, qty: number) => void;
  onPlaced: (order: Order, fromCart: boolean) => void;
}) {
  const pm = shop?.paymentMethods ?? { cash: true, transfer: null, qris: null };
  const methods = ([["TUNAI", pm.cash], ["TRANSFER", !!pm.transfer], ["QRIS", !!pm.qris]] as [PaymentMethod, boolean][]).filter(([, on]) => on).map(([m]) => m);
  const [fulfillment, setFulfillment] = React.useState<Fulfillment>("AMBIL");
  const [payment, setPayment] = React.useState<PaymentMethod>("TUNAI");
  const [notes, setNotes] = React.useState("");
  const [date, setDate] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const lines = booking
    ? [{ product: booking.product, qty: 1, variant: null as string | null, price: booking.product.price }]
    : cart.lines
        .map((l) => {
          const p = products.get(l.productId);
          if (!p) return null;
          const v = p.variants.find((x) => x.name === l.variant);
          return { product: p, qty: l.qty, variant: l.variant ?? null, price: p.price + (v?.priceDelta ?? 0) };
        })
        .filter(Boolean) as { product: Product; qty: number; variant: string | null; price: number }[];
  const preorderDays = Math.max(0, ...lines.map((l) => (l.product.type === "PRODUK" ? l.product.preorderDays : 0)));
  const minDate = preorderDays ? jakartaDateKey(new Date(Date.now() + preorderDays * 86_400_000)) : "";

  React.useEffect(() => {
    if (!open || !shop) return;
    setFulfillment(shop.pickupEnabled ? "AMBIL" : "ANTAR");
    setPayment(methods[0] ?? "TUNAI");
    setDate(minDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shop?.id]);

  const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0);
  const fee = !booking && fulfillment === "ANTAR" ? shop?.deliveryFee ?? 0 : 0;
  const belowMin = !!shop?.minOrder && subtotal < shop.minOrder;

  const place = async () => {
    if (!userId) {
      toast.error("Silakan login untuk memesan.");
      return;
    }
    if (!shop || !lines.length) return;
    setSending(true);
    try {
      const res = await pasarApi<{ order: Order }>("/api/pasar/orders", "POST", {
        userId,
        shopId: shop.id,
        items: lines.map((l) => ({ productId: l.product.id, qty: l.qty, variant: l.variant })),
        fulfillment,
        paymentMethod: payment,
        scheduledAt: booking ? booking.slot.start : preorderDays && date ? new Date(`${date}T09:00:00+07:00`).toISOString() : null,
        notes,
      });
      onPlaced(res.order, !booking);
      setNotes("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  const Option = ({ active, onClick, icon: Icon, title, sub, disabled }: { active: boolean; onClick: () => void; icon: React.ElementType; title: string; sub?: string; disabled?: boolean }) => (
    <button type="button" disabled={disabled} onClick={onClick} className={`flex-1 min-h-[56px] p-2.5 rounded-xl border text-left flex items-center gap-2 disabled:opacity-40 ${active ? "border-emerald-600 bg-emerald-500/10" : "border-neutral-200 dark:border-neutral-700"}`}>
      <Icon className={`w-5 h-5 shrink-0 ${active ? "text-emerald-600" : "text-slate-400"}`} />
      <span className="min-w-0">
        <span className="block text-xs font-bold">{title}</span>
        {sub && <span className="block text-[10px] text-slate-500 truncate">{sub}</span>}
      </span>
    </button>
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={booking ? "Konfirmasi Booking" : `Keranjang · ${shop?.name ?? ""}`}
      footer={
        lines.length ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Total</span>
              <span className="text-lg font-black">{rupiah(subtotal + fee)}</span>
            </div>
            <button onClick={place} disabled={sending || belowMin} className="w-full min-h-[48px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black disabled:opacity-40">
              {sending ? "Memproses..." : belowMin ? `Minimal belanja ${rupiah(shop!.minOrder)}` : booking ? "Kirim booking" : "Buat pesanan"}
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="p-4 space-y-4">
        {lines.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <p className="text-4xl">🛒</p>
            <p className="text-sm font-bold">Keranjang masih kosong</p>
          </div>
        ) : (
          <>
            {booking && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                <CalendarCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <p className="font-extrabold">{new Date(booking.slot.start).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jakarta" })}</p>
                  <p>{booking.slot.label} – {new Date(booking.slot.end).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })} WIB · {booking.product.serviceLocation === "KE_RUMAH" ? "penjual datang ke rumah Anda" : `datang ke ${shop?.houseBlock ?? "lapak"}`}</p>
                </div>
              </div>
            )}

            <ul className="space-y-2">
              {lines.map((l) => (
                <li key={`${l.product.id}:${l.variant ?? ""}`} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 overflow-hidden shrink-0 flex items-center justify-center">
                    {l.product.images[0] ? <img src={l.product.images[0]} alt="" className="w-full h-full object-cover" /> : "🛍️"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{l.product.name}</p>
                    <p className="text-[11px] text-slate-500">{l.variant ? `${l.variant} · ` : ""}{rupiah(l.price)}</p>
                  </div>
                  {booking ? (
                    <p className="text-sm font-black">{rupiah(l.price)}</p>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Stepper value={l.qty} min={0} onChange={(q) => onQty(l.product.id, l.variant, q)} max={l.product.trackStock && l.product.stock != null ? l.product.stock : l.product.maxPerOrder} />
                      <button onClick={() => onQty(l.product.id, l.variant, 0)} className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 flex items-center justify-center" aria-label="Hapus"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {!booking && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold text-slate-500">Pengambilan</p>
                <div className="flex gap-2">
                  <Option active={fulfillment === "AMBIL"} disabled={!shop?.pickupEnabled} onClick={() => setFulfillment("AMBIL")} icon={Store} title="Ambil sendiri" sub={shop?.houseBlock ?? undefined} />
                  <Option active={fulfillment === "ANTAR"} disabled={!shop?.deliveryEnabled} onClick={() => setFulfillment("ANTAR")} icon={Bike} title="Diantar" sub={shop?.deliveryEnabled ? (shop.deliveryFee ? `+${rupiah(shop.deliveryFee)}` : "Gratis ongkir") : "Tidak tersedia"} />
                </div>
              </div>
            )}

            {!booking && preorderDays > 0 && (
              <label className="block space-y-1">
                <span className="text-[11px] font-bold text-slate-500">Tanggal {fulfillment === "ANTAR" ? "antar" : "ambil"} (pre-order H-{preorderDays})</span>
                <input type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} className="w-full min-h-[42px] px-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#0B130E] text-sm" />
              </label>
            )}

            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-slate-500">Pembayaran</p>
              <div className="flex gap-2">
                {methods.includes("TUNAI") && <Option active={payment === "TUNAI"} onClick={() => setPayment("TUNAI")} icon={Banknote} title="Tunai" sub={booking ? "Bayar di tempat" : "Saat ambil / antar"} />}
                {methods.includes("TRANSFER") && <Option active={payment === "TRANSFER"} onClick={() => setPayment("TRANSFER")} icon={Landmark} title="Transfer" sub={pm.transfer?.bank} />}
                {methods.includes("QRIS") && <Option active={payment === "QRIS"} onClick={() => setPayment("QRIS")} icon={QrCode} title="QRIS" sub="Semua e-wallet" />}
              </div>
              {payment !== "TUNAI" && <p className="text-[10px] text-slate-500">Setelah pesan, Anda mendapat info rekening / QRIS dan bisa unggah bukti bayar.</p>}
            </div>

            <label className="block space-y-1">
              <span className="text-[11px] font-bold text-slate-500">Catatan untuk penjual</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} placeholder={booking ? "mis. AC 1 PK, di kamar depan" : "mis. sambal dipisah"} className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#0B130E] text-sm" />
            </label>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{rupiah(subtotal)}</span></div>
              {fee > 0 && <div className="flex justify-between text-slate-500"><span>Ongkir</span><span>{rupiah(fee)}</span></div>}
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
