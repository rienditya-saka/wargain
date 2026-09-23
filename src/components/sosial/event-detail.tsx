"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  X, MapPin, Clock, CalendarDays, Users, Share2, Phone, Sparkles, CheckCircle2, Search, UserPlus,
  RefreshCw, Ban, Flag, ChevronDown, Stethoscope,
} from "lucide-react";
import {
  AUDIENCE_META,
  CATEGORY_META,
  HouseholdMember,
  Measurements,
  SocialEvent,
  SocialRegistration,
  formatEventDate,
  formatEventTime,
  isEligible,
} from "@/lib/sosial/types";
import { apiJson } from "@/lib/sosial/client";
import { Segmented, inputClass, primaryBtn, ghostBtn, waLink } from "@/components/keamanan/ui";
import { IMMUNIZATION_SCHEDULE } from "@/lib/kms/immunization";
import { TONE_CLASS } from "@/lib/kms/zscore";
import type { ChildKms } from "@/lib/kms/types";

const REG_STATUS_STYLE: Record<string, string> = {
  TERDAFTAR: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  HADIR: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  TIDAK_HADIR: "bg-slate-500/10 text-slate-500",
  BATAL: "bg-red-500/10 text-red-600",
};
const SOURCE_LABEL: Record<string, string> = { MANDIRI: "Daftar sendiri", OTOMATIS: "Otomatis", PETUGAS: "Oleh petugas" };

export function EventDetail({
  event,
  open,
  onClose,
  userId,
  communityId,
  isPengurus,
  household,
  householdRegs,
  onChanged,
}: {
  event: SocialEvent | null;
  open: boolean;
  onClose: () => void;
  userId?: string;
  communityId: string;
  isPengurus: boolean;
  household: HouseholdMember[];
  householdRegs: SocialRegistration[];
  onChanged: () => void;
}) {
  const [tab, setTab] = React.useState<"INFO" | "PESERTA">("INFO");
  React.useEffect(() => {
    if (open) setTab("INFO");
  }, [open, event?.id]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && event && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed z-50 inset-x-0 bottom-0 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[720px] max-h-[92vh] md:max-h-[88vh] rounded-t-3xl md:rounded-3xl bg-white dark:bg-[#0F1A13] shadow-2xl flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label={event.title}
          >
            <Hero event={event} onClose={onClose} />
            {isPengurus && (
              <div className="px-4 pt-3">
                <Segmented
                  value={tab}
                  onChange={setTab}
                  options={[{ value: "INFO", label: "Info & Daftar" }, { value: "PESERTA", label: `Peserta (${event.registeredCount ?? 0})` }]}
                />
              </div>
            )}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {tab === "INFO" ? (
                <InfoTab event={event} userId={userId} household={household} householdRegs={householdRegs} onChanged={onChanged} />
              ) : (
                <ParticipantsTab event={event} userId={userId} communityId={communityId} onChanged={onChanged} />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Hero({ event, onClose }: { event: SocialEvent; onClose: () => void }) {
  const meta = CATEGORY_META[event.category] ?? CATEGORY_META.LAINNYA;
  return (
    <div className={`relative shrink-0 bg-gradient-to-br ${meta.tone} text-white px-5 pt-4 pb-5 overflow-hidden`}>
      {event.coverUrl && <img src={event.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
      <span className="absolute -right-4 -bottom-8 text-[110px] opacity-15 select-none" aria-hidden>{meta.emoji}</span>
      <div className="w-10 h-1 rounded-full bg-white/50 mx-auto mb-3 md:hidden" />
      <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-black/20 hover:bg-black/30 flex items-center justify-center" aria-label="Tutup">
        <X className="w-4 h-4" />
      </button>
      <div className="relative space-y-1 pr-10">
        <p className="text-[11px] font-bold opacity-90">{meta.emoji} {meta.label}</p>
        <h2 className="text-xl sm:text-2xl font-black leading-tight">{event.title}</h2>
        <p className="text-xs opacity-95 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> {formatEventDate(event.startAt)}</p>
        <p className="text-xs opacity-95 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {formatEventTime(event.startAt, event.endAt)}</p>
      </div>
    </div>
  );
}

function InfoTab({
  event,
  userId,
  household,
  householdRegs,
  onChanged,
}: {
  event: SocialEvent;
  userId?: string;
  household: HouseholdMember[];
  householdRegs: SocialRegistration[];
  onChanged: () => void;
}) {
  const at = new Date(event.startAt);
  const regByCitizen = new Map(householdRegs.filter((r) => r.eventId === event.id).map((r) => [r.citizenId, r]));
  const eligible = (m: HouseholdMember) => isEligible(event.audience, m, at);
  const defaultPick = household.filter((m) => eligible(m) && !regByCitizen.get(m.id)).map((m) => m.id);
  const [selected, setSelected] = React.useState<string[]>(event.audience === "SEMUA" ? [] : defaultPick);
  const [busy, setBusy] = React.useState(false);
  const closed = event.status !== "TERJADWAL";
  const remaining = event.capacity ? Math.max(0, event.capacity - (event.registeredCount ?? 0)) : null;
  const pct = event.capacity ? Math.min(100, ((event.registeredCount ?? 0) / event.capacity) * 100) : 0;

  const register = async () => {
    if (!selected.length) return;
    setBusy(true);
    try {
      const res = await apiJson<{ added: number }>("/api/sosial/registrations", "POST", { eventId: event.id, userId, citizenIds: selected });
      toast.success(res.added ? `${res.added} anggota keluarga terdaftar.` : "Sudah terdaftar semua.");
      setSelected([]);
      onChanged();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (reg: SocialRegistration) => {
    if (!window.confirm(`Batalkan pendaftaran ${reg.participantName}?`)) return;
    try {
      await apiJson("/api/sosial/registrations", "PATCH", { id: reg.id, userId, status: "BATAL" });
      toast.success("Pendaftaran dibatalkan.");
      onChanged();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const shareText = `${CATEGORY_META[event.category]?.emoji ?? "📌"} *${event.title}*\n📅 ${formatEventDate(event.startAt)}\n🕗 ${formatEventTime(event.startAt, event.endAt)}\n📍 ${event.location}${
    event.services.length ? `\nLayanan: ${event.services.join(", ")}` : ""
  }${event.description ? `\n\n${event.description}` : ""}\n\nDaftar lewat aplikasi WargaIn.`;

  return (
    <div className="p-4 sm:p-5 space-y-4">
      {event.status === "DIBATALKAN" && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-300 font-semibold">
          Kegiatan ini dibatalkan{event.cancelReason ? `: ${event.cancelReason}` : "."}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <InfoRow icon={MapPin} label="Lokasi">
          {event.location}
          {event.lat != null && event.lng != null && (
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${event.lat},${event.lng}`} target="_blank" rel="noopener noreferrer" className="block text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
              Buka rute →
            </a>
          )}
        </InfoRow>
        <InfoRow icon={Users} label="Untuk">{AUDIENCE_META[event.audience]?.label}{event.autoEnroll ? " · otomatis terdaftar" : ""}</InfoRow>
        <InfoRow icon={Flag} label="Penyelenggara">{event.organizerName}</InfoRow>
        {event.contactPhone && (
          <InfoRow icon={Phone} label="Kontak">
            <a href={waLink(`Halo, saya mau tanya soal ${event.title}.`, event.contactPhone)} target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-700 dark:text-emerald-400">
              {event.contactPhone}
            </a>
          </InfoRow>
        )}
      </div>

      {event.services.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {event.services.map((s) => (
            <span key={s} className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">{s}</span>
          ))}
        </div>
      )}
      {event.description && <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">{event.description}</p>}

      <div>
        <div className="flex justify-between text-[11px] font-bold mb-1">
          <span>{event.registeredCount ?? 0} terdaftar{event.attendedCount ? ` · ${event.attendedCount} hadir` : ""}</span>
          {remaining != null && <span className={remaining === 0 ? "text-red-600" : "text-slate-500"}>{remaining === 0 ? "Kuota penuh" : `Sisa ${remaining} tempat`}</span>}
        </div>
        {event.capacity ? (
          <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
            <div className={`h-full rounded-full ${pct >= 100 ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3.5 space-y-2.5">
        <p className="text-xs font-extrabold">Pendaftaran keluarga saya</p>
        {household.length === 0 ? (
          <p className="text-[11px] text-slate-500">Akun ini belum terhubung ke data rumah/keluarga, jadi belum bisa mendaftar dari sini. Hubungi pengurus RT.</p>
        ) : (
          <ul className="space-y-1.5">
            {household.map((m) => {
              const reg = regByCitizen.get(m.id);
              const active = reg && reg.status !== "BATAL";
              const ok = eligible(m);
              const checked = selected.includes(m.id);
              return (
                <li key={m.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl ${active ? "bg-emerald-500/5" : "bg-neutral-50 dark:bg-[#0B130E]"}`}>
                  {active ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <input
                      type="checkbox"
                      disabled={closed || !event.registrationOpen}
                      checked={checked}
                      onChange={() => setSelected((l) => (checked ? l.filter((x) => x !== m.id) : [...l, m.id]))}
                      className="w-5 h-5 accent-emerald-600 shrink-0"
                      aria-label={`Daftarkan ${m.fullName}`}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{m.fullName}</p>
                    <p className="text-[10px] text-slate-500">
                      {m.age} th · {m.role.replace("_", " ").toLowerCase()}
                      {event.audience !== "SEMUA" && !ok && " · di luar sasaran"}
                    </p>
                  </div>
                  {active && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${REG_STATUS_STYLE[reg!.status]}`}>
                        {reg!.source === "OTOMATIS" && <Sparkles className="w-3 h-3 inline mr-0.5" />}
                        {reg!.status === "TERDAFTAR" ? SOURCE_LABEL[reg!.source] : reg!.status.replace("_", " ")}
                      </span>
                      {reg!.status === "TERDAFTAR" && !closed && (
                        <button onClick={() => cancel(reg!)} className="text-[10px] font-bold text-red-600 px-1.5 py-1">Batal</button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {household.length > 0 && !closed && event.registrationOpen && (
          <button onClick={register} disabled={!selected.length || busy} className={`${primaryBtn} w-full`}>
            {busy ? "Mendaftarkan..." : selected.length ? `Daftarkan ${selected.length} orang` : "Pilih anggota keluarga"}
          </button>
        )}
        {!event.registrationOpen && !closed && <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">Pendaftaran ditutup oleh pengurus.</p>}
      </div>

      <a href={waLink(shareText)} target="_blank" rel="noopener noreferrer" className={`${ghostBtn} w-full flex items-center justify-center gap-1.5`}>
        <Share2 className="w-4 h-4" /> Bagikan ke grup WhatsApp
      </a>
    </div>
  );
}

function InfoRow({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 p-2.5 rounded-xl bg-neutral-50 dark:bg-[#0B130E]">
      <Icon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-500 uppercase">{label}</p>
        <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">{children}</div>
      </div>
    </div>
  );
}

// ---------------- Pengurus: participants ----------------

function ParticipantsTab({ event, userId, communityId, onChanged }: { event: SocialEvent; userId?: string; communityId: string; onChanged: () => void }) {
  const [regs, setRegs] = React.useState<SocialRegistration[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<"SEMUA" | "TERDAFTAR" | "HADIR">("SEMUA");
  const [search, setSearch] = React.useState("");
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [adding, setAdding] = React.useState(false);
  const isPosyandu = event.category === "POSYANDU_BALITA" || event.category === "POSYANDU_LANSIA";

  const load = React.useCallback(async () => {
    const res = await fetch(`/api/sosial/registrations?eventId=${encodeURIComponent(event.id)}`);
    const json = await res.json();
    setRegs(json.registrations ?? []);
    setLoading(false);
  }, [event.id]);

  React.useEffect(() => {
    load();
  }, [load]);

  const refresh = () => {
    load();
    onChanged();
  };

  const patch = async (reg: SocialRegistration, body: Record<string, unknown>, msg?: string) => {
    try {
      const res = await apiJson<{ kms?: ChildKms | null }>("/api/sosial/registrations", "PATCH", { id: reg.id, userId, ...body });
      if (msg) toast.success(msg);
      refresh();
      return res.kms ?? null;
    } catch (e: any) {
      toast.error(e.message);
      return null;
    }
  };

  const eventAction = async (action: string, extra: Record<string, unknown> = {}) => {
    try {
      const res = await apiJson<{ enrolled?: number; affected?: number }>("/api/sosial/events", "PATCH", { id: event.id, action, ...extra });
      if (action === "SYNC_ENROLL") toast.success(res.enrolled ? `${res.enrolled} peserta baru terdaftar otomatis.` : "Peserta otomatis sudah lengkap.");
      if (action === "COMPLETE") toast.success("Kegiatan ditandai selesai.");
      if (action === "CANCEL") toast.success(`Dibatalkan${res.affected && res.affected > 1 ? ` (${res.affected} jadwal)` : ""}. Peserta mendapat notifikasi.`);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const cancelEvent = () => {
    const reason = window.prompt("Alasan pembatalan (dikirim ke peserta):", "");
    if (reason === null) return;
    const series = event.seriesId ? window.confirm("Batalkan juga semua jadwal berikutnya dalam seri ini?") : false;
    eventAction("CANCEL", { reason, applyToSeries: series });
  };

  const active = regs.filter((r) => r.status !== "BATAL");
  const listed = active
    .filter((r) => filter === "SEMUA" || r.status === filter)
    .filter((r) => !search.trim() || r.participantName.toLowerCase().includes(search.toLowerCase()) || (r.houseBlock ?? "").toLowerCase().includes(search.toLowerCase()));
  const attended = active.filter((r) => r.status === "HADIR").length;
  const closed = event.status !== "TERJADWAL";

  return (
    <div className="p-4 sm:p-5 space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ["Terdaftar", active.length, ""],
          ["Hadir", attended, "text-emerald-600"],
          ["Belum hadir", active.length - attended, "text-amber-600"],
        ].map(([label, n, tone]) => (
          <div key={label as string} className="rounded-xl bg-neutral-50 dark:bg-[#0B130E] p-2">
            <p className="text-[10px] text-slate-500 font-semibold">{label}</p>
            <p className={`text-lg font-black ${tone}`}>{n}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama / blok" className={`${inputClass} pl-9`} />
        </div>
        <Segmented value={filter} onChange={setFilter} options={[{ value: "SEMUA", label: "Semua" }, { value: "TERDAFTAR", label: "Belum hadir" }, { value: "HADIR", label: "Hadir" }]} />
      </div>

      {!closed && (
        <button onClick={() => setAdding((v) => !v)} className={`${ghostBtn} w-full flex items-center justify-center gap-1.5`}>
          <UserPlus className="w-4 h-4" /> Tambah peserta
        </button>
      )}
      {adding && <AddParticipant event={event} userId={userId} communityId={communityId} existing={active} onAdded={refresh} />}

      {loading ? (
        <p className="text-xs text-slate-500 py-6 text-center">Memuat peserta...</p>
      ) : listed.length === 0 ? (
        <p className="text-xs text-slate-500 py-6 text-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">Belum ada peserta.</p>
      ) : (
        <ul className="space-y-1.5">
          {listed.map((r) => {
            const open = expanded === r.id;
            const hasResult = Object.keys(r.measurements ?? {}).length > 0;
            return (
              <li key={r.id} className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                <div className="flex items-center gap-2 p-2.5">
                  <button
                    onClick={() => patch(r, { status: r.status === "HADIR" ? "TERDAFTAR" : "HADIR" })}
                    disabled={closed && r.status !== "HADIR"}
                    className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center border transition-colors ${
                      r.status === "HADIR" ? "bg-emerald-600 border-emerald-600 text-white" : "border-neutral-300 dark:border-neutral-700 text-slate-300"
                    }`}
                    aria-label={r.status === "HADIR" ? "Batalkan hadir" : "Tandai hadir"}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{r.participantName}</p>
                    <p className="text-[10px] text-slate-500">
                      {r.houseBlock ?? "-"}{r.age != null ? ` · ${r.age} th` : ""} · {SOURCE_LABEL[r.source]}
                      {hasResult && " · 📋 ada hasil"}
                    </p>
                  </div>
                  {isPosyandu && (
                    <button onClick={() => setExpanded(open ? null : r.id)} className="h-8 px-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-[10px] font-bold flex items-center gap-1 shrink-0">
                      <Stethoscope className="w-3.5 h-3.5" /> Ukur <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                  )}
                  {!closed && !isPosyandu && (
                    <button onClick={() => window.confirm(`Hapus ${r.participantName} dari daftar?`) && patch(r, { status: "BATAL" }, "Peserta dihapus.")} className="text-[10px] font-bold text-red-600 px-1.5 shrink-0">
                      Hapus
                    </button>
                  )}
                </div>
                {open && isPosyandu && (
                  <MeasurementForm
                    kind={event.category === "POSYANDU_BALITA" ? "BALITA" : "LANSIA"}
                    initial={r.measurements ?? {}}
                    citizenId={r.citizenId}
                    communityId={communityId}
                    userId={userId}
                    onSave={(m) => patch(r, { measurements: m }, `Hasil ${r.participantName} disimpan & dikirim ke keluarga.`)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
        {event.autoEnroll && !closed && (
          <button onClick={() => eventAction("SYNC_ENROLL")} className={`${ghostBtn} flex items-center justify-center gap-1.5`}>
            <RefreshCw className="w-3.5 h-3.5" /> Perbarui peserta otomatis
          </button>
        )}
        {!closed && (
          <button onClick={() => window.confirm("Tandai kegiatan selesai? Peserta yang belum dicentang dianggap tidak hadir.") && eventAction("COMPLETE")} className={`${ghostBtn} flex items-center justify-center gap-1.5`}>
            <Flag className="w-3.5 h-3.5" /> Tandai selesai
          </button>
        )}
        {!closed && (
          <button onClick={cancelEvent} className={`${ghostBtn} text-red-600 flex items-center justify-center gap-1.5`}>
            <Ban className="w-3.5 h-3.5" /> Batalkan kegiatan
          </button>
        )}
      </div>
    </div>
  );
}

function AddParticipant({
  event,
  userId,
  communityId,
  existing,
  onAdded,
}: {
  event: SocialEvent;
  userId?: string;
  communityId: string;
  existing: SocialRegistration[];
  onAdded: () => void;
}) {
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<(HouseholdMember & { houseBlock: string | null })[]>([]);
  const [guest, setGuest] = React.useState("");
  const taken = new Set(existing.map((r) => r.citizenId).filter(Boolean));

  React.useEffect(() => {
    const t = setTimeout(async () => {
      const res = await fetch(`/api/sosial/citizens?communityId=${encodeURIComponent(communityId)}&q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setResults(json.citizens ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [q, communityId]);

  const add = async (body: Record<string, unknown>) => {
    try {
      await apiJson("/api/sosial/registrations", "POST", { eventId: event.id, userId, ...body });
      toast.success("Peserta ditambahkan.");
      setGuest("");
      onAdded();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="rounded-xl bg-neutral-50 dark:bg-[#0B130E] p-3 space-y-2">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari warga (nama / blok)" className={inputClass} autoFocus />
      <ul className="max-h-48 overflow-y-auto space-y-1">
        {results.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 text-xs px-2 py-1.5 rounded-lg hover:bg-white dark:hover:bg-neutral-800/50">
            <span className="min-w-0 truncate">
              <b>{c.fullName}</b> <span className="text-slate-500">· {c.houseBlock ?? "-"} · {c.age} th</span>
            </span>
            {taken.has(c.id) ? (
              <span className="text-[10px] font-bold text-emerald-600 shrink-0">Terdaftar</span>
            ) : (
              <button onClick={() => add({ citizenIds: [c.id] })} className="h-7 px-2.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold shrink-0">Tambah</button>
            )}
          </li>
        ))}
      </ul>
      <div className="flex gap-2 pt-1 border-t border-neutral-200 dark:border-neutral-800">
        <input value={guest} onChange={(e) => setGuest(e.target.value)} placeholder="Atau nama tamu / warga luar" className={inputClass} />
        <button onClick={() => guest.trim() && add({ guest: { name: guest } })} className="h-10 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 text-[11px] font-bold shrink-0">Tambah</button>
      </div>
    </div>
  );
}

function MeasurementForm({
  kind,
  initial,
  citizenId,
  communityId,
  userId,
  onSave,
}: {
  kind: "BALITA" | "LANSIA";
  initial: Measurements;
  citizenId?: string | null;
  communityId: string;
  userId?: string;
  onSave: (m: Measurements) => Promise<ChildKms | null>;
}) {
  const [m, setM] = React.useState<Measurements>(initial);
  const [child, setChild] = React.useState<ChildKms | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Load the child's KMS so due vaccines can be highlighted and the result shown after saving.
  React.useEffect(() => {
    if (kind !== "BALITA" || !citizenId || !userId) return;
    fetch(`/api/kms?communityId=${encodeURIComponent(communityId)}&userId=${encodeURIComponent(userId)}&citizenId=${encodeURIComponent(citizenId)}`)
      .then((r) => r.json())
      .then((j) => setChild(j.children?.[0] ?? null))
      .catch(() => {});
  }, [kind, citizenId, communityId, userId]);

  const save = async () => {
    setSaving(true);
    const res = await onSave(m);
    if (res) setChild(res);
    setSaving(false);
  };

  const doseStatus = new Map((child?.doses ?? []).map((d) => [d.vaccine.code, d.status]));
  const offered = IMMUNIZATION_SCHEDULE.filter((v) => {
    const st = doseStatus.get(v.code);
    return (m.vaksin ?? []).includes(v.code) || st === "JATUH_TEMPO" || st === "TERLAMBAT" || st === "SEGERA";
  });
  const toggleVaccine = (code: string) =>
    setM((x) => {
      const list = x.vaksin ?? [];
      return { ...x, vaksin: list.includes(code) ? list.filter((c) => c !== code) : [...list, code] };
    });
  const a = child?.latest?.assessment;
  const num = (k: keyof Measurements) => ({
    value: (m[k] as number | undefined) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setM((x) => ({ ...x, [k]: e.target.value === "" ? undefined : Number(e.target.value) })),
    type: "number",
    step: "0.1",
    inputMode: "decimal" as const,
    className: inputClass,
  });

  return (
    <div className="px-3 pb-3 pt-1 space-y-2 bg-neutral-50/60 dark:bg-[#0B130E]/60">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <MField label="Berat (kg)"><input {...num("beratKg")} /></MField>
        {kind === "BALITA" ? (
          <>
            <MField label="Tinggi (cm)"><input {...num("tinggiCm")} /></MField>
            <MField label="Lingkar kepala (cm)"><input {...num("lingkarKepalaCm")} /></MField>
            <MField label="LiLA (cm)"><input {...num("lingkarLenganCm")} /></MField>
            <MField label="Cara ukur">
              <select value={m.caraUkur ?? ""} onChange={(e) => setM((x) => ({ ...x, caraUkur: (e.target.value || undefined) as Measurements["caraUkur"] }))} className={inputClass}>
                <option value="">Sesuai umur</option>
                <option value="LENGTH">Telentang (PB)</option>
                <option value="HEIGHT">Berdiri (TB)</option>
              </select>
            </MField>
            <label className="flex items-center gap-2 text-xs font-semibold pt-5">
              <input type="checkbox" checked={!!m.vitaminA} onChange={(e) => setM((x) => ({ ...x, vitaminA: e.target.checked }))} className="w-4 h-4 accent-emerald-600" /> Vitamin A
            </label>
          </>
        ) : (
          <>
            <MField label="Tensi (mmHg)">
              <input value={m.tensi ?? ""} onChange={(e) => setM((x) => ({ ...x, tensi: e.target.value || undefined }))} className={inputClass} placeholder="120/80" />
            </MField>
            <MField label="Gula darah (mg/dL)"><input {...num("gulaDarah")} /></MField>
            <MField label="Kolesterol"><input {...num("kolesterol")} /></MField>
            <MField label="Asam urat"><input {...num("asamUrat")} /></MField>
          </>
        )}
      </div>
      {kind === "BALITA" && (
        <div>
          <p className="text-[10px] font-bold text-slate-500 mb-1">Imunisasi diberikan hari ini {offered.length === 0 && child ? "· tidak ada dosis jatuh tempo" : ""}</p>
          <div className="flex flex-wrap gap-1">
            {(offered.length ? offered : IMMUNIZATION_SCHEDULE.filter((v) => doseStatus.get(v.code) !== "SUDAH").slice(0, 6)).map((v) => {
              const on = (m.vaksin ?? []).includes(v.code);
              const st = doseStatus.get(v.code);
              return (
                <button
                  type="button"
                  key={v.code}
                  onClick={() => toggleVaccine(v.code)}
                  className={`px-2 py-1 rounded-full border text-[10px] font-bold ${
                    on ? "bg-sky-600 border-sky-600 text-white" : st === "TERLAMBAT" ? "border-red-400 text-red-600" : st === "JATUH_TEMPO" ? "border-amber-400 text-amber-700" : "border-neutral-200 dark:border-neutral-700 text-slate-500"
                  }`}
                >
                  💉 {v.short}{st === "TERLAMBAT" ? " (terlambat)" : st === "JATUH_TEMPO" ? " (waktunya)" : ""}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <input value={m.catatan ?? ""} onChange={(e) => setM((x) => ({ ...x, catatan: e.target.value || undefined }))} className={inputClass} placeholder="Catatan kader (opsional)" />
      <button onClick={save} disabled={saving} className={`${primaryBtn} w-full`}>{saving ? "Menyimpan..." : "Simpan hasil & kirim ke keluarga"}</button>
      {kind === "BALITA" && a && (
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {[["BB/U", a.wfa], ["TB/U", a.lhfa], ["BB/TB", a.wfh]].map(([label, r]) =>
            r ? (
              <div key={label as string} className={`rounded-lg border p-1.5 ${TONE_CLASS[(r as any).tone as keyof typeof TONE_CLASS]}`}>
                <p className="text-[9px] font-black">{label as string}</p>
                <p className="text-[10px] font-bold leading-tight">{(r as any).label}</p>
              </div>
            ) : null
          )}
          {child?.flags.length ? <p className="col-span-3 text-[10px] font-bold text-red-600">⚠️ {child.flags.join(" · ")} — pengurus sudah diberi tahu.</p> : null}
        </div>
      )}
    </div>
  );
}

function MField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-0.5">
      <span className="text-[10px] font-bold text-slate-500">{label}</span>
      {children}
    </label>
  );
}
