"use client";

import * as React from "react";
import { Clock, CalendarClock } from "lucide-react";
import type { Product } from "@/lib/pasar/types";
import { SHOP_CATEGORY_META, rupiah } from "@/lib/pasar/types";
import type { ShopWithLoc } from "@/lib/pasar/client";
import { Stars } from "./sheet";

export function stockBadge(p: Product) {
  if (p.type === "JASA") return null;
  if (p.trackStock && p.stock === 0) return { label: "Habis", tone: "bg-slate-800 text-white" };
  if (p.trackStock && p.stock != null && p.stock <= p.lowStockAt) return { label: `Sisa ${p.stock}`, tone: "bg-red-600 text-white" };
  if (p.preorderDays > 0) return { label: `PO ${p.preorderDays} hari`, tone: "bg-violet-600 text-white" };
  return null;
}

export function ProductCard({ product: p, shop, onOpen }: { product: Product; shop?: ShopWithLoc; onOpen: () => void }) {
  const badge = stockBadge(p);
  const soldOut = p.type === "PRODUK" && p.trackStock && p.stock === 0;
  const discount = p.comparePrice && p.comparePrice > p.price ? Math.round((1 - p.price / p.comparePrice) * 100) : 0;
  return (
    <button onClick={onOpen} className={`group text-left rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] overflow-hidden flex flex-col transition-all hover:shadow-lg hover:-translate-y-0.5 ${soldOut ? "opacity-70" : ""}`}>
      <div className="relative aspect-square bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-5xl">
        {p.images[0] ? <img src={p.images[0]} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform" /> : SHOP_CATEGORY_META[(shop?.category ?? "LAINNYA") as keyof typeof SHOP_CATEGORY_META]?.emoji ?? "🛍️"}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
          {p.type === "JASA" && <span className="px-1.5 py-0.5 rounded-md bg-sky-600 text-white text-[10px] font-black">JASA</span>}
          {badge && <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${badge.tone}`}>{badge.label}</span>}
        </div>
        {discount > 0 && <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black">-{discount}%</span>}
      </div>
      <div className="p-2.5 flex-1 flex flex-col gap-0.5">
        <p className="text-xs font-bold leading-snug line-clamp-2">{p.name}</p>
        <p className="text-sm font-black text-emerald-600">
          {rupiah(p.price)}
          <span className="text-[10px] font-bold text-slate-400">/{p.unit}</span>
        </p>
        {p.comparePrice && p.comparePrice > p.price && <p className="text-[10px] text-slate-400 line-through -mt-0.5">{rupiah(p.comparePrice)}</p>}
        <div className="mt-auto pt-1 space-y-0.5">
          {p.type === "JASA" && p.durationMin && (
            <p className="text-[10px] text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {p.durationMin >= 60 ? `${p.durationMin / 60} jam` : `${p.durationMin} mnt`} · {p.serviceLocation === "KE_RUMAH" ? "ke rumah" : "di tempat"}</p>
          )}
          {p.preorderDays > 0 && p.type === "PRODUK" && <p className="text-[10px] text-violet-600 flex items-center gap-1"><CalendarClock className="w-3 h-3" /> Pesan H-{p.preorderDays}</p>}
          <p className="text-[10px] text-slate-500 truncate">{shop?.name}{shop?.houseBlock ? ` · ${shop.houseBlock}` : ""}</p>
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            {p.ratingCount > 0 ? (<><Stars value={Number(p.ratingAvg)} size="w-2.5 h-2.5" /> {Number(p.ratingAvg).toFixed(1)}</>) : <span>Baru</span>}
            {p.soldCount > 0 && <span>· {p.soldCount} terjual</span>}
          </div>
        </div>
      </div>
    </button>
  );
}
