"use client";

import * as React from "react";
import { toast } from "sonner";
import { MapPin, Clock, ShoppingCart, CalendarCheck, Store, Loader2 } from "lucide-react";
import type { Product } from "@/lib/pasar/types";
import { rupiah } from "@/lib/pasar/types";
import type { ShopWithLoc } from "@/lib/pasar/client";
import type { Slot } from "@/lib/pasar/slots";
import { jakartaDateKey } from "@/lib/pasar/slots";
import { Sheet, Stars, Stepper } from "./sheet";
import { stockBadge } from "./product-card";

interface DayAvail {
  date: string;
  open: boolean;
  slots: Slot[];
  available: number;
}

export function ProductSheet({
  product,
  shop,
  open,
  onClose,
  isOwner,
  onAddToCart,
  onBook,
  onOpenShop,
}: {
  product: Product | null;
  shop?: ShopWithLoc;
  open: boolean;
  onClose: () => void;
  isOwner: boolean;
  onAddToCart: (p: Product, qty: number, variant: string | null) => void;
  onBook: (p: Product, slot: Slot) => void;
  onOpenShop: (shopId: string) => void;
}) {
  const [img, setImg] = React.useState(0);
  const [qty, setQty] = React.useState(1);
  const [variant, setVariant] = React.useState<string | null>(null);
  const [days, setDays] = React.useState<DayAvail[] | null>(null);
  const [day, setDay] = React.useState<string | null>(null);
  const [slot, setSlot] = React.useState<Slot | null>(null);

  React.useEffect(() => {
    if (!open || !product) return;
    setImg(0);
    setQty(1);
    setVariant(product.variants[0]?.name ?? null);
    setSlot(null);
    setDays(null);
    if (product.type === "JASA") {
      fetch(`/api/pasar/slots?productId=${encodeURIComponent(product.id)}&from=${jakartaDateKey()}&days=14`)
        .then((r) => r.json())
        .then((j: { days: DayAvail[] }) => {
          setDays(j.days ?? []);
          setDay((j.days ?? []).find((d) => d.available > 0)?.date ?? null);
        })
        .catch(() => setDays([]));
    }
  }, [open, product]);

  if (!product) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;
  const p = product;
  const v = p.variants.find((x) => x.name === variant);
  const price = p.price + (v?.priceDelta ?? 0);
  const badge = stockBadge(p);
  const soldOut = p.type === "PRODUK" && p.trackStock && p.stock === 0;
  const maxQty = Math.min(p.maxPerOrder ?? Infinity, p.trackStock && p.stock != null ? p.stock : Infinity);
  const shopClosed = !!shop && !shop.isOpen;
  const current = days?.find((d) => d.date === day);

  const footer = isOwner ? (
    <p className="text-center text-xs text-slate-500">Ini produk lapak Anda sendiri.</p>
  ) : p.type === "JASA" ? (
    <button
      disabled={!slot || shopClosed}
      onClick={() => slot && onBook(p, slot)}
      className="w-full min-h-[48px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black flex items-center justify-center gap-2 disabled:opacity-40"
    >
      <CalendarCheck className="w-5 h-5" />
      {slot ? `Booking ${new Date(slot.start).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Jakarta" })} · ${slot.label}` : "Pilih jadwal dulu"}
    </button>
  ) : (
    <div className="flex items-center gap-2">
      <Stepper value={qty} onChange={setQty} max={Number.isFinite(maxQty) ? maxQty : null} />
      <button
        disabled={soldOut || shopClosed}
        onClick={() => {
          onAddToCart(p, qty, variant);
          toast.success(`${qty}× ${p.name} masuk keranjang`);
        }}
        className="flex-1 min-h-[48px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black flex items-center justify-center gap-2 disabled:opacity-40"
      >
        <ShoppingCart className="w-5 h-5" /> {soldOut ? "Stok habis" : shopClosed ? "Lapak tutup" : `Tambah · ${rupiah(price * qty)}`}
      </button>
    </div>
  );

  return (
    <Sheet open={open} onClose={onClose} title={p.type === "JASA" ? "Detail Jasa" : "Detail Produk"} footer={footer}>
      <div className="relative aspect-[4/3] bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-7xl">
        {p.images[img] ? <img src={p.images[img]} alt="" className="absolute inset-0 w-full h-full object-cover" /> : "🛍️"}
        {badge && <span className={`absolute top-3 left-3 px-2 py-1 rounded-lg text-[11px] font-black ${badge.tone}`}>{badge.label}</span>}
        {p.images.length > 1 && (
          <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
            {p.images.map((_, i) => (
              <button key={i} onClick={() => setImg(i)} className={`h-1.5 rounded-full transition-all ${i === img ? "w-5 bg-white" : "w-1.5 bg-white/60"}`} aria-label={`Foto ${i + 1}`} />
            ))}
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-black leading-snug">{p.name}</h2>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-black text-emerald-600">{rupiah(price)}</p>
            <p className="text-xs font-bold text-slate-400 pb-1">/{p.unit}</p>
            {p.comparePrice && p.comparePrice > p.price && <p className="text-xs text-slate-400 line-through pb-1">{rupiah(p.comparePrice)}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            {p.ratingCount > 0 && <span className="flex items-center gap-1"><Stars value={Number(p.ratingAvg)} /> {Number(p.ratingAvg).toFixed(1)} ({p.ratingCount})</span>}
            {p.soldCount > 0 && <span>{p.soldCount} terjual</span>}
            {p.type === "PRODUK" && p.trackStock && p.stock != null && p.stock > 0 && <span>Stok {p.stock}</span>}
            {p.type === "JASA" && p.durationMin && (
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {p.durationMin} menit · {p.serviceLocation === "KE_RUMAH" ? "penjual datang ke rumah" : "datang ke tempat"}</span>
            )}
          </div>
        </div>

        {p.variants.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-slate-500 mb-1.5">Pilihan</p>
            <div className="flex flex-wrap gap-1.5">
              {p.variants.map((x) => (
                <button key={x.name} onClick={() => setVariant(x.name)} className={`px-3 min-h-[36px] rounded-xl border text-xs font-bold ${variant === x.name ? "bg-emerald-600 border-emerald-600 text-white" : "border-neutral-200 dark:border-neutral-700"}`}>
                  {x.name}{x.priceDelta ? ` (${x.priceDelta > 0 ? "+" : ""}${rupiah(x.priceDelta)})` : ""}
                </button>
              ))}
            </div>
          </div>
        )}

        {p.type === "JASA" && !isOwner && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-500">Pilih jadwal</p>
            {!days ? (
              <div className="h-24 rounded-xl bg-neutral-100 dark:bg-neutral-900 animate-pulse flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
            ) : days.every((d) => !d.open) ? (
              <p className="text-xs text-slate-500">Belum ada jadwal buka 2 minggu ke depan.</p>
            ) : (
              <>
                <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                  {days.map((d) => {
                    const dt = new Date(`${d.date}T12:00:00+07:00`);
                    const active = d.date === day;
                    const disabled = !d.open || d.available === 0;
                    return (
                      <button
                        key={d.date}
                        disabled={disabled}
                        onClick={() => {
                          setDay(d.date);
                          setSlot(null);
                        }}
                        className={`shrink-0 w-14 py-2 rounded-xl border text-center transition-colors ${active ? "bg-emerald-600 border-emerald-600 text-white" : disabled ? "border-dashed border-neutral-200 dark:border-neutral-800 text-slate-300 dark:text-slate-600" : "border-neutral-200 dark:border-neutral-700"}`}
                      >
                        <p className="text-[10px] font-bold">{dt.toLocaleDateString("id-ID", { weekday: "short", timeZone: "Asia/Jakarta" })}</p>
                        <p className="text-base font-black leading-tight">{dt.toLocaleDateString("id-ID", { day: "numeric", timeZone: "Asia/Jakarta" })}</p>
                        <p className="text-[9px]">{!d.open ? "Tutup" : d.available ? `${d.available} slot` : "Penuh"}</p>
                      </button>
                    );
                  })}
                </div>
                {current && (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                    {current.slots.map((s) => (
                      <button
                        key={s.start}
                        disabled={!!s.reason}
                        onClick={() => setSlot(s)}
                        className={`min-h-[40px] rounded-xl border text-xs font-bold ${slot?.start === s.start ? "bg-emerald-600 border-emerald-600 text-white" : s.reason ? "border-neutral-100 dark:border-neutral-800 text-slate-300 dark:text-slate-600 line-through" : "border-neutral-200 dark:border-neutral-700 hover:border-emerald-500"}`}
                        title={s.reason === "PENUH" ? "Penuh" : s.reason === "LEWAT" ? "Sudah lewat" : `${s.remaining} tempat tersisa`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {p.description && <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">{p.description}</p>}
        {p.preorderDays > 0 && p.type === "PRODUK" && (
          <p className="text-xs p-3 rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300 font-semibold">Pre-order: pesan paling lambat {p.preorderDays} hari sebelum tanggal ambil/antar.</p>
        )}

        {shop && (
          <button onClick={() => onOpenShop(shop.id)} className="w-full flex items-center gap-3 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-left hover:border-emerald-500/50">
            <div className="w-11 h-11 rounded-xl bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex items-center justify-center shrink-0">
              {shop.logoUrl ? <img src={shop.logoUrl} alt="" className="w-full h-full object-cover" /> : <Store className="w-5 h-5 text-slate-400" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold truncate">{shop.name}</p>
              <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 shrink-0" /> {shop.houseBlock ?? "-"}
                {shop.ratingCount > 0 && <> · ⭐ {Number(shop.ratingAvg).toFixed(1)}</>}
                {!shop.isOpen && <span className="text-red-600 font-bold"> · Tutup</span>}
              </p>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">Kunjungi lapak →</span>
          </button>
        )}
      </div>
    </Sheet>
  );
}
