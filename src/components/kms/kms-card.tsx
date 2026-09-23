"use client";

import * as React from "react";
import { toast } from "sonner";
import { AlertTriangle, Syringe, Plus, CheckCircle2, Clock, TrendingUp, TrendingDown, X } from "lucide-react";
import type { ChildKms } from "@/lib/kms/types";
import { IMMUNIZATION_SCHEDULE, DoseState } from "@/lib/kms/immunization";
import { TONE_CLASS, IndicatorResult } from "@/lib/kms/zscore";
import { postKms } from "@/lib/kms/client";
import { KmsChart } from "./kms-chart";

const DOSE_STYLE: Record<DoseState["status"], string> = {
  SUDAH: "bg-emerald-600 text-white border-emerald-600",
  TERLAMBAT: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/40",
  JATUH_TEMPO: "bg-amber-400 text-slate-900 border-amber-400",
  SEGERA: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/40",
  BELUM_WAKTUNYA: "bg-transparent text-slate-400 border-neutral-200 dark:border-neutral-700",
};
const DOSE_LABEL: Record<DoseState["status"], string> = {
  SUDAH: "Sudah", TERLAMBAT: "Terlambat", JATUH_TEMPO: "Waktunya", SEGERA: "Bulan depan", BELUM_WAKTUNYA: "Belum",
};

function ageText(days: number) {
  const m = Math.floor(days / 30.4375);
  if (m < 1) return `${days} hari`;
  const y = Math.floor(m / 12);
  const rem = m % 12;
  return y ? `${y} th ${rem} bln` : `${m} bln`;
}

function Status({ title, r }: { title: string; r?: IndicatorResult }) {
  if (!r) return (
    <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 p-2">
      <p className="text-[9px] font-black text-slate-400 uppercase">{title}</p>
      <p className="text-[11px] text-slate-400">Belum diukur</p>
    </div>
  );
  return (
    <div className={`rounded-xl border p-2 ${TONE_CLASS[r.tone]}`}>
      <p className="text-[9px] font-black uppercase opacity-80">{title}</p>
      <p className="text-[11px] font-extrabold leading-tight">{r.label}</p>
      <p className="text-[9px] opacity-70">z = {r.z.toFixed(2)}</p>
    </div>
  );
}

export function KmsCard({ child, userId, canEdit, onChanged }: { child: ChildKms; userId?: string; canEdit: boolean; onChanged?: () => void }) {
  const [chart, setChart] = React.useState<"WFA" | "LHFA" | "HCFA">("WFA");
  const [form, setForm] = React.useState<null | "MEASURE" | { dose: string }>(null);
  const sex = child.citizen.gender === "P" ? 2 : 1;
  const a = child.latest?.assessment;
  const trend = child.measurements.filter((m) => m.weightKg).pop()?.trend;
  const groups = Array.from(new Set(IMMUNIZATION_SCHEDULE.map((v) => v.group)));

  return (
    <article className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] overflow-hidden">
      <header className={`px-4 py-3 flex items-center gap-3 ${sex === 2 ? "bg-pink-500/10" : "bg-sky-500/10"}`}>
        <span className="w-11 h-11 rounded-2xl bg-white dark:bg-black/20 flex items-center justify-center text-2xl shrink-0">{sex === 2 ? "👧" : "👦"}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold truncate">{child.citizen.fullName}</p>
          <p className="text-[11px] text-slate-500">
            {sex === 2 ? "Perempuan" : "Laki-laki"} · {ageText(child.ageDays)} · {child.citizen.houseBlock ?? "-"}
          </p>
        </div>
        {trend && (trend === "N" || trend === "T") && (
          <span className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 ${trend === "N" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
            {trend === "N" ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />} {trend === "N" ? "Naik" : "Tidak naik"}
          </span>
        )}
      </header>

      <div className="p-4 space-y-3">
        {child.flags.length > 0 && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-red-700 dark:text-red-300">
              <p className="font-black">Perlu perhatian</p>
              <p>{child.flags.join(" · ")}.</p>
              <p className="mt-0.5 opacity-80">Konsultasikan ke bidan / puskesmas. Ini alat pantau, bukan diagnosis.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          <Status title="BB/U" r={a?.wfa} />
          <Status title={child.ageDays < 731 ? "PB/U" : "TB/U"} r={a?.lhfa} />
          <Status title={child.ageDays < 731 ? "BB/PB" : "BB/TB"} r={a?.wfh} />
          <Status title="LK/U" r={a?.hcfa} />
        </div>

        {child.latest && (
          <p className="text-[10px] text-slate-500">
            Terakhir diukur {new Date(child.latest.measuredAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            {child.latest.weightKg ? ` · BB ${child.latest.weightKg} kg` : ""}
            {child.latest.heightCm ? ` · ${child.ageDays < 731 ? "PB" : "TB"} ${child.latest.heightCm} cm` : ""}
            {child.latest.headCm ? ` · LK ${child.latest.headCm} cm` : ""}
            {child.weighedThisMonth ? "" : " · belum ditimbang bulan ini"}
          </p>
        )}

        <div>
          <div className="flex rounded-xl border border-neutral-200 dark:border-neutral-800 p-0.5 text-[11px] font-bold mb-2">
            {([["WFA", "Berat"], ["LHFA", "Tinggi"], ["HCFA", "Lingkar kepala"]] as const).map(([k, label]) => (
              <button key={k} onClick={() => setChart(k)} className={`flex-1 min-h-[30px] rounded-lg ${chart === k ? "bg-emerald-600 text-white" : "text-slate-500"}`}>{label}</button>
            ))}
          </div>
          <KmsChart kind={chart} sex={sex} points={child.measurements} ageMonthsNow={child.ageMonths} />
          {child.measurements.length === 0 && <p className="text-[11px] text-slate-500 text-center -mt-1">Belum ada data. Hasil timbang posyandu otomatis masuk ke sini.</p>}
        </div>

        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold flex items-center gap-1.5"><Syringe className="w-4 h-4 text-sky-600" /> Imunisasi</p>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${child.immunization.idl ? "bg-emerald-600 text-white" : "bg-neutral-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-300"}`}>
              {child.immunization.idl ? "Imunisasi dasar lengkap ✓" : `${child.immunization.done}/${child.immunization.total} dosis`}
            </span>
          </div>
          {child.immunization.lateCodes.length > 0 && (
            <p className="text-[11px] font-bold text-red-600">{child.immunization.lateCodes.length} dosis terlambat, masih bisa dikejar di posyandu/puskesmas.</p>
          )}
          <div className="space-y-1.5">
            {groups.map((g) => {
              const doses = child.doses.filter((d) => d.vaccine.group === g);
              return (
                <div key={g} className="flex items-start gap-2">
                  <span className="w-14 shrink-0 text-[10px] font-bold text-slate-500 pt-1">{g}</span>
                  <div className="flex flex-wrap gap-1">
                    {doses.map((d) => (
                      <button
                        key={d.vaccine.code}
                        type="button"
                        disabled={!canEdit || d.status === "SUDAH"}
                        onClick={() => setForm({ dose: d.vaccine.code })}
                        title={d.status === "SUDAH" ? `Diberikan ${d.givenAt}` : `Jadwal ${d.dueDate} · ${DOSE_LABEL[d.status]}`}
                        className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${DOSE_STYLE[d.status]} ${canEdit && d.status !== "SUDAH" ? "hover:ring-2 hover:ring-emerald-500/40" : ""}`}
                      >
                        {d.status === "SUDAH" && <CheckCircle2 className="w-3 h-3 inline -mt-0.5 mr-0.5" />}
                        {(d.status === "JATUH_TEMPO" || d.status === "SEGERA") && <Clock className="w-3 h-3 inline -mt-0.5 mr-0.5" />}
                        {d.vaccine.short}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {canEdit && <p className="text-[10px] text-slate-400">Ketuk dosis yang sudah diberikan di puskesmas/klinik untuk mencatatnya.</p>}
        </div>

        {canEdit && (
          <button onClick={() => setForm("MEASURE")} className="w-full min-h-[40px] rounded-xl border border-dashed border-emerald-500/50 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5">
            <Plus className="w-4 h-4" /> Tambah hasil timbang (puskesmas / klinik)
          </button>
        )}

        {form && (
          <EntryForm
            child={child}
            userId={userId}
            dose={typeof form === "object" ? form.dose : undefined}
            onClose={() => setForm(null)}
            onSaved={() => {
              setForm(null);
              onChanged?.();
            }}
          />
        )}
      </div>
    </article>
  );
}

function EntryForm({ child, userId, dose, onClose, onSaved }: { child: ChildKms; userId?: string; dose?: string; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const [date, setDate] = React.useState(today);
  const [weight, setWeight] = React.useState("");
  const [height, setHeight] = React.useState("");
  const [head, setHead] = React.useState("");
  const [place, setPlace] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const vaccine = IMMUNIZATION_SCHEDULE.find((v) => v.code === dose);
  const input = "w-full min-h-[38px] px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0B130E] text-xs";

  const save = async () => {
    setSaving(true);
    try {
      if (dose) await postKms({ userId, citizenId: child.citizen.id, kind: "IMMUNIZATION", vaccineCode: dose, givenAt: date, place });
      else await postKms({ userId, citizenId: child.citizen.id, kind: "MEASUREMENT", measuredAt: date, weightKg: weight, heightCm: height, headCm: head });
      toast.success(dose ? `${vaccine?.short} tercatat.` : "Hasil pengukuran tersimpan di KMS.");
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl bg-neutral-50 dark:bg-[#0B130E] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-extrabold">{dose ? `Catat imunisasi ${vaccine?.name}` : "Tambah hasil pengukuran"}</p>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400" aria-label="Tutup"><X className="w-4 h-4" /></button>
      </div>
      <label className="block text-[10px] font-bold text-slate-500">Tanggal
        <input type="date" max={today} min={child.citizen.birthDate} value={date} onChange={(e) => setDate(e.target.value)} className={input} />
      </label>
      {dose ? (
        <label className="block text-[10px] font-bold text-slate-500">Tempat
          <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Puskesmas Babelan / RS / Klinik" className={input} />
        </label>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          <label className="block text-[10px] font-bold text-slate-500">BB (kg)<input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" step="0.01" inputMode="decimal" className={input} /></label>
          <label className="block text-[10px] font-bold text-slate-500">{child.ageDays < 731 ? "PB" : "TB"} (cm)<input value={height} onChange={(e) => setHeight(e.target.value)} type="number" step="0.1" inputMode="decimal" className={input} /></label>
          <label className="block text-[10px] font-bold text-slate-500">LK (cm)<input value={head} onChange={(e) => setHead(e.target.value)} type="number" step="0.1" inputMode="decimal" className={input} /></label>
        </div>
      )}
      <button onClick={save} disabled={saving} className="w-full min-h-[40px] rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-50">{saving ? "Menyimpan..." : "Simpan"}</button>
    </div>
  );
}
