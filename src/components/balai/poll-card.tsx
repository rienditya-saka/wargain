"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Check, Clock, EyeOff, Home, Lock, Users, Vote } from "lucide-react";
import type { PollWithResult } from "@/lib/balai/types";
import { fmtDateTime, timeLeft } from "@/lib/balai/types";
import { balaiApi } from "@/lib/balai/client";

// Vote UI + live result bars. Results stay hidden until you vote (or the poll closes), so early votes don't sway others.
export function PollCard({
  poll,
  userId,
  isPengurus,
  onChange,
  compact = false,
}: {
  poll: PollWithResult;
  userId?: string;
  isPengurus?: boolean;
  onChange?: (p: PollWithResult) => void;
  compact?: boolean;
}) {
  const r = poll.result;
  const closed = poll.status === "DITUTUP" || new Date(poll.closesAt).getTime() <= Date.now();
  const [picked, setPicked] = React.useState<string[]>(r.myChoice ?? []);
  const [editing, setEditing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [showVoters, setShowVoters] = React.useState(false);
  React.useEffect(() => setPicked(r.myChoice ?? []), [r.myChoice]);

  const showResults = closed || (!!r.myChoice && !editing);
  const max = Math.max(1, ...Object.values(r.counts));
  const totalVotes = Object.values(r.counts).reduce((a, b) => a + b, 0);
  const participation = r.eligible ? Math.round((r.totalVoters / r.eligible) * 100) : 0;

  const toggle = (id: string) => {
    if (poll.maxChoices === 1) return setPicked([id]);
    setPicked((l) => (l.includes(id) ? l.filter((x) => x !== id) : l.length >= poll.maxChoices ? l : [...l, id]));
  };

  const submit = async () => {
    if (!userId) return toast.error("Silakan login untuk memberi suara.");
    setBusy(true);
    try {
      const res = await balaiApi<{ poll: PollWithResult }>("POLL_VOTE", userId, { pollId: poll.id, optionIds: picked });
      toast.success(r.myChoice ? "Pilihan diperbarui." : "Suara Anda tercatat. Terima kasih!");
      setEditing(false);
      onChange?.({ ...res.poll, creatorName: poll.creatorName });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    if (!confirm("Tutup polling sekarang dan umumkan hasilnya?")) return;
    setBusy(true);
    try {
      const res = await balaiApi<{ poll: PollWithResult }>("POLL_CLOSE", userId, { pollId: poll.id });
      toast.success("Polling ditutup, hasil diumumkan.");
      onChange?.(res.poll);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const winner = closed && totalVotes ? poll.options.reduce((a, b) => ((r.counts[b.id] ?? 0) > (r.counts[a.id] ?? 0) ? b : a)) : null;

  return (
    <div className={compact ? "space-y-3" : "rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] p-4 space-y-3"}>
      {!compact && (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-extrabold text-sm leading-snug">{poll.title}</h3>
            {poll.creatorName && <p className="text-[10px] text-slate-500 mt-0.5">oleh {poll.creatorName}</p>}
          </div>
          <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${closed ? "bg-slate-500/10 text-slate-500" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}>
            {closed ? <Lock className="w-3 h-3" /> : <Clock className="w-3 h-3" />} {closed ? "Selesai" : timeLeft(poll.closesAt)}
          </span>
        </div>
      )}
      {poll.description && !compact && <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line">{poll.description}</p>}

      <div className="flex flex-wrap gap-1.5 text-[10px] font-bold text-slate-500">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800">{poll.voteScope === "HOUSE" ? <Home className="w-3 h-3" /> : <Users className="w-3 h-3" />} {poll.voteScope === "HOUSE" ? "1 rumah 1 suara" : "1 akun 1 suara"}</span>
        {poll.anonymous && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800"><EyeOff className="w-3 h-3" /> Anonim</span>}
        {poll.maxChoices > 1 && <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800">Pilih s/d {poll.maxChoices}</span>}
        {poll.audience === "PENGURUS" && <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700">Khusus pengurus</span>}
      </div>

      <div className="space-y-2">
        {poll.options.map((o) => {
          const count = r.counts[o.id] ?? 0;
          const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
          const mine = (r.myChoice ?? []).includes(o.id);
          const sel = picked.includes(o.id);
          if (showResults) {
            return (
              <div key={o.id} className={`relative overflow-hidden rounded-xl border ${winner?.id === o.id ? "border-emerald-500/60" : "border-neutral-200 dark:border-neutral-800"}`}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${(count / max) * 100}%` }} transition={{ duration: 0.6, ease: "easeOut" }} className={`absolute inset-y-0 left-0 ${winner?.id === o.id ? "bg-emerald-500/25" : mine ? "bg-emerald-500/15" : "bg-neutral-200/60 dark:bg-neutral-800/70"}`} />
                <div className="relative flex items-center justify-between gap-2 px-3 py-2.5 min-h-[44px]">
                  <span className="text-xs font-bold flex items-center gap-1.5 min-w-0">
                    {mine && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    {winner?.id === o.id && "🏆 "}
                    <span className="truncate">{o.label}</span>
                  </span>
                  <span className="text-xs font-black tabular-nums shrink-0">{pct}% <span className="text-[10px] font-bold text-slate-500">({count})</span></span>
                </div>
              </div>
            );
          }
          return (
            <button key={o.id} type="button" onClick={() => toggle(o.id)} disabled={closed || busy} className={`w-full min-h-[46px] px-3 rounded-xl border text-left text-xs font-bold flex items-center gap-2.5 transition-all active:scale-[0.99] ${sel ? "border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" : "border-neutral-200 dark:border-neutral-800 hover:border-emerald-400"}`}>
              <span className={`w-5 h-5 ${poll.maxChoices === 1 ? "rounded-full" : "rounded-md"} border-2 flex items-center justify-center shrink-0 ${sel ? "border-emerald-600 bg-emerald-600 text-white" : "border-neutral-300 dark:border-neutral-600"}`}>{sel && <Check className="w-3 h-3" />}</span>
              {o.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[10px] text-slate-500">
          <b className="text-slate-700 dark:text-slate-300">{r.totalVoters}</b> dari {r.eligible} {poll.voteScope === "HOUSE" ? "rumah" : "warga"} memilih ({participation}%)
          {!closed && ` · tutup ${fmtDateTime(poll.closesAt)}`}
        </p>
        {r.votedBy && <p className="text-[10px] font-bold text-sky-600">Rumah Anda sudah memilih lewat {r.votedBy}</p>}
      </div>

      {!closed && (
        <div className="flex gap-2">
          {showResults ? (
            <button onClick={() => setEditing(true)} className="flex-1 min-h-[42px] rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold">Ubah pilihan</button>
          ) : (
            <button onClick={submit} disabled={!picked.length || busy} className="flex-1 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-black flex items-center justify-center gap-1.5">
              <Vote className="w-4 h-4" /> {busy ? "Mengirim..." : r.myChoice ? "Simpan pilihan baru" : "Kirim suara"}
            </button>
          )}
          {editing && <button onClick={() => { setEditing(false); setPicked(r.myChoice ?? []); }} className="min-h-[42px] px-3 rounded-xl text-xs font-bold text-slate-500">Batal</button>}
          {isPengurus && !compact && <button onClick={close} disabled={busy} className="min-h-[42px] px-3 rounded-xl border border-red-500/30 text-red-600 text-xs font-bold">Tutup</button>}
        </div>
      )}

      {!poll.anonymous && showResults && r.voters && r.voters.length > 0 && !compact && (
        <div>
          <button onClick={() => setShowVoters((v) => !v)} className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">{showVoters ? "Sembunyikan" : "Lihat"} daftar pemilih ({r.voters.length})</button>
          {showVoters && (
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1 text-[11px]">
              {r.voters.map((v, i) => (
                <div key={i} className="flex justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 py-1">
                  <span className="truncate">{v.name} {v.houseBlock && <span className="text-slate-400">· {v.houseBlock}</span>}</span>
                  <span className="text-slate-500 text-right shrink-0">{v.optionIds.map((id) => poll.options.find((o) => o.id === id)?.label).join(", ")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
