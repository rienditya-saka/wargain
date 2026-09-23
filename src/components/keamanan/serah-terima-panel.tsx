"use client";

import * as React from "react";
import { toast } from "sonner";
import { ClipboardList, CheckCircle2, XCircle, Package, KeyRound, Handshake } from "lucide-react";
import { HandoverChecklistItem, KeamananState, KeamananUpdater, ShiftHandover } from "@/lib/keamanan/types";
import { formatDateTime, timeAgo, uid } from "@/lib/keamanan/store";
import { Empty, Field, Panel, Pill, StatCard, inputClass, primaryBtn } from "./ui";

const SHIFT_OPTIONS = ["Pagi (06:00-14:00)", "Siang (14:00-22:00)", "Malam (22:00-06:00)"];

const DEFAULT_CHECKLIST = [
  "Kunci gerbang & portal",
  "HT / radio",
  "Senter & baterai",
  "Monitor CCTV normal",
  "Buku tamu terisi",
  "Palang / barrier gate berfungsi",
];

function currentShiftLabel() {
  const h = new Date().getHours();
  if (h >= 6 && h < 14) return SHIFT_OPTIONS[0];
  if (h >= 14 && h < 22) return SHIFT_OPTIONS[1];
  return SHIFT_OPTIONS[2];
}

export function SerahTerimaPanel({ state, update, officerName }: { state: KeamananState; update: KeamananUpdater; officerName: string }) {
  const [shiftLabel, setShiftLabel] = React.useState(currentShiftLabel());
  const [toOfficer, setToOfficer] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [packagesHeld, setPackagesHeld] = React.useState(0);
  const [keysHeld, setKeysHeld] = React.useState("");
  const [checklist, setChecklist] = React.useState<HandoverChecklistItem[]>(DEFAULT_CHECKLIST.map((item) => ({ item, ok: true })));

  // Activity during the last 8 hours, prefilled into the handover so nothing gets forgotten.
  const since = Date.now() - 8 * 3_600_000;
  const recent = {
    panic: state.alerts.filter((a) => new Date(a.createdAt).getTime() >= since).length,
    incidents: state.incidents.filter((i) => new Date(i.createdAt).getTime() >= since).length,
    visitors: state.gateLogs.filter((g) => new Date(g.inAt).getTime() >= since).length,
    inside: state.gateLogs.filter((g) => g.status === "DIIZINKAN").length,
    watchSeen: state.watchlist.filter((w) => w.active && w.lastSeenAt && new Date(w.lastSeenAt).getTime() >= since).length,
  };

  const pending = state.handovers.filter((h) => !h.acknowledgedAt);

  const autoSummary = () => {
    const parts = [
      recent.panic ? `${recent.panic} sinyal panic` : "Tidak ada panic",
      `${recent.visitors} pengunjung tercatat, ${recent.inside} masih di dalam`,
      recent.incidents ? `${recent.incidents} laporan kejadian baru` : null,
      recent.watchSeen ? `${recent.watchSeen} penampakan daftar waspada` : null,
    ].filter(Boolean);
    setSummary((s) => (s ? `${s}\n` : "") + parts.join(". ") + ".");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toOfficer.trim()) {
      toast.error("Isi nama petugas penerima shift.");
      return;
    }
    const handover: ShiftHandover = {
      id: uid("ho"),
      shiftLabel,
      fromOfficer: officerName,
      toOfficer: toOfficer.trim(),
      summary: summary.trim(),
      checklist,
      packagesHeld,
      keysHeld: keysHeld.trim(),
      createdAt: new Date().toISOString(),
    };
    update((s) => ({ ...s, handovers: [handover, ...s.handovers] }));
    setSummary("");
    setToOfficer("");
    setChecklist(DEFAULT_CHECKLIST.map((item) => ({ item, ok: true })));
    toast.success("Serah terima dikirim. Menunggu konfirmasi petugas penerima.");
  };

  const acknowledge = (h: ShiftHandover) => {
    update((s) => ({
      ...s,
      handovers: s.handovers.map((x) => (x.id === h.id ? { ...x, acknowledgedAt: new Date().toISOString(), acknowledgedBy: officerName } : x)),
    }));
    toast.success("Shift diterima. Selamat bertugas!");
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
      <div className="xl:col-span-2 space-y-4 order-2 xl:order-1">
        <Panel title="Buat Serah Terima Shift" description={`Dari: ${officerName}`} icon={Handshake}>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Shift">
                <select value={shiftLabel} onChange={(e) => setShiftLabel(e.target.value)} className={inputClass}>
                  {SHIFT_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Diserahkan ke">
                <input value={toOfficer} onChange={(e) => setToOfficer(e.target.value)} className={inputClass} placeholder="Nama petugas" />
              </Field>
            </div>

            <div>
              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">Checklist perlengkapan</p>
              <ul className="space-y-1.5">
                {checklist.map((c, i) => (
                  <li key={c.item} className="flex flex-col gap-1.5 p-2 rounded-xl bg-neutral-50 dark:bg-[#0B130E]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">{c.item}</span>
                      <div className="flex gap-1">
                        {[true, false].map((ok) => (
                          <button
                            key={String(ok)}
                            type="button"
                            onClick={() => setChecklist((list) => list.map((x, j) => (j === i ? { ...x, ok } : x)))}
                            className={`w-9 h-8 rounded-lg flex items-center justify-center border ${
                              c.ok === ok
                                ? ok
                                  ? "bg-emerald-600 border-emerald-600 text-white"
                                  : "bg-red-600 border-red-600 text-white"
                                : "border-neutral-200 dark:border-neutral-700 text-slate-400"
                            }`}
                            aria-label={ok ? "Baik" : "Bermasalah"}
                          >
                            {ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          </button>
                        ))}
                      </div>
                    </div>
                    {!c.ok && (
                      <input
                        value={c.note ?? ""}
                        onChange={(e) => setChecklist((list) => list.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))}
                        placeholder="Kendalanya apa?"
                        className={inputClass}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Paket dititip di pos">
                <input type="number" min={0} inputMode="numeric" value={packagesHeld} onChange={(e) => setPackagesHeld(Math.max(0, Number(e.target.value)))} className={inputClass} />
              </Field>
              <Field label="Kunci titipan">
                <input value={keysHeld} onChange={(e) => setKeysHeld(e.target.value)} className={inputClass} placeholder="mis. kunci F-06" />
              </Field>
            </div>

            <Field label="Catatan kejadian selama shift">
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} className={inputClass} placeholder="Hal yang perlu diperhatikan shift berikutnya..." />
            </Field>
            <button type="button" onClick={autoSummary} className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
              + Isi otomatis dari aktivitas 8 jam terakhir
            </button>
            <button type="submit" className={`${primaryBtn} w-full`}>Serahkan Shift</button>
          </form>
        </Panel>
      </div>

      <div className="xl:col-span-3 space-y-4 order-1 xl:order-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatCard label="Panic 8 jam" value={recent.panic} tone={recent.panic ? "text-red-600" : undefined} />
          <StatCard label="Pengunjung 8 jam" value={recent.visitors} />
          <StatCard label="Masih di dalam" value={recent.inside} />
          <StatCard label="Laporan baru" value={recent.incidents} />
        </div>

        {pending.length > 0 && (
          <Panel title="Menunggu Diterima" icon={ClipboardList} className="border-amber-500/60">
            <ul className="space-y-3">
              {pending.map((h) => (
                <HandoverCard key={h.id} handover={h} onAcknowledge={() => acknowledge(h)} />
              ))}
            </ul>
          </Panel>
        )}

        <Panel title="Riwayat Serah Terima" icon={ClipboardList}>
          {state.handovers.filter((h) => h.acknowledgedAt).length === 0 ? (
            <Empty>Belum ada riwayat.</Empty>
          ) : (
            <ul className="space-y-3">
              {state.handovers.filter((h) => h.acknowledgedAt).slice(0, 10).map((h) => (
                <HandoverCard key={h.id} handover={h} />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function HandoverCard({ handover: h, onAcknowledge }: { handover: ShiftHandover; onAcknowledge?: () => void }) {
  const issues = h.checklist.filter((c) => !c.ok);
  return (
    <li className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-extrabold">
          {h.fromOfficer} → {h.toOfficer}
        </p>
        {h.acknowledgedAt ? <Pill tone="emerald">DITERIMA {timeAgo(h.acknowledgedAt)}</Pill> : <Pill tone="amber">BELUM DITERIMA</Pill>}
      </div>
      <p className="text-[11px] text-slate-500">{h.shiftLabel} · {formatDateTime(h.createdAt)}</p>
      {h.summary && <p className="text-xs whitespace-pre-line text-slate-700 dark:text-slate-300">{h.summary}</p>}
      <div className="flex flex-wrap gap-1.5">
        <Pill tone="slate"><Package className="w-3 h-3" /> {h.packagesHeld} paket</Pill>
        {h.keysHeld && <Pill tone="slate"><KeyRound className="w-3 h-3" /> {h.keysHeld}</Pill>}
        {issues.length === 0 ? (
          <Pill tone="emerald">Perlengkapan lengkap</Pill>
        ) : (
          issues.map((c) => <Pill key={c.item} tone="red">✗ {c.item}{c.note ? `: ${c.note}` : ""}</Pill>)
        )}
      </div>
      {onAcknowledge && (
        <button onClick={onAcknowledge} className={`${primaryBtn} w-full sm:w-auto`}>
          Terima Shift
        </button>
      )}
    </li>
  );
}
