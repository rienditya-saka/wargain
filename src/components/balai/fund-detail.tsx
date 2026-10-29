"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Copy, HandHeart, X } from "lucide-react";
import type { Donation, FundraiserWithStats } from "@/lib/balai/types";
import { FUND_META, fmtDate, fmtDateTime, rupiah } from "@/lib/balai/types";
import { balaiApi, balaiGet } from "@/lib/balai/client";
import { Field, PhotoInput, Segmented, inputClass, ghostBtn } from "@/components/keamanan/ui";

const QUICK = [20000, 50000, 100000, 250000];
const DON_TONE = { MENUNGGU: "bg-amber-500/10 text-amber-700", DITERIMA: "bg-emerald-500/10 text-emerald-700", DITOLAK: "bg-red-500/10 text-red-600" } as const;

export function FundProgress({ f, big = false }: { f: FundraiserWithStats; big?: boolean }) {
  const pct = f.targetAmount ? Math.min(100, Math.round((f.collected / f.targetAmount) * 100)) : 0;
  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <p className={`${big ? "text-2xl" : "text-base"} font-black text-rose-600`}>{rupiah(f.collected)}</p>
        {f.targetAmount > 0 && <p className="text-[11px] font-bold text-slate-500">{pct}% dari {rupiah(f.targetAmount)}</p>}
      </div>
      {f.targetAmount > 0 && (
        <div className={`${big ? "h-3" : "h-2"} rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden mt-1`}>
          <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400" style={{ width: `${pct}%` }} />
        </div>
      )}
      <p className="text-[10px] text-slate-500 mt-1">{f.donors} donatur{f.deadline ? ` · s/d ${fmtDate(f.deadline)}` : ""}{f.status === "SELESAI" ? " · ditutup" : ""}</p>
    </div>
  );
}

export function FundDetail({ fund: f, userId, isPengurus, onChanged }: { fund: FundraiserWithStats; userId: string; isPengurus: boolean; onChanged: () => void }) {
  const meta = FUND_META[f.category];
  const [amount, setAmount] = React.useState("50000");
  const [method, setMethod] = React.useState<"TRANSFER" | "TUNAI">("TRANSFER");
  const [proofUrl, setProofUrl] = React.useState<string>();
  const [message, setMessage] = React.useState("");
  const [anonymous, setAnonymous] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [donations, setDonations] = React.useState<Donation[] | null>(null);

  const loadDonations = React.useCallback(() => {
    if (!isPengurus) return;
    balaiGet<{ donations: Donation[] }>(userId, { view: "donations", fundraiserId: f.id }).then((r) => setDonations(r.donations)).catch(() => {});
  }, [isPengurus, userId, f.id]);
  React.useEffect(loadDonations, [loadDonations, f.pending, f.collected]);

  const donate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await balaiApi("FUND", userId, { op: "DONATE", fundraiserId: f.id, amount: Number(amount), method, proofUrl, message, anonymous });
      toast.success(method === "TUNAI" ? "Tercatat! Serahkan tunai ke bendahara RT untuk diverifikasi." : "Terima kasih! Donasi menunggu verifikasi bendahara.");
      setProofUrl(undefined);
      setMessage("");
      onChanged();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (d: Donation, op: "VERIFY" | "REJECT") => {
    const note = op === "REJECT" ? prompt("Alasan penolakan (dikirim ke donatur):") : "";
    if (note === null) return;
    try {
      await balaiApi("FUND", userId, { op, donationId: d.id, note });
      toast.success(op === "VERIFY" ? "Donasi diterima & tercatat di Kas RT." : "Donasi ditolak.");
      loadDonations();
      onChanged();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const close = async () => {
    if (!confirm("Tutup penggalangan dana ini?")) return;
    try {
      await balaiApi("FUND", userId, { op: "CLOSE", fundraiserId: f.id });
      toast.success("Penggalangan ditutup.");
      onChanged();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="pb-4">
      {f.coverUrl ? <img src={f.coverUrl} alt="" className="w-full max-h-64 object-cover" /> : <div className="h-24 bg-gradient-to-br from-rose-500 to-amber-400 flex items-center justify-center text-5xl">{meta.emoji}</div>}
      <div className="p-4 space-y-4">
        <div>
          <p className="text-[10px] font-black tracking-widest text-rose-600">{meta.emoji} {meta.label.toUpperCase()}</p>
          <h2 className="text-lg font-black leading-snug">{f.title}</h2>
          {f.beneficiary && <p className="text-xs text-slate-500">Untuk: {f.beneficiary}</p>}
        </div>
        <FundProgress f={f} big />
        {f.story && <p className="text-sm whitespace-pre-line text-slate-700 dark:text-slate-300">{f.story}</p>}

        {f.paymentInfo && (
          <div className="rounded-2xl bg-neutral-50 dark:bg-[#0B130E] border border-neutral-200 dark:border-neutral-800 p-3 flex items-start justify-between gap-2">
            <div className="min-w-0"><p className="text-[10px] font-black text-slate-500">REKENING / QRIS</p><p className="text-xs font-bold whitespace-pre-line">{f.paymentInfo}</p></div>
            <button onClick={() => navigator.clipboard?.writeText(f.paymentInfo!).then(() => toast.success("Disalin."))} className="w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shrink-0" aria-label="Salin"><Copy className="w-4 h-4" /></button>
          </div>
        )}

        {f.status === "AKTIF" && (
          <form onSubmit={donate} className="rounded-2xl border border-rose-500/30 p-3 space-y-3">
            <p className="text-xs font-black flex items-center gap-1.5"><HandHeart className="w-4 h-4 text-rose-600" /> Donasi saya</p>
            <div className="grid grid-cols-4 gap-1.5">
              {QUICK.map((q) => <button key={q} type="button" onClick={() => setAmount(String(q))} className={`min-h-[38px] rounded-xl border text-[11px] font-black ${Number(amount) === q ? "border-rose-500 bg-rose-500/10 text-rose-700" : "border-neutral-200 dark:border-neutral-700"}`}>{q / 1000}rb</button>)}
            </div>
            <Field label="Nominal (Rp)"><input type="number" inputMode="numeric" min={1000} value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} required /></Field>
            <Segmented value={method} onChange={setMethod} options={[{ value: "TRANSFER", label: "Transfer / QRIS" }, { value: "TUNAI", label: "Tunai ke bendahara" }]} />
            {method === "TRANSFER" && <PhotoInput value={proofUrl} onChange={setProofUrl} label="Bukti" />}
            <Field label="Doa / pesan (opsional)"><input value={message} onChange={(e) => setMessage(e.target.value)} className={inputClass} maxLength={300} /></Field>
            <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="w-4 h-4 accent-rose-600" /> Tampilkan sebagai &quot;Hamba Allah&quot;</label>
            <button disabled={busy} className="w-full min-h-[46px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-black disabled:opacity-50">{busy ? "Mengirim..." : `Donasi ${rupiah(Number(amount) || 0)}`}</button>
          </form>
        )}

        {f.myDonations.length > 0 && (
          <section className="space-y-1.5">
            <h3 className="text-xs font-black">Riwayat donasi saya</h3>
            {f.myDonations.map((d) => (
              <div key={d.id} className="flex items-center justify-between text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-2">
                <span>{rupiah(d.amount)} · {d.method === "TUNAI" ? "tunai" : "transfer"} · {fmtDateTime(d.createdAt)}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${DON_TONE[d.status]}`}>{d.status === "MENUNGGU" ? "Diverifikasi" : d.status === "DITERIMA" ? "Diterima" : "Ditolak"}</span>
              </div>
            ))}
          </section>
        )}

        {f.recent.length > 0 && (
          <section className="space-y-1.5">
            <h3 className="text-xs font-black">🤲 Donatur terbaru</h3>
            {f.recent.map((d, i) => (
              <div key={i} className="flex items-start gap-2.5 py-1">
                <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center text-xs font-black shrink-0">{d.name.charAt(0)}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold">{d.name} <span className="text-rose-600">· {rupiah(d.amount)}</span></p>
                  {d.message && <p className="text-[11px] text-slate-500 italic">&ldquo;{d.message}&rdquo;</p>}
                </div>
              </div>
            ))}
          </section>
        )}

        {isPengurus && (
          <section className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 p-3 space-y-2">
            <p className="text-[11px] font-black text-slate-500">VERIFIKASI BENDAHARA {f.pending ? `· ${f.pending} menunggu` : ""}</p>
            {(donations ?? []).filter((d) => d.status === "MENUNGGU").map((d) => (
              <div key={d.id} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5 flex gap-2.5">
                {d.proofUrl ? <a href={d.proofUrl} target="_blank" rel="noopener noreferrer"><img src={d.proofUrl} alt="Bukti" className="w-14 h-14 rounded-lg object-cover" /></a> : <div className="w-14 h-14 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-slate-500">TUNAI</div>}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold">{d.donorName} · {rupiah(d.amount)}</p>
                  <p className="text-[10px] text-slate-500">{fmtDateTime(d.createdAt)}{d.anonymous ? " · anonim" : ""}</p>
                  <div className="flex gap-1.5 mt-1.5">
                    <button onClick={() => verify(d, "VERIFY")} className="flex-1 min-h-[34px] rounded-lg bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center gap-1"><Check className="w-3.5 h-3.5" /> Terima</button>
                    <button onClick={() => verify(d, "REJECT")} className="min-h-[34px] px-3 rounded-lg border border-red-500/30 text-red-600 text-[11px] font-bold flex items-center gap-1"><X className="w-3.5 h-3.5" /> Tolak</button>
                  </div>
                </div>
              </div>
            ))}
            {donations && !donations.some((d) => d.status === "MENUNGGU") && <p className="text-[11px] text-slate-500">Tidak ada donasi yang menunggu verifikasi. Donasi yang diterima otomatis tercatat sebagai pemasukan Kas RT (kategori Sosial).</p>}
            {f.status === "AKTIF" && <button onClick={close} className={`${ghostBtn} w-full`}>Tutup penggalangan</button>}
          </section>
        )}
      </div>
    </div>
  );
}

