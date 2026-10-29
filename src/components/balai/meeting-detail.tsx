"use client";

import * as React from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import {
  CalendarPlus, CheckCircle2, CircleCheck, ClipboardList, MapPin, Pencil, Play, Plus, QrCode, Search, Share2, Square, SquareCheck, Users, Video, X, XCircle,
} from "lucide-react";
import type { Attendee, Decision, MeetingWithStats, PollWithResult } from "@/lib/balai/types";
import { MEETING_STATUS_META, fmtDate, fmtDateTime } from "@/lib/balai/types";
import { balaiApi, balaiGet } from "@/lib/balai/client";
import { inputClass, primaryBtn, ghostBtn, waLink } from "@/components/keamanan/ui";
import { Sheet } from "@/components/pasar/sheet";
import { PollCard } from "./poll-card";
import { MeetingForm, PollForm } from "./forms";

const TZ = "Asia/Jakarta";
const gcalDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

function calendarLink(m: MeetingWithStats) {
  const end = m.endAt ?? new Date(new Date(m.startAt).getTime() + 2 * 3_600_000).toISOString();
  const p = new URLSearchParams({ action: "TEMPLATE", text: m.title, dates: `${gcalDate(m.startAt)}/${gcalDate(end)}`, details: `${m.description}\n\nAgenda:\n${m.agenda.map((a, i) => `${i + 1}. ${a.title}`).join("\n")}`, location: m.location });
  return `https://calendar.google.com/calendar/render?${p}`;
}

function minutesText(m: MeetingWithStats, minutes: string, decisions: Decision[]) {
  return [
    `*NOTULEN ${m.title.toUpperCase()}*`,
    `${fmtDateTime(m.startAt)} WIB · ${m.location}`,
    `Hadir: ${m.stats.checkedIn} warga (${m.stats.houses}/${m.stats.totalHouses} rumah)`,
    "",
    minutes,
    "",
    decisions.length ? "*Keputusan:*" : "",
    ...decisions.map((d, i) => `${i + 1}. ${d.text}${d.pic ? ` — PIC: ${d.pic}` : ""}${d.dueDate ? ` (s/d ${fmtDate(d.dueDate)})` : ""}`),
  ].filter((l, i, a) => l || a[i - 1]).join("\n");
}

export function MeetingDetail({
  meeting: m,
  userId,
  isPengurus,
  checkinCode,
  onChanged,
}: {
  meeting: MeetingWithStats;
  userId: string;
  isPengurus: boolean;
  checkinCode?: string | null;
  onChanged: () => void;
}) {
  const st = MEETING_STATUS_META[m.status];
  const closed = m.status === "SELESAI" || m.status === "DIBATALKAN";
  const [busy, setBusy] = React.useState(false);
  const [qrOpen, setQrOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [pollOpen, setPollOpen] = React.useState(false);
  const [attOpen, setAttOpen] = React.useState(false);
  const [minutes, setMinutes] = React.useState(m.minutes ?? "");
  const [decisions, setDecisions] = React.useState<Decision[]>(m.decisions);
  const [polls, setPolls] = React.useState<PollWithResult[]>(m.polls);
  const autoChecked = React.useRef(false);

  React.useEffect(() => setPolls(m.polls), [m.polls]);
  React.useEffect(() => {
    setMinutes(m.minutes ?? "");
    setDecisions(m.decisions);
  }, [m.id, m.minutes, m.decisions]);

  const act = async (op: string, extra: Record<string, unknown> = {}, ok?: string) => {
    setBusy(true);
    try {
      await balaiApi("MEETING", userId, { meetingId: m.id, op, ...extra });
      if (ok) toast.success(ok);
      onChanged();
      return true;
    } catch (e: any) {
      toast.error(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  // opened from the check-in QR: absen automatically
  React.useEffect(() => {
    if (!checkinCode || autoChecked.current || m.myRsvp?.checkedInAt) return;
    autoChecked.current = true;
    act("CHECKIN", { code: checkinCode }, "✅ Absen berhasil. Terima kasih sudah hadir!");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkinCode]);

  const rsvp = m.myRsvp?.rsvp;
  const d = new Date(m.startAt);

  return (
    <div className="p-4 space-y-4">
      <div className="rounded-3xl bg-gradient-to-br from-sky-600 via-sky-700 to-emerald-700 text-white p-4 relative overflow-hidden">
        <span className="absolute -right-4 -bottom-8 text-[110px] opacity-10 select-none" aria-hidden>🏛️</span>
        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20`}>{st.label}</span>
        <h2 className="text-lg font-black mt-1.5 leading-snug">{m.title}</h2>
        <p className="text-xs opacity-90 mt-1">{d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TZ })} · {d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: TZ })}{m.endAt ? `–${new Date(m.endAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: TZ })}` : ""} WIB</p>
        <p className="text-xs opacity-90 flex items-center gap-1 mt-0.5"><MapPin className="w-3.5 h-3.5" /> {m.location}</p>
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <div className="rounded-xl bg-white/15 py-1.5"><p className="text-lg font-black">{m.stats.hadir}</p><p className="text-[9px] font-bold opacity-90">Akan hadir</p></div>
          <div className="rounded-xl bg-white/15 py-1.5"><p className="text-lg font-black">{m.stats.checkedIn}</p><p className="text-[9px] font-bold opacity-90">Sudah absen</p></div>
          <div className="rounded-xl bg-white/15 py-1.5"><p className="text-lg font-black">{m.stats.houses}<span className="text-xs opacity-80">/{m.stats.totalHouses}</span></p><p className="text-[9px] font-bold opacity-90">Rumah terwakili</p></div>
        </div>
      </div>

      {m.status === "DIBATALKAN" && <p className="rounded-xl bg-red-500/10 text-red-600 text-xs font-bold p-3">Dibatalkan{m.cancelReason ? `: ${m.cancelReason}` : "."}</p>}

      {!closed && (
        <div className="space-y-2">
          {m.myRsvp?.checkedInAt ? (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Anda sudah absen pukul {new Date(m.myRsvp.checkedInAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: TZ })}
            </div>
          ) : (
            <>
              <p className="text-[11px] font-bold text-slate-500">Konfirmasi kehadiran</p>
              <div className="grid grid-cols-3 gap-2">
                {([["HADIR", "✅ Hadir"], ["MUNGKIN", "🤔 Mungkin"], ["TIDAK", "🙏 Berhalangan"]] as const).map(([v, label]) => (
                  <button key={v} disabled={busy} onClick={() => act("RSVP", { rsvp: v }, v === "HADIR" ? "Sampai jumpa di musyawarah!" : "Konfirmasi tersimpan.")} className={`min-h-[44px] rounded-xl border text-xs font-bold transition-all ${rsvp === v ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-neutral-200 dark:border-neutral-700"}`}>{label}</button>
                ))}
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-2">
            <a href={calendarLink(m)} target="_blank" rel="noopener noreferrer" className={`${ghostBtn} flex items-center justify-center gap-1.5`}><CalendarPlus className="w-4 h-4" /> Simpan ke kalender</a>
            {m.onlineUrl ? (
              <a href={m.onlineUrl} target="_blank" rel="noopener noreferrer" className={`${ghostBtn} flex items-center justify-center gap-1.5`}><Video className="w-4 h-4" /> Ikut online</a>
            ) : (
              <a href={`https://www.google.com/maps/search/${encodeURIComponent(m.location)}`} target="_blank" rel="noopener noreferrer" className={`${ghostBtn} flex items-center justify-center gap-1.5`}><MapPin className="w-4 h-4" /> Lokasi</a>
            )}
          </div>
        </div>
      )}

      {m.description && <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{m.description}</p>}

      {m.agenda.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-black flex items-center gap-1.5"><ClipboardList className="w-4 h-4 text-sky-600" /> Agenda</h3>
          <ol className="space-y-1.5">
            {m.agenda.map((a, i) => (
              <li key={a.id} className="flex gap-2.5 items-start">
                <span className="w-6 h-6 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300 text-[11px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                <span className="text-sm pt-0.5">{a.title}{a.presenter && <span className="text-slate-500 text-xs"> · {a.presenter}</span>}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {(polls.length > 0 || (isPengurus && !closed)) && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black">🗳️ Voting musyawarah</h3>
            {isPengurus && !closed && <button onClick={() => setPollOpen(true)} className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Buat voting</button>}
          </div>
          {polls.map((p) => <PollCard key={p.id} poll={p} userId={userId} isPengurus={isPengurus} onChange={(np) => setPolls((l) => l.map((x) => (x.id === np.id ? np : x)))} />)}
          {!polls.length && <p className="text-[11px] text-slate-500">Buat voting cepat saat musyawarah berlangsung, hasil tampil langsung di HP warga.</p>}
        </section>
      )}

      {/* notulen & keputusan */}
      {(m.status === "SELESAI" || (isPengurus && m.status !== "DIBATALKAN")) && (
        <section className="space-y-2">
          <h3 className="text-xs font-black">📝 Notulen & keputusan</h3>
          {isPengurus && m.status !== "SELESAI" ? (
            <>
              <textarea value={minutes} onChange={(e) => setMinutes(e.target.value)} rows={6} className={inputClass} placeholder="Catat jalannya musyawarah, usulan warga, dan pembahasan tiap agenda..." />
              <DecisionEditor decisions={decisions} onChange={setDecisions} />
              <div className="grid grid-cols-2 gap-2">
                <button disabled={busy} onClick={() => act("SAVE_MINUTES", { minutes, decisions }, "Draf notulen tersimpan.")} className={ghostBtn}>Simpan draf</button>
                <button disabled={busy} onClick={() => confirm("Selesaikan musyawarah dan kirim notulen ke semua warga?") && act("FINISH", { minutes, decisions }, "Musyawarah selesai, notulen dikirim.")} className={primaryBtn}>Selesai & kirim notulen</button>
              </div>
            </>
          ) : (
            <>
              {m.minutes ? <p className="text-sm whitespace-pre-line rounded-2xl bg-neutral-50 dark:bg-[#0B130E] border border-neutral-200 dark:border-neutral-800 p-3">{m.minutes}</p> : <p className="text-xs text-slate-500">Belum ada notulen.</p>}
              {m.decisions.length > 0 && (
                <div className="space-y-1.5">
                  {m.decisions.map((dcs) => (
                    <button key={dcs.id} disabled={!isPengurus || busy} onClick={() => act("TOGGLE_DECISION", { decisionId: dcs.id })} className="w-full text-left flex items-start gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 p-2.5 disabled:cursor-default">
                      {dcs.done ? <SquareCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />}
                      <span className="min-w-0">
                        <span className={`text-xs font-bold block ${dcs.done ? "line-through text-slate-400" : ""}`}>{dcs.text}</span>
                        {(dcs.pic || dcs.dueDate) && <span className="text-[10px] text-slate-500">{dcs.pic ? `PIC: ${dcs.pic}` : ""}{dcs.pic && dcs.dueDate ? " · " : ""}{dcs.dueDate ? `target ${fmtDate(dcs.dueDate)}` : ""}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {m.status === "SELESAI" && (
                <a href={waLink(minutesText(m, m.minutes ?? "", m.decisions))} target="_blank" rel="noopener noreferrer" className={`${ghostBtn} flex items-center justify-center gap-1.5`}><Share2 className="w-4 h-4" /> Bagikan notulen ke grup WA</a>
              )}
            </>
          )}
        </section>
      )}

      {isPengurus && !closed && (
        <section className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 p-3 space-y-2">
          <p className="text-[11px] font-black text-slate-500">PANEL PENGURUS</p>
          <div className="grid grid-cols-2 gap-2">
            {m.status === "TERJADWAL" && <button disabled={busy} onClick={() => act("START", {}, "Musyawarah dimulai. Warga diberi notifikasi.")} className={`${primaryBtn} flex items-center justify-center gap-1.5`}><Play className="w-4 h-4" /> Mulai</button>}
            <button onClick={() => setQrOpen(true)} className={`${ghostBtn} flex items-center justify-center gap-1.5`}><QrCode className="w-4 h-4" /> QR absen</button>
            <button onClick={() => setAttOpen(true)} className={`${ghostBtn} flex items-center justify-center gap-1.5`}><Users className="w-4 h-4" /> Daftar hadir</button>
            <button onClick={() => setEditOpen(true)} className={`${ghostBtn} flex items-center justify-center gap-1.5`}><Pencil className="w-4 h-4" /> Ubah</button>
            <button disabled={busy} onClick={() => { const reason = prompt("Alasan pembatalan (dikirim ke warga):"); if (reason !== null) act("CANCEL", { reason }, "Musyawarah dibatalkan."); }} className="min-h-[40px] rounded-xl border border-red-500/30 text-red-600 text-xs font-bold flex items-center justify-center gap-1.5"><XCircle className="w-4 h-4" /> Batalkan</button>
          </div>
        </section>
      )}
      {isPengurus && m.status === "SELESAI" && <button onClick={() => setAttOpen(true)} className={`${ghostBtn} w-full flex items-center justify-center gap-1.5`}><Users className="w-4 h-4" /> Lihat daftar hadir</button>}

      <Sheet open={qrOpen} onClose={() => setQrOpen(false)} title="QR absen musyawarah">
        {qrOpen && <CheckinQr meetingId={m.id} userId={userId} title={m.title} />}
      </Sheet>
      <Sheet open={attOpen} onClose={() => setAttOpen(false)} title={`Daftar hadir · ${m.title}`}>
        {attOpen && <AttendanceManager meeting={m} userId={userId} readOnly={m.status === "SELESAI"} onChanged={onChanged} />}
      </Sheet>
      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Ubah musyawarah">
        {editOpen && <MeetingForm userId={userId} meeting={m} onDone={() => { setEditOpen(false); onChanged(); }} />}
      </Sheet>
      <Sheet open={pollOpen} onClose={() => setPollOpen(false)} title="Voting musyawarah">
        {pollOpen && <PollForm userId={userId} meetingId={m.id} onDone={() => { setPollOpen(false); onChanged(); }} />}
      </Sheet>
    </div>
  );
}

function DecisionEditor({ decisions, onChange }: { decisions: Decision[]; onChange: (d: Decision[]) => void }) {
  const upd = (i: number, patch: Partial<Decision>) => onChange(decisions.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  return (
    <div className="space-y-2">
      {decisions.map((d, i) => (
        <div key={d.id} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-2 space-y-1.5">
          <div className="flex gap-2">
            <input value={d.text} onChange={(e) => upd(i, { text: e.target.value })} className={inputClass} placeholder={`Keputusan ${i + 1}`} />
            <button type="button" onClick={() => onChange(decisions.filter((_, j) => j !== i))} className="px-2 text-slate-400" aria-label="Hapus"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={d.pic ?? ""} onChange={(e) => upd(i, { pic: e.target.value })} className={inputClass} placeholder="PIC (penanggung jawab)" />
            <input type="date" value={d.dueDate ?? ""} onChange={(e) => upd(i, { dueDate: e.target.value || null })} className={inputClass} />
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...decisions, { id: `d${Date.now().toString(36)}`, text: "", done: false }])} className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Tambah keputusan</button>
    </div>
  );
}

function CheckinQr({ meetingId, userId, title }: { meetingId: string; userId: string; title: string }) {
  const [src, setSrc] = React.useState<string | null>(null);
  const [url, setUrl] = React.useState("");
  React.useEffect(() => {
    balaiGet<{ checkinCode: string }>(userId, { view: "attendees", meetingId }).then(async (r) => {
      const link = `${window.location.origin}/balai?tab=musyawarah&meeting=${meetingId}&checkin=${r.checkinCode}`;
      setUrl(link);
      setSrc(await QRCode.toDataURL(link, { width: 560, margin: 1, errorCorrectionLevel: "M" }));
    }).catch((e) => toast.error(e.message));
  }, [meetingId, userId]);
  return (
    <div className="p-5 text-center space-y-3">
      <p className="text-sm font-extrabold">{title}</p>
      <div className="mx-auto w-full max-w-[300px] aspect-square rounded-3xl bg-white p-3 shadow-inner">
        {src ? <img src={src} alt="QR absen" className="w-full h-full" /> : <div className="w-full h-full animate-pulse bg-neutral-100 rounded-2xl" />}
      </div>
      <p className="text-xs text-slate-500">Warga scan QR ini dengan kamera HP → langsung tercatat hadir (harus sudah login WargaIn).</p>
      {url && <button onClick={() => navigator.clipboard?.writeText(url).then(() => toast.success("Link absen disalin."))} className={`${ghostBtn} w-full`}>Salin link absen</button>}
    </div>
  );
}

function AttendanceManager({ meeting, userId, readOnly, onChanged }: { meeting: MeetingWithStats; userId: string; readOnly: boolean; onChanged: () => void }) {
  const [att, setAtt] = React.useState<Attendee[]>([]);
  const [roster, setRoster] = React.useState<{ id: string; name: string; houseBlock: string | null }[]>([]);
  const [q, setQ] = React.useState("");
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const load = React.useCallback(() => {
    balaiGet<{ attendees: Attendee[]; roster: typeof roster }>(userId, { view: "attendees", meetingId: meeting.id }).then((r) => {
      setAtt(r.attendees);
      setRoster(r.roster);
    });
  }, [userId, meeting.id]);
  React.useEffect(load, [load]);
  const byUser = new Map(att.map((a) => [a.userId, a]));
  const needle = q.trim().toLowerCase();
  const list = roster
    .filter((r) => !needle || r.name.toLowerCase().includes(needle) || (r.houseBlock ?? "").toLowerCase().includes(needle))
    .sort((a, b) => Number(!!byUser.get(b.id)?.checkedInAt) - Number(!!byUser.get(a.id)?.checkedInAt));

  const toggle = async (id: string, undo: boolean) => {
    setBusyId(id);
    try {
      await balaiApi("MEETING", userId, { meetingId: meeting.id, op: "CHECKIN_USER", targetUserId: id, undo });
      load();
      onChanged();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const present = att.filter((a) => a.checkedInAt).length;
  return (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-emerald-500/10 py-2"><p className="text-lg font-black text-emerald-700">{present}</p><p className="text-[10px] font-bold text-slate-500">Hadir</p></div>
        <div className="rounded-xl bg-sky-500/10 py-2"><p className="text-lg font-black text-sky-700">{att.filter((a) => a.rsvp === "HADIR" && !a.checkedInAt).length}</p><p className="text-[10px] font-bold text-slate-500">Konfirmasi, belum absen</p></div>
        <div className="rounded-xl bg-slate-500/10 py-2"><p className="text-lg font-black">{att.filter((a) => a.rsvp === "TIDAK").length}</p><p className="text-[10px] font-bold text-slate-500">Berhalangan</p></div>
      </div>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} className={`${inputClass} pl-9`} placeholder="Cari nama atau blok..." />
      </div>
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {list.map((r) => {
          const a = byUser.get(r.id);
          const here = !!a?.checkedInAt;
          return (
            <div key={r.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">{r.name}</p>
                <p className="text-[10px] text-slate-500">{r.houseBlock ?? "-"}{a && !here ? ` · ${a.rsvp === "HADIR" ? "akan hadir" : a.rsvp === "MUNGKIN" ? "mungkin" : "berhalangan"}` : ""}{here ? ` · absen ${new Date(a!.checkedInAt!).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: TZ })}` : ""}</p>
              </div>
              {readOnly ? (
                here && <CircleCheck className="w-5 h-5 text-emerald-600" />
              ) : (
                <button disabled={busyId === r.id} onClick={() => toggle(r.id, here)} className={`min-h-[36px] px-3 rounded-xl text-[11px] font-bold shrink-0 ${here ? "bg-emerald-600 text-white" : "border border-neutral-200 dark:border-neutral-700"}`}>
                  {here ? "✓ Hadir" : "Tandai hadir"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
