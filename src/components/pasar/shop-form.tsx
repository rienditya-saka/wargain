"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import type { Shop, ShopCategory, WeeklyHour } from "@/lib/pasar/types";
import { SHOP_CATEGORY_META } from "@/lib/pasar/types";
import { pasarApi } from "@/lib/pasar/client";
import { Field, PhotoInput, inputClass, primaryBtn } from "@/components/keamanan/ui";

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function ShopForm({ userId, shop, onSaved }: { userId: string; shop: Shop | null; onSaved: (s: Shop, created: boolean) => void }) {
  const [name, setName] = React.useState(shop?.name ?? "");
  const [category, setCategory] = React.useState<ShopCategory>(shop?.category ?? "KULINER");
  const [tagline, setTagline] = React.useState(shop?.tagline ?? "");
  const [description, setDescription] = React.useState(shop?.description ?? "");
  const [logoUrl, setLogoUrl] = React.useState(shop?.logoUrl ?? undefined);
  const [bannerUrl, setBannerUrl] = React.useState(shop?.bannerUrl ?? undefined);
  const [phone, setPhone] = React.useState(shop?.phone ?? "");
  const [hours, setHours] = React.useState<WeeklyHour[]>(shop?.weeklyHours ?? [1, 2, 3, 4, 5, 6].map((d) => ({ day: d, start: "08:00", end: "17:00" })));
  const [closedDates, setClosedDates] = React.useState<string[]>(shop?.closedDates ?? []);
  const [newClosed, setNewClosed] = React.useState("");
  const [pickup, setPickup] = React.useState(shop?.pickupEnabled ?? true);
  const [delivery, setDelivery] = React.useState(shop?.deliveryEnabled ?? true);
  const [deliveryFee, setDeliveryFee] = React.useState(String(shop?.deliveryFee ?? 0));
  const [minOrder, setMinOrder] = React.useState(String(shop?.minOrder ?? 0));
  const [cash, setCash] = React.useState(shop?.paymentMethods.cash ?? true);
  const [bank, setBank] = React.useState(shop?.paymentMethods.transfer?.bank ?? "");
  const [accountNo, setAccountNo] = React.useState(shop?.paymentMethods.transfer?.accountNo ?? "");
  const [accountName, setAccountName] = React.useState(shop?.paymentMethods.transfer?.accountName ?? "");
  const [qris, setQris] = React.useState(shop?.paymentMethods.qris?.imageUrl ?? undefined);
  const [saving, setSaving] = React.useState(false);

  const toggleDay = (d: number) =>
    setHours((h) => (h.some((x) => x.day === d) ? h.filter((x) => x.day !== d) : [...h, { day: d, start: "08:00", end: "17:00" }].sort((a, b) => a.day - b.day)));
  const setTime = (d: number, key: "start" | "end", v: string) => setHours((h) => h.map((x) => (x.day === d ? { ...x, [key]: v } : x)));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await pasarApi<{ shop: Shop; created?: boolean }>("/api/pasar/shops", "POST", {
        userId,
        shop: {
          name, category, tagline, description, logoUrl, bannerUrl, phone, weeklyHours: hours, closedDates,
          pickupEnabled: pickup, deliveryEnabled: delivery, deliveryFee, minOrder, isOpen: shop?.isOpen ?? true,
          paymentMethods: { cash, transfer: bank && accountNo ? { bank, accountNo, accountName } : null, qris: qris ? { imageUrl: qris } : null },
        },
      });
      toast.success(r.created ? "Lapak dibuka! 🎉 Diumumkan di Feed warga." : "Lapak diperbarui.");
      onSaved(r.shop, !!r.created);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) => (
    <label className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-neutral-50 dark:bg-[#0B130E] cursor-pointer">
      <span className="text-xs font-bold">{label}</span>
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} className="w-5 h-5 accent-emerald-600" />
    </label>
  );

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-700 aspect-[3/1]">
        {bannerUrl && <img src={bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute bottom-2 left-3"><PhotoInput value={logoUrl} onChange={setLogoUrl} label="Logo" /></div>
        <div className="absolute top-2 right-2 bg-white/80 dark:bg-black/60 rounded-xl p-1"><PhotoInput value={bannerUrl} onChange={setBannerUrl} label="Banner" /></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Nama lapak"><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="mis. Dapur Bu Lina" required /></Field>
        <Field label="Kategori">
          <select value={category} onChange={(e) => setCategory(e.target.value as ShopCategory)} className={inputClass}>
            {(Object.keys(SHOP_CATEGORY_META) as ShopCategory[]).map((c) => <option key={c} value={c}>{SHOP_CATEGORY_META[c].emoji} {SHOP_CATEGORY_META[c].label}</option>)}
          </select>
        </Field>
        <Field label="Slogan singkat"><input value={tagline} onChange={(e) => setTagline(e.target.value)} className={inputClass} placeholder="mis. Masakan rumahan, bumbu turun-temurun" /></Field>
        <Field label="No. WhatsApp"><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={inputClass} placeholder="08..." /></Field>
      </div>
      <Field label="Deskripsi"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass} /></Field>

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3 space-y-2">
        <p className="text-xs font-extrabold">Jam buka & jadwal layanan</p>
        <p className="text-[10px] text-slate-500">Dipakai untuk status "buka sekarang" dan slot booking jasa.</p>
        {DAYS.map((label, d) => {
          const h = hours.find((x) => x.day === d);
          return (
            <div key={d} className="flex items-center gap-2 text-xs">
              <label className="w-24 flex items-center gap-2 font-semibold">
                <input type="checkbox" checked={!!h} onChange={() => toggleDay(d)} className="w-4 h-4 accent-emerald-600" /> {label}
              </label>
              {h ? (
                <>
                  <input type="time" value={h.start} onChange={(e) => setTime(d, "start", e.target.value)} className={`${inputClass} !w-28`} />
                  <span>–</span>
                  <input type="time" value={h.end} onChange={(e) => setTime(d, "end", e.target.value)} className={`${inputClass} !w-28`} />
                </>
              ) : <span className="text-slate-400">Libur</span>}
            </div>
          );
        })}
        <div className="pt-2 space-y-1.5">
          <p className="text-[11px] font-bold text-slate-500">Tanggal libur khusus</p>
          <div className="flex gap-2">
            <input type="date" value={newClosed} onChange={(e) => setNewClosed(e.target.value)} className={inputClass} />
            <button type="button" onClick={() => { if (newClosed && !closedDates.includes(newClosed)) setClosedDates((l) => [...l, newClosed].sort()); setNewClosed(""); }} className="px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 shrink-0" aria-label="Tambah tanggal libur"><Plus className="w-4 h-4" /></button>
          </div>
          <div className="flex flex-wrap gap-1">
            {closedDates.map((d) => (
              <span key={d} className="pl-2 pr-1 py-0.5 rounded-full bg-red-500/10 text-red-700 dark:text-red-300 text-[11px] font-bold flex items-center gap-1">
                {new Date(`${d}T12:00:00+07:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                <button type="button" onClick={() => setClosedDates((l) => l.filter((x) => x !== d))} aria-label="Hapus"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3 space-y-2">
        <p className="text-xs font-extrabold">Pengambilan & antar</p>
        <Toggle on={pickup} set={setPickup} label="Pembeli bisa ambil sendiri" />
        <Toggle on={delivery} set={setDelivery} label="Antar dalam cluster" />
        <div className="grid grid-cols-2 gap-2">
          {delivery && <Field label="Ongkir (Rp)"><input type="number" min={0} inputMode="numeric" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} className={inputClass} /></Field>}
          <Field label="Minimal belanja (Rp)"><input type="number" min={0} inputMode="numeric" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} className={inputClass} /></Field>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3 space-y-2">
        <p className="text-xs font-extrabold">Metode pembayaran</p>
        <Toggle on={cash} set={setCash} label="Tunai (COD / bayar di tempat)" />
        <div className="grid grid-cols-3 gap-2">
          <Field label="Bank / e-wallet"><input value={bank} onChange={(e) => setBank(e.target.value)} className={inputClass} placeholder="BCA / DANA" /></Field>
          <Field label="No. rekening"><input value={accountNo} onChange={(e) => setAccountNo(e.target.value)} inputMode="numeric" className={inputClass} /></Field>
          <Field label="Atas nama"><input value={accountName} onChange={(e) => setAccountName(e.target.value)} className={inputClass} /></Field>
        </div>
        <div className="flex items-center gap-3">
          <PhotoInput value={qris} onChange={setQris} label="QRIS" />
          <p className="text-[11px] text-slate-500">Unggah gambar QRIS statis lapak Anda (opsional).</p>
        </div>
      </div>

      <button type="submit" disabled={saving} className={`${primaryBtn} w-full`}>{saving ? "Menyimpan..." : shop ? "Simpan perubahan" : "Buka lapak sekarang"}</button>
    </form>
  );
}
