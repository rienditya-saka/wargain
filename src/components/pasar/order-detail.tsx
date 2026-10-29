"use client";

import * as React from "react";
import { toast } from "sonner";
import { Copy, Upload, MessageCircle, CheckCircle2, XCircle, Banknote, CalendarClock, MapPin, Loader2 } from "lucide-react";
import type { Order, OrderStatus } from "@/lib/pasar/types";
import { FULFILLMENT_LABEL, ORDER_STATUS_META, PAYMENT_LABEL, PAYMENT_STATUS_META, rupiah } from "@/lib/pasar/types";
import { fileToResizedDataUrl } from "@/lib/keamanan/store";
import { waLink } from "@/components/keamanan/ui";
import { Sheet, Stars } from "./sheet";

const STEPS: { status: OrderStatus[]; label: string }[] = [
  { status: ["MENUNGGU"], label: "Dipesan" },
  { status: ["DIKONFIRMASI"], label: "Dikonfirmasi" },
  { status: ["DIPROSES"], label: "Diproses" },
  { status: ["SIAP", "DIANTAR"], label: "Siap / diantar" },
  { status: ["SELESAI"], label: "Selesai" },
];

export function OrderStatusPill({ order }: { order: Order }) {
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${ORDER_STATUS_META[order.status].tone}`}>{ORDER_STATUS_META[order.status].label}</span>;
}

export function OrderDetail({
  order,
  open,
  onClose,
  role,
  onAct,
}: {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  role: "buyer" | "seller";
  onAct: (orderId: string, action: string, payload?: Record<string, unknown>) => Promise<unknown>;
}) {
  const [busy, setBusy] = React.useState<string | null>(null);
  const [rating, setRating] = React.useState(5);
  const [review, setReview] = React.useState("");
  const [reply, setReply] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);

  if (!order) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;
  const o = order;
  const shop = o.shop;
  const seller = role === "seller";
  const step = ORDER_STATUS_META[o.status].step;
  const ended = o.status === "DITOLAK" || o.status === "DIBATALKAN";
  const needsProof = !seller && ["TRANSFER", "QRIS"].includes(o.paymentMethod) && ["BELUM_BAYAR", "DITOLAK"].includes(o.paymentStatus) && !ended;

  const run = async (action: string, payload: Record<string, unknown> = {}, confirmText?: string, ok?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(action);
    try {
      await onAct(o.id, action, payload);
      if (ok) toast.success(ok);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const withReason = (action: string, label: string) => {
    const note = window.prompt(`${label} — alasan untuk ${seller ? "pembeli" : "penjual"}:`);
    if (note === null) return;
    if (!note.trim()) {
      toast.error("Alasan wajib diisi.");
      return;
    }
    run(action, { note });
  };

  const uploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const url = await fileToResizedDataUrl(f, 1280, 0.8);
    run("UPLOAD_PROOF", { proofUrl: url }, undefined, "Bukti terkirim, menunggu verifikasi penjual.");
  };

  const copy = (text: string) => navigator.clipboard?.writeText(text).then(() => toast.success("Disalin"));
  const Btn = ({ action, children, tone = "primary", onClick }: { action: string; children: React.ReactNode; tone?: "primary" | "ghost" | "danger"; onClick: () => void }) => (
    <button
      onClick={onClick}
      disabled={!!busy}
      className={`flex-1 min-h-[44px] px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50 ${
        tone === "primary" ? "bg-emerald-600 hover:bg-emerald-500 text-white" : tone === "danger" ? "border border-red-400 text-red-600" : "border border-neutral-200 dark:border-neutral-700"
      }`}
    >
      {busy === action ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  );

  const sellerActions: React.ReactNode[] = [];
  if (seller) {
    if (o.status === "MENUNGGU") {
      sellerActions.push(<Btn key="r" action="REJECT" tone="danger" onClick={() => withReason("REJECT", "Tolak pesanan")}>Tolak</Btn>);
      sellerActions.push(<Btn key="c" action="CONFIRM" onClick={() => run("CONFIRM", {}, undefined, "Pesanan dikonfirmasi.")}>{o.type === "JASA" ? "Terima booking" : "Konfirmasi"}</Btn>);
    } else if (o.status === "DIKONFIRMASI" && o.type === "PRODUK") {
      sellerActions.push(<Btn key="p" action="PROCESS" tone="ghost" onClick={() => run("PROCESS")}>Mulai proses</Btn>);
    }
    if (["DIKONFIRMASI", "DIPROSES"].includes(o.status) && o.type === "PRODUK") {
      sellerActions.push(
        o.fulfillment === "ANTAR"
          ? <Btn key="d" action="DELIVER" onClick={() => run("DELIVER", {}, undefined, "Pembeli diberi tahu pesanan diantar.")}>Antar sekarang</Btn>
          : <Btn key="s" action="READY" onClick={() => run("READY", {}, undefined, "Pembeli diberi tahu pesanan siap diambil.")}>Siap diambil</Btn>
      );
    }
    if (["DIKONFIRMASI", "DIPROSES", "SIAP", "DIANTAR"].includes(o.status)) {
      sellerActions.push(<Btn key="done" action="COMPLETE" onClick={() => run("COMPLETE", {}, o.type === "JASA" ? "Layanan sudah selesai dikerjakan?" : "Pesanan sudah diterima pembeli?", "Pesanan selesai.")}>Selesai</Btn>);
    }
    if (["DIKONFIRMASI", "DIPROSES", "SIAP"].includes(o.status)) {
      sellerActions.push(<Btn key="x" action="CANCEL" tone="danger" onClick={() => withReason("CANCEL", "Batalkan pesanan")}>Batalkan</Btn>);
    }
  }

  const buyerCanCancel = !seller && (o.status === "MENUNGGU" || (o.type === "JASA" && o.status === "DIKONFIRMASI" && o.scheduledAt && new Date(o.scheduledAt).getTime() - Date.now() > 2 * 3_600_000));
  const counterpartPhone = seller ? o.buyerPhone : shop?.phone;

  return (
    <Sheet open={open} onClose={onClose} title={<span className="flex items-center gap-2">{o.orderNumber} <OrderStatusPill order={o} /></span>}>
      <div className="p-4 space-y-4">
        {!ended ? (
          <div className="flex items-center">
            {STEPS.filter((s) => o.type === "PRODUK" || !s.status.includes("DIPROSES")).map((s, i, arr) => {
              const idx = ORDER_STATUS_META[s.status[0]].step;
              const done = step >= idx;
              return (
                <React.Fragment key={s.label}>
                  <div className="flex flex-col items-center gap-1 w-14">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black ${done ? "bg-emerald-600 text-white" : "bg-neutral-100 dark:bg-neutral-800 text-slate-400"}`}>{done ? "✓" : i + 1}</span>
                    <span className={`text-[9px] font-bold text-center leading-tight ${done ? "" : "text-slate-400"}`}>{s.label}</span>
                  </div>
                  {i < arr.length - 1 && <span className={`flex-1 h-0.5 -mt-4 ${step > idx ? "bg-emerald-600" : "bg-neutral-200 dark:bg-neutral-800"}`} />}
                </React.Fragment>
              );
            })}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-red-500/10 text-xs text-red-700 dark:text-red-300 font-semibold">
            {ORDER_STATUS_META[o.status].label}{o.cancelReason ? `: ${o.cancelReason}` : ""}
          </div>
        )}

        {o.scheduledAt && (
          <div className="p-3 rounded-xl bg-sky-500/10 text-xs flex items-center gap-2 text-sky-800 dark:text-sky-200">
            <CalendarClock className="w-4 h-4 shrink-0" />
            <span className="font-bold">
              {new Date(o.scheduledAt).toLocaleString("id-ID", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })} WIB
            </span>
          </div>
        )}

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold">{seller ? `${o.buyerName}${o.buyerBlock ? ` · ${o.buyerBlock}` : ""}` : shop?.name}</span>
            <span className="text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {FULFILLMENT_LABEL[o.fulfillment]}</span>
          </div>
          <ul className="space-y-1">
            {o.items.map((i, k) => (
              <li key={k} className="flex justify-between text-xs">
                <span>{i.qty}× {i.name}{i.variant ? ` (${i.variant})` : ""}</span>
                <span className="font-bold">{rupiah(i.subtotal)}</span>
              </li>
            ))}
            {o.deliveryFee > 0 && <li className="flex justify-between text-xs text-slate-500"><span>Ongkir</span><span>{rupiah(o.deliveryFee)}</span></li>}
          </ul>
          <div className="flex justify-between pt-1.5 border-t border-neutral-100 dark:border-neutral-800 text-sm font-black"><span>Total</span><span>{rupiah(o.total)}</span></div>
          {o.notes && <p className="text-[11px] p-2 rounded-lg bg-neutral-50 dark:bg-[#0B130E]">📝 {o.notes}</p>}
        </div>

        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold">Pembayaran · {PAYMENT_LABEL[o.paymentMethod]}</p>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${PAYMENT_STATUS_META[o.paymentStatus].tone}`}>{PAYMENT_STATUS_META[o.paymentStatus].label}</span>
          </div>
          {!seller && o.paymentMethod === "TRANSFER" && shop?.paymentMethods?.transfer && o.paymentStatus !== "LUNAS" && (
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-[#0B130E] text-xs space-y-1">
              <p className="text-slate-500">{shop.paymentMethods.transfer.bank} a.n. {shop.paymentMethods.transfer.accountName}</p>
              <button onClick={() => copy(shop.paymentMethods.transfer!.accountNo)} className="font-mono text-base font-black flex items-center gap-2">{shop.paymentMethods.transfer.accountNo} <Copy className="w-3.5 h-3.5 text-slate-400" /></button>
              <button onClick={() => copy(String(o.total))} className="text-slate-500 flex items-center gap-1">Nominal <b className="text-slate-900 dark:text-white">{rupiah(o.total)}</b> <Copy className="w-3 h-3" /></button>
            </div>
          )}
          {!seller && o.paymentMethod === "QRIS" && shop?.paymentMethods?.qris && o.paymentStatus !== "LUNAS" && (
            <div className="text-center space-y-1">
              <img src={shop.paymentMethods.qris.imageUrl} alt="QRIS" className="mx-auto w-52 h-52 object-contain rounded-xl bg-white p-2" />
              <p className="text-xs">Scan & bayar <b>{rupiah(o.total)}</b></p>
            </div>
          )}
          {o.paymentProofUrl && (
            <a href={o.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="block">
              <img src={o.paymentProofUrl} alt="Bukti bayar" className="w-full max-h-64 object-contain rounded-xl bg-neutral-100 dark:bg-neutral-900" />
            </a>
          )}
          {needsProof && (
            <>
              <button onClick={() => fileRef.current?.click()} disabled={!!busy} className="w-full min-h-[44px] rounded-xl bg-sky-600 text-white text-xs font-black flex items-center justify-center gap-1.5">
                {busy === "UPLOAD_PROOF" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} {o.paymentStatus === "DITOLAK" ? "Unggah ulang bukti bayar" : "Unggah bukti bayar"}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={uploadProof} className="hidden" />
            </>
          )}
          {seller && o.paymentStatus === "MENUNGGU_VERIFIKASI" && (
            <div className="flex gap-2">
              <Btn action="REJECT_PAYMENT" tone="danger" onClick={() => withReason("REJECT_PAYMENT", "Tolak bukti bayar")}><XCircle className="w-4 h-4" /> Tolak bukti</Btn>
              <Btn action="VERIFY_PAYMENT" onClick={() => run("VERIFY_PAYMENT", {}, `Dana ${rupiah(o.total)} sudah masuk?`, "Pembayaran terverifikasi.")}><CheckCircle2 className="w-4 h-4" /> Dana sudah masuk</Btn>
            </div>
          )}
          {seller && o.paymentStatus !== "LUNAS" && o.paymentStatus !== "MENUNGGU_VERIFIKASI" && !ended && (
            <Btn action="MARK_PAID" tone="ghost" onClick={() => run("MARK_PAID", {}, "Tandai sudah dibayar (tunai / di luar aplikasi)?", "Ditandai lunas.")}><Banknote className="w-4 h-4" /> Tandai lunas</Btn>
          )}
        </div>

        {sellerActions.length > 0 && <div className="flex flex-wrap gap-2">{sellerActions}</div>}

        {!seller && (
          <div className="flex gap-2">
            {buyerCanCancel && <Btn action="CANCEL" tone="danger" onClick={() => withReason("CANCEL", "Batalkan pesanan")}>Batalkan</Btn>}
            {["SIAP", "DIANTAR"].includes(o.status) && <Btn action="COMPLETE" onClick={() => run("COMPLETE", {}, "Pesanan sudah Anda terima?", "Terima kasih! Jangan lupa beri ulasan.")}>Pesanan diterima</Btn>}
          </div>
        )}

        {!seller && o.status === "SELESAI" && !o.rating && (
          <div className="rounded-2xl border border-amber-400/40 bg-amber-400/5 p-3 space-y-2">
            <p className="text-xs font-extrabold">Beri ulasan untuk {shop?.name}</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button key={i} onClick={() => setRating(i)} className="text-2xl" aria-label={`${i} bintang`}>{i <= rating ? "⭐" : "☆"}</button>
              ))}
            </div>
            <textarea value={review} onChange={(e) => setReview(e.target.value)} rows={2} maxLength={500} placeholder="Ceritakan pengalaman Anda..." className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0B130E] text-sm" />
            <Btn action="REVIEW" onClick={() => run("REVIEW", { rating, review }, undefined, "Terima kasih atas ulasannya!")}>Kirim ulasan</Btn>
          </div>
        )}
        {o.rating && (
          <div className="rounded-2xl bg-neutral-50 dark:bg-[#0B130E] p-3 space-y-1">
            <Stars value={o.rating} />
            {o.review && <p className="text-xs">&ldquo;{o.review}&rdquo;</p>}
            {o.sellerReply && <p className="text-[11px] text-slate-500">Balasan penjual: {o.sellerReply}</p>}
            {seller && !o.sellerReply && (
              <div className="flex gap-2 pt-1">
                <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Balas ulasan..." className="flex-1 min-h-[38px] px-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#131F17] text-xs" />
                <button onClick={() => reply.trim() && run("REPLY_REVIEW", { note: reply })} className="px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold">Balas</button>
              </div>
            )}
          </div>
        )}

        {counterpartPhone && (
          <a href={waLink(`Halo, soal pesanan ${o.orderNumber} di Pasar WargaIn.`, counterpartPhone)} target="_blank" rel="noopener noreferrer" className="w-full min-h-[42px] rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold flex items-center justify-center gap-1.5">
            <MessageCircle className="w-4 h-4 text-emerald-600" /> Chat {seller ? "pembeli" : "penjual"} via WhatsApp
          </a>
        )}

        <details className="text-[11px] text-slate-500">
          <summary className="cursor-pointer font-bold">Riwayat status</summary>
          <ul className="mt-2 space-y-1">
            {[...(o.statusHistory ?? [])].reverse().map((h, i) => (
              <li key={i}>
                {new Date(h.at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })} · {ORDER_STATUS_META[h.status as OrderStatus]?.label ?? h.status} · {h.by}{h.note ? ` — ${h.note}` : ""}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </Sheet>
  );
}
