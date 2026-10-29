"use client";

import * as React from "react";
import { AppSheet } from "@/components/ui/app-sheet";
import { Search, AlertTriangle, TrendingDown, Syringe, Ruler, Scale, Users } from "lucide-react";
import { useKmsDashboard } from "@/lib/kms/client";
import type { ChildKms } from "@/lib/kms/types";
import { VACCINE_BY_CODE } from "@/lib/kms/immunization";
import { TONE_CLASS } from "@/lib/kms/zscore";
import { KmsCard } from "./kms-card";

type Filter = "SEMUA" | "PERHATIAN" | "STUNTING" | "KURANG" | "2T" | "IMUNISASI" | "BELUM_DITIMBANG";

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export function KmsDashboard({ communityId, userId }: { communityId: string; userId?: string }) {
  const { data, error, reload } = useKmsDashboard(communityId, userId);
  const [filter, setFilter] = React.useState<Filter>("PERHATIAN");
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState<ChildKms | null>(null);

  React.useEffect(() => {
    if (open && data) setOpen(data.children.find((c) => c.citizen.id === open.citizen.id) ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (error) return <div className="p-3 rounded-xl bg-red-500/10 text-xs text-red-600 font-semibold">{error}</div>;
  if (!data) return <div className="h-60 rounded-2xl bg-neutral-100 dark:bg-neutral-900 animate-pulse" />;

  const { skdn, counts } = data;
  const monthLabel = new Date(`${data.month}-01T00:00:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const match = (c: ChildKms) => {
    const a = c.latest?.assessment;
    switch (filter) {
      case "PERHATIAN": return c.flags.length > 0 || c.immunization.lateCodes.length > 0;
      case "STUNTING": return !!a?.lhfa && a.lhfa.z < -2;
      case "KURANG": return (!!a?.wfa && a.wfa.z < -2) || (!!a?.wfh && a.wfh.z < -2);
      case "2T": return c.twoT;
      case "IMUNISASI": return c.immunization.lateCodes.length > 0;
      case "BELUM_DITIMBANG": return !c.weighedThisMonth;
      default: return true;
    }
  };
  const list = data.children.filter(match).filter((c) => !q.trim() || c.citizen.fullName.toLowerCase().includes(q.toLowerCase()) || (c.citizen.houseBlock ?? "").toLowerCase().includes(q.toLowerCase()));

  const tiles: { label: string; value: React.ReactNode; sub: string; icon: React.ElementType; tone: string; f: Filter }[] = [
    { label: "Stunting", value: counts.stunting, sub: "TB/U < −2 SD", icon: Ruler, tone: counts.stunting ? "text-red-600" : "", f: "STUNTING" },
    { label: "Gizi / BB kurang", value: counts.underweight, sub: `wasting ${counts.wasting}`, icon: Scale, tone: counts.underweight ? "text-amber-600" : "", f: "KURANG" },
    { label: "2T (2x tidak naik)", value: counts.twoT, sub: "rujuk bidan", icon: TrendingDown, tone: counts.twoT ? "text-red-600" : "", f: "2T" },
    { label: "Imunisasi terlambat", value: counts.immunizationLate, sub: `IDL ${counts.idl}/${counts.eligibleIdl} (≥12 bln)`, icon: Syringe, tone: counts.immunizationLate ? "text-amber-600" : "", f: "IMUNISASI" },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-pink-600 to-rose-700 text-white p-4 sm:p-5">
        <p className="text-[11px] font-bold opacity-90">SKDN Posyandu · {monthLabel}</p>
        <div className="grid grid-cols-4 gap-2 mt-2">
          {[
            ["S", skdn.S, "Balita"],
            ["K", skdn.K, "Punya KMS"],
            ["D", skdn.D, "Ditimbang"],
            ["N", skdn.N, "Naik BB"],
          ].map(([k, v, l]) => (
            <div key={k as string} className="rounded-xl bg-white/15 p-2 text-center">
              <p className="text-[10px] font-black opacity-80">{k}</p>
              <p className="text-2xl font-black leading-none">{v}</p>
              <p className="text-[9px] opacity-85 mt-0.5">{l}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
          <Bar label="Partisipasi D/S" value={pct(skdn.D, skdn.S)} />
          <Bar label="Keberhasilan N/D" value={pct(skdn.N, skdn.D)} />
        </div>
        {skdn.T > 0 && <p className="text-[11px] mt-2 opacity-90">{skdn.T} balita berat badannya tidak naik bulan ini.</p>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {tiles.map((t) => (
          <button key={t.label} onClick={() => setFilter(t.f)} className={`text-left rounded-2xl border bg-white dark:bg-[#131F17] p-3 transition-colors ${filter === t.f ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-neutral-200/80 dark:border-neutral-800/80"}`}>
            <t.icon className="w-4 h-4 text-slate-400" />
            <p className={`text-2xl font-black mt-1 ${t.tone}`}>{t.value}</p>
            <p className="text-[11px] font-bold leading-tight">{t.label}</p>
            <p className="text-[10px] text-slate-500">{t.sub}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / blok" className="w-full min-h-[40px] pl-9 pr-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#131F17] text-xs" />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {([["PERHATIAN", "Perlu perhatian"], ["BELUM_DITIMBANG", "Belum ditimbang"], ["SEMUA", "Semua"]] as [Filter, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`shrink-0 min-h-[40px] px-3 rounded-xl text-[11px] font-bold border ${filter === k ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900" : "border-neutral-200 dark:border-neutral-800"}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800 text-[11px] font-bold text-slate-500 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {list.length} balita</div>
        {list.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-10">Tidak ada balita di kategori ini. 🎉</p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {list.map((c) => {
              const a = c.latest?.assessment;
              return (
                <li key={c.citizen.id}>
                  <button onClick={() => setOpen(c)} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <span className="text-xl shrink-0">{c.citizen.gender === "P" ? "👧" : "👦"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate">{c.citizen.fullName} <span className="font-normal text-slate-500">· {c.ageMonths} bln · {c.citizen.houseBlock ?? "-"}</span></p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {a?.wfa && <span className={`px-1.5 rounded border text-[9px] font-bold ${TONE_CLASS[a.wfa.tone]}`}>BB/U {a.wfa.z.toFixed(1)}</span>}
                        {a?.lhfa && <span className={`px-1.5 rounded border text-[9px] font-bold ${TONE_CLASS[a.lhfa.tone]}`}>TB/U {a.lhfa.z.toFixed(1)}</span>}
                        {a?.wfh && <span className={`px-1.5 rounded border text-[9px] font-bold ${TONE_CLASS[a.wfh.tone]}`}>BB/TB {a.wfh.z.toFixed(1)}</span>}
                        {c.twoT && <span className="px-1.5 rounded bg-red-600 text-white text-[9px] font-black">2T</span>}
                        {!c.weighedThisMonth && <span className="px-1.5 rounded bg-neutral-100 dark:bg-neutral-800 text-slate-500 text-[9px] font-bold">belum ditimbang</span>}
                        {c.immunization.lateCodes.length > 0 && (
                          <span className="px-1.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[9px] font-bold">
                            💉 {c.immunization.lateCodes.slice(0, 3).map((x) => VACCINE_BY_CODE.get(x)?.short ?? x).join(", ")}{c.immunization.lateCodes.length > 3 ? "…" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    {c.flags.length > 0 && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="text-[10px] text-slate-400">
        Standar WHO Child Growth Standards 2006 & klasifikasi Permenkes No. 2/2020. N/T memakai KBM Permenkes 155/2010. Alat bantu pantau untuk kader; diagnosis tetap oleh tenaga kesehatan.
      </p>

      <AppSheet open={!!open} onClose={() => setOpen(null)} title="Kartu Menuju Sehat (KMS)" size="lg">
        {open && (
          <div className="px-3 py-3">
            <KmsCard child={open} userId={userId} canEdit onChanged={reload} />
          </div>
        )}
      </AppSheet>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between font-bold mb-1"><span className="opacity-90">{label}</span><span>{value}%</span></div>
      <div className="h-1.5 rounded-full bg-white/20 overflow-hidden"><div className="h-full rounded-full bg-white" style={{ width: `${value}%` }} /></div>
    </div>
  );
}
