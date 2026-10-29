"use client";

import * as React from "react";
import { toast } from "sonner";
import { CalendarRange, Pencil } from "lucide-react";
import type { InventoryItem, Loan } from "@/lib/balai/types";
import { INVENTORY_META, LOAN_STATUS_META, fmtDate, rupiah } from "@/lib/balai/types";
import { balaiApi, balaiGet } from "@/lib/balai/client";
import { Field, inputClass, primaryBtn, ghostBtn } from "@/components/keamanan/ui";
import { Stepper } from "@/components/pasar/sheet";

const todayWIB = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
const days = (a: string, b: string) => Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86_400_000) + 1;

export function ItemCard({ item, onBorrow, onEdit }: { item: InventoryItem; onBorrow: () => void; onEdit?: () => void }) {
  const meta = INVENTORY_META[item.category];
  return (
    <div className={`rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] overflow-hidden flex flex-col ${!item.isActive ? "opacity-60" : ""}`}>
      <div className="relative aspect-[4/3] bg-gradient-to-br from-emerald-500/10 to-sky-500/10 flex items-center justify-center">
        {item.photoUrl ? <img src={item.photoUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-5xl">{meta.emoji}</span>}
        {item.condition === "PERLU_PERBAIKAN" && <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black">Perlu perbaikan</span>}
        {onEdit && <button onClick={onEdit} className="absolute top-2 right-2 w-8 h-8 rounded-xl bg-black/50 text-white flex items-center justify-center" aria-label="Ubah"><Pencil className="w-3.5 h-3.5" /></button>}
      </div>
      <div className="p-3 flex-1 flex flex-col gap-1">
        <p className="text-xs font-extrabold leading-snug line-clamp-2">{item.name}</p>
        <p className="text-[10px] text-slate-500">{item.quantity} {item.unit} · maks {item.maxDays} hari</p>
        <p className="text-[11px] font-black text-emerald-600">{item.feePerDay ? `${rupiah(item.feePerDay)}/${item.unit}/hari` : "Gratis"}</p>
        <button onClick={onBorrow} disabled={!item.isActive || item.quantity === 0} className="mt-auto min-h-[38px] rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[11px] font-bold">Pinjam</button>
      </div>
    </div>
  );
}

export function BorrowForm({ item, userId, onDone }: { item: InventoryItem; userId: string; onDone: () => void }) {
  const [start, setStart] = React.useState(addDays(todayWIB(), 1));
  const [end, setEnd] = React.useState(addDays(todayWIB(), 1));
  const [qty, setQty] = React.useState(1);
  const [purpose, setPurpose] = React.useState("");
  const [available, setAvailable] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);
  const n = end >= start ? days(start, end) : 0;
  const tooLong = n > item.maxDays;

  React.useEffect(() => {
    if (end < start) return setAvailable(null);
    setAvailable(null);
    const t = setTimeout(() => {
      balaiGet<{ available: number }>(userId, { view: "availability", itemId: item.id, start, end }).then((r) => {
        setAvailable(r.available);
        setQty((q) => Math.max(1, Math.min(q, r.available || 1)));
      }).catch(() => setAvailable(null));
    }, 250);
    return () => clearTimeout(t);
  }, [start, end, item.id, userId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await balaiApi("LOAN_REQUEST", userId, { itemId: item.id, startDate: start, endDate: end, qty, purpose });
      toast.success("Pengajuan terkirim ke pengurus RT.");
      onDone();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="p-4 space-y-3">
      <div className="flex gap-3 items-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-3xl overflow-hidden shrink-0">{item.photoUrl ? <img src={item.photoUrl} alt="" className="w-full h-full object-cover" /> : INVENTORY_META[item.category].emoji}</div>
        <div className="min-w-0">
          <p className="text-sm font-extrabold">{item.name}</p>
          <p className="text-[11px] text-slate-500">{item.description || `${item.quantity} ${item.unit} milik RT`}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Mulai"><input type="date" min={todayWIB()} value={start} onChange={(e) => { setStart(e.target.value); if (end < e.target.value) setEnd(e.target.value); }} className={inputClass} required /></Field>
        <Field label="Kembali"><input type="date" min={start} max={addDays(start, item.maxDays - 1)} value={end} onChange={(e) => setEnd(e.target.value)} className={inputClass} required /></Field>
      </div>
      <div className={`rounded-xl p-3 text-xs font-bold flex items-center gap-2 ${available === 0 || tooLong ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}>
        <CalendarRange className="w-4 h-4 shrink-0" />
        {tooLong ? `Maksimal ${item.maxDays} hari.` : available == null ? "Mengecek ketersediaan..." : available === 0 ? "Sudah terpinjam penuh di tanggal ini." : `Tersedia ${available} ${item.unit} · ${n} hari`}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold">Jumlah ({item.unit})</span>
        <Stepper value={qty} onChange={setQty} max={available || 1} />
      </div>
      <Field label="Keperluan"><input value={purpose} onChange={(e) => setPurpose(e.target.value)} className={inputClass} required placeholder="mis. Syukuran aqiqah di rumah" /></Field>
      {item.feePerDay > 0 && <p className="text-xs">Biaya kas RT: <b>{rupiah(item.feePerDay * n * qty)}</b> <span className="text-slate-500">(dibayar saat pengembalian)</span></p>}
      <button disabled={busy || !available || tooLong} className={`${primaryBtn} w-full`}>{busy ? "Mengirim..." : "Ajukan pinjam"}</button>
    </form>
  );
}

export function LoanRow({ loan, userId, manage, onChanged }: { loan: Loan; userId: string; manage: boolean; onChanged: () => void }) {
  const [busy, setBusy] = React.useState(false);
  const st = LOAN_STATUS_META[loan.status];
  const today = todayWIB();
  const late = loan.status === "DIPINJAM" && loan.endDate < today;
  const act = async (op: string, extra: Record<string, unknown> = {}) => {
    setBusy(true);
    try {
      await balaiApi("LOAN", userId, { op, loanId: loan.id, ...extra });
      onChanged();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={`rounded-2xl border p-3 space-y-2 bg-white dark:bg-[#131F17] ${late ? "border-red-500/40" : "border-neutral-200/80 dark:border-neutral-800/80"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-extrabold">{loan.qty} {loan.item?.unit} {loan.item?.name}</p>
          <p className="text-[10px] text-slate-500">{fmtDate(loan.startDate)} – {fmtDate(loan.endDate)}{manage ? ` · ${loan.borrowerName}${loan.houseBlock ? ` (${loan.houseBlock})` : ""}` : ""}</p>
          <p className="text-[10px] text-slate-500 truncate">{loan.purpose}{loan.fee ? ` · ${rupiah(loan.fee)}` : ""}</p>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black ${late ? "bg-red-500/10 text-red-600" : st.tone}`}>{late ? "Terlambat" : st.label}</span>
      </div>
      {loan.decisionNote && <p className="text-[10px] text-slate-500 italic">Catatan: {loan.decisionNote}</p>}
      {manage && loan.status === "DIAJUKAN" && (
        <div className="grid grid-cols-2 gap-2">
          <button disabled={busy} onClick={() => act("APPROVE")} className={primaryBtn}>Setujui</button>
          <button disabled={busy} onClick={() => { const note = prompt("Alasan penolakan:"); if (note !== null) act("REJECT", { note }); }} className={ghostBtn}>Tolak</button>
        </div>
      )}
      {manage && loan.status === "DISETUJUI" && <button disabled={busy} onClick={() => act("HANDOVER")} className={`${primaryBtn} w-full`}>Serahkan barang</button>}
      {manage && loan.status === "DIPINJAM" && (
        <div className="grid grid-cols-2 gap-2">
          <button disabled={busy} onClick={() => act("RETURN", { condition: "BAIK" })} className={primaryBtn}>Kembali · baik{loan.fee ? ` (+${rupiah(loan.fee)})` : ""}</button>
          <button disabled={busy} onClick={() => { const note = prompt("Kerusakan apa?"); if (note !== null) act("RETURN", { condition: "PERLU_PERBAIKAN", note }); }} className={ghostBtn}>Kembali · rusak</button>
        </div>
      )}
      {!manage && ["DIAJUKAN", "DISETUJUI"].includes(loan.status) && <button disabled={busy} onClick={() => confirm("Batalkan peminjaman?") && act("CANCEL")} className="text-[11px] font-bold text-red-600">Batalkan</button>}
    </div>
  );
}
