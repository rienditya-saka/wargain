"use client";

import * as React from "react";
import { AppSheet } from "@/components/ui/app-sheet";
import { toast } from "sonner";
import { X, ImagePlus, Megaphone, ShoppingBag, MessageSquareWarning, PenLine, Pin } from "lucide-react";
import { fileToResizedDataUrl } from "@/lib/keamanan/store";
import { PENGURUS_ROLES } from "@/lib/notifications/registry";
import type { UserPostType } from "@/lib/feed/types";

const TYPES: { id: UserPostType; label: string; icon: React.ElementType; hint: string; pengurusOnly?: boolean }[] = [
  { id: "GENERAL", label: "Umum", icon: PenLine, hint: "Apa kabar lingkungan hari ini?" },
  { id: "ANNOUNCEMENT", label: "Pengumuman", icon: Megaphone, hint: "Pengumuman resmi untuk seluruh warga", pengurusOnly: true },
  { id: "COMMERCE", label: "Jual Beli", icon: ShoppingBag, hint: "Jual makanan, barang bekas, jasa..." },
  { id: "REPORT", label: "Aduan", icon: MessageSquareWarning, hint: "Laporkan masalah lingkungan ke pengurus" },
];

export function Composer({
  open,
  onClose,
  role,
  initialType = "GENERAL",
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  role?: string;
  initialType?: UserPostType;
  onSubmit: (input: { type: UserPostType; title?: string; content: string; images: string[]; payload?: Record<string, unknown>; pinDays?: number }) => Promise<unknown>;
}) {
  const isPengurus = PENGURUS_ROLES.includes(role ?? "");
  const [type, setType] = React.useState<UserPostType>(initialType);
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [images, setImages] = React.useState<string[]>([]);
  const [price, setPrice] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [pinDays, setPinDays] = React.useState(0);
  const [sending, setSending] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) setType(initialType === "ANNOUNCEMENT" && !isPengurus ? "GENERAL" : initialType);
  }, [open, initialType, isPengurus]);

  const reset = () => {
    setTitle("");
    setContent("");
    setImages([]);
    setPrice("");
    setPhone("");
    setPinDays(0);
  };

  const addImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 4 - images.length);
    e.target.value = "";
    const urls = await Promise.all(files.map((f) => fileToResizedDataUrl(f, 1080, 0.75)));
    setImages((l) => [...l, ...urls].slice(0, 4));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && images.length === 0) {
      toast.error("Tulis sesuatu atau tambahkan foto.");
      return;
    }
    if (type === "COMMERCE" && !title.trim()) {
      toast.error("Nama produk wajib diisi.");
      return;
    }
    setSending(true);
    try {
      await onSubmit({
        type,
        title: title.trim() || undefined,
        content,
        images,
        payload: type === "COMMERCE" ? { price: price ? Number(price) : undefined, contactPhone: phone || undefined } : undefined,
        pinDays: type === "ANNOUNCEMENT" ? pinDays : undefined,
      });
      toast.success(type === "ANNOUNCEMENT" ? "Pengumuman terbit & dikirim ke semua warga." : type === "REPORT" ? "Aduan terkirim ke pengurus." : "Post terbit!");
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const current = TYPES.find((t) => t.id === type)!;

  return (
    <AppSheet
      open={open}
      onClose={onClose}
      onSubmit={submit}
      title="Buat Post"
      ariaLabel="Buat post"
      footer={
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={images.length >= 4} className="min-h-[40px] px-3 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-1.5 disabled:opacity-40">
            <ImagePlus className="w-4 h-4" /> Foto ({images.length}/4)
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={addImages} className="hidden" />
          <button type="submit" disabled={sending} className="min-h-[42px] px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black disabled:opacity-50">
            {sending ? "Mengirim..." : "Posting"}
          </button>
        </div>
      }
    >
            <div className="px-4 py-3 space-y-3">
              <div className="grid grid-cols-4 gap-1.5">
                {TYPES.filter((t) => !t.pengurusOnly || isPengurus).map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setType(t.id)}
                      className={`min-h-[58px] rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-colors ${
                        type === t.id ? "bg-emerald-600 border-emerald-600 text-white" : "border-neutral-200 dark:border-neutral-800 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      <Icon className="w-4 h-4" /> {t.label}
                    </button>
                  );
                })}
              </div>

              {(type !== "GENERAL") && (
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={type === "COMMERCE" ? "Nama produk / jasa" : type === "REPORT" ? "Judul aduan, mis. Lampu jalan mati" : "Judul pengumuman"}
                  className="w-full text-base font-bold bg-transparent border-0 border-b border-neutral-200 dark:border-neutral-800 px-0 py-2 focus:outline-none focus:border-emerald-500"
                />
              )}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={current.hint}
                rows={5}
                autoFocus
                className="w-full text-sm bg-transparent border-0 px-0 resize-none focus:outline-none"
              />

              {images.length > 0 && (
                <div className="grid grid-cols-4 gap-1.5">
                  {images.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setImages((l) => l.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center" aria-label="Hapus foto">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {type === "COMMERCE" && (
                <div className="grid grid-cols-2 gap-2">
                  <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" inputMode="numeric" placeholder="Harga (Rp)" className="min-h-[40px] px-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#0B130E] text-xs" />
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="No. WhatsApp" className="min-h-[40px] px-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#0B130E] text-xs" />
                </div>
              )}

              {type === "ANNOUNCEMENT" && (
                <div className="flex items-center gap-2 text-xs">
                  <Pin className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-semibold">Sematkan di atas feed:</span>
                  {[0, 1, 3, 7].map((d) => (
                    <button type="button" key={d} onClick={() => setPinDays(d)} className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${pinDays === d ? "bg-emerald-600 border-emerald-600 text-white" : "border-neutral-200 dark:border-neutral-700"}`}>
                      {d === 0 ? "Tidak" : `${d} hari`}
                    </button>
                  ))}
                </div>
              )}
              {type === "ANNOUNCEMENT" && <p className="text-[11px] text-slate-500">Pengumuman dikirim sebagai notifikasi ke seluruh warga.</p>}
              {type === "REPORT" && <p className="text-[11px] text-slate-500">Aduan tampil di feed & dikirim ke pengurus RT untuk ditindaklanjuti.</p>}
            </div>

    </AppSheet>
  );
}
