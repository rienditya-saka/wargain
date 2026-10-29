"use client";

import * as React from "react";
import { toast } from "sonner";
import { ImagePlus, Plus, X, Package, Wrench } from "lucide-react";
import type { Product, ProductType, Variant } from "@/lib/pasar/types";
import { pasarApi } from "@/lib/pasar/client";
import { fileToResizedDataUrl } from "@/lib/keamanan/store";
import { Field, Segmented, inputClass, primaryBtn } from "@/components/keamanan/ui";

export function ProductForm({ userId, product, onSaved }: { userId: string; product: Product | null; onSaved: (p: Product) => void }) {
  const [type, setType] = React.useState<ProductType>(product?.type ?? "PRODUK");
  const [name, setName] = React.useState(product?.name ?? "");
  const [description, setDescription] = React.useState(product?.description ?? "");
  const [price, setPrice] = React.useState(product ? String(product.price) : "");
  const [comparePrice, setComparePrice] = React.useState(product?.comparePrice ? String(product.comparePrice) : "");
  const [unit, setUnit] = React.useState(product?.unit ?? "pcs");
  const [images, setImages] = React.useState<string[]>(product?.images ?? []);
  const [trackStock, setTrackStock] = React.useState(product?.trackStock ?? true);
  const [stock, setStock] = React.useState(product?.stock != null ? String(product.stock) : "10");
  const [variants, setVariants] = React.useState<Variant[]>(product?.variants ?? []);
  const [preorderDays, setPreorderDays] = React.useState(String(product?.preorderDays ?? 0));
  const [maxPerOrder, setMaxPerOrder] = React.useState(product?.maxPerOrder ? String(product.maxPerOrder) : "");
  const [durationMin, setDurationMin] = React.useState(String(product?.durationMin ?? 60));
  const [slotCapacity, setSlotCapacity] = React.useState(String(product?.slotCapacity ?? 1));
  const [serviceLocation, setServiceLocation] = React.useState<"DI_TEMPAT" | "KE_RUMAH">(product?.serviceLocation ?? "KE_RUMAH");
  const [publish, setPublish] = React.useState(!product);
  const [saving, setSaving] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!product) setUnit(type === "JASA" ? "sesi" : "pcs");
  }, [type, product]);

  const addImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 5 - images.length);
    e.target.value = "";
    const urls = await Promise.all(files.map((f) => fileToResizedDataUrl(f, 900, 0.75)));
    setImages((l) => [...l, ...urls].slice(0, 5));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await pasarApi<{ product: Product }>("/api/pasar/products", "POST", {
        userId,
        publishToFeed: publish,
        product: {
          id: product?.id, type, name, description, price, comparePrice, unit, images, trackStock, stock, variants,
          preorderDays, maxPerOrder, durationMin, slotCapacity, serviceLocation, isActive: product?.isActive ?? true,
        },
      });
      toast.success(product ? "Produk diperbarui." : publish ? "Produk ditambahkan & tampil di Feed warga." : "Produk ditambahkan.");
      onSaved(r.product);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-3">
      {!product && (
        <Segmented value={type} onChange={setType} options={[{ value: "PRODUK", label: <span className="flex items-center justify-center gap-1"><Package className="w-3.5 h-3.5" /> Produk</span> }, { value: "JASA", label: <span className="flex items-center justify-center gap-1"><Wrench className="w-3.5 h-3.5" /> Jasa (booking)</span> }]} />
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {images.map((src, i) => (
          <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
            <img src={src} alt="" className="w-full h-full object-cover" />
            {i === 0 && <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] font-bold text-center">Utama</span>}
            <button type="button" onClick={() => setImages((l) => l.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center" aria-label="Hapus foto"><X className="w-3 h-3" /></button>
          </div>
        ))}
        {images.length < 5 && (
          <button type="button" onClick={() => fileRef.current?.click()} className="w-20 h-20 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex flex-col items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
            <ImagePlus className="w-5 h-5" /> Foto
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={addImages} className="hidden" />
      </div>

      <Field label={type === "JASA" ? "Nama layanan" : "Nama produk"}>
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder={type === "JASA" ? "mis. Cuci AC split" : "mis. Nasi uduk komplit"} required />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Harga (Rp)"><input type="number" min={0} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} required /></Field>
        <Field label="Harga coret"><input type="number" min={0} inputMode="numeric" value={comparePrice} onChange={(e) => setComparePrice(e.target.value)} className={inputClass} placeholder="opsional" /></Field>
        <Field label="Satuan"><input value={unit} onChange={(e) => setUnit(e.target.value)} className={inputClass} /></Field>
      </div>
      <Field label="Deskripsi"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass} placeholder={type === "JASA" ? "Apa saja yang dikerjakan, alat yang dibawa, garansi..." : "Isi, ukuran porsi, bahan..."} /></Field>

      {type === "PRODUK" ? (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3 space-y-2">
          <label className="flex items-center justify-between text-xs font-bold">
            Hitung stok otomatis
            <input type="checkbox" checked={trackStock} onChange={(e) => setTrackStock(e.target.checked)} className="w-5 h-5 accent-emerald-600" />
          </label>
          <div className="grid grid-cols-3 gap-2">
            {trackStock && <Field label="Stok"><input type="number" min={0} inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} className={inputClass} /></Field>}
            <Field label="Pre-order (hari)"><input type="number" min={0} max={30} inputMode="numeric" value={preorderDays} onChange={(e) => setPreorderDays(e.target.value)} className={inputClass} /></Field>
            <Field label="Maks / pesanan"><input type="number" min={1} inputMode="numeric" value={maxPerOrder} onChange={(e) => setMaxPerOrder(e.target.value)} className={inputClass} placeholder="bebas" /></Field>
          </div>
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold text-slate-500">Varian (opsional)</p>
            {variants.map((v, i) => (
              <div key={i} className="flex gap-2">
                <input value={v.name} onChange={(e) => setVariants((l) => l.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className={inputClass} placeholder="mis. Pedas / Jumbo" />
                <input type="number" value={v.priceDelta} onChange={(e) => setVariants((l) => l.map((x, j) => (j === i ? { ...x, priceDelta: Number(e.target.value) } : x)))} className={`${inputClass} !w-28`} placeholder="+Rp" />
                <button type="button" onClick={() => setVariants((l) => l.filter((_, j) => j !== i))} className="px-2 text-slate-400" aria-label="Hapus varian"><X className="w-4 h-4" /></button>
              </div>
            ))}
            <button type="button" onClick={() => setVariants((l) => [...l, { name: "", priceDelta: 0 }])} className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Tambah varian</button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Durasi (menit)"><input type="number" min={15} step={15} inputMode="numeric" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} className={inputClass} /></Field>
            <Field label="Pelanggan per slot"><input type="number" min={1} inputMode="numeric" value={slotCapacity} onChange={(e) => setSlotCapacity(e.target.value)} className={inputClass} /></Field>
          </div>
          <Segmented value={serviceLocation} onChange={setServiceLocation} options={[{ value: "KE_RUMAH", label: "🏠 Saya datang ke rumah" }, { value: "DI_TEMPAT", label: "📍 Pelanggan datang" }]} />
          <p className="text-[10px] text-slate-500">Slot booking mengikuti jam buka lapak. Contoh: buka 08–17, durasi 60 menit → slot 08:00, 09:00, … 16:00.</p>
        </div>
      )}

      {!product && (
        <label className="flex items-center gap-2 text-xs font-semibold">
          <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} className="w-4 h-4 accent-emerald-600" /> Umumkan di Feed warga
        </label>
      )}
      <button type="submit" disabled={saving} className={`${primaryBtn} w-full`}>{saving ? "Menyimpan..." : product ? "Simpan" : "Tambahkan"}</button>
    </form>
  );
}
