import {
  AGE_MAX_DAYS, AGE_STEP_DAYS, HCFA, LEN_STEP_CM, LHFA, LMS, Sex, WFA, WFH, WFH_RANGE, WFL, WFL_RANGE,
} from "./who-standards";

// Anthropometric z-scores (WHO Child Growth Standards, LMS method) and the
// Indonesian classification from Permenkes RI No. 2 Tahun 2020 (Standar Antropometri Anak).

export type Indicator = "WFA" | "LHFA" | "WFH" | "HCFA";
export type Tone = "red" | "amber" | "emerald" | "blue";
export type MeasureMethod = "LENGTH" | "HEIGHT"; // telentang (PB) / berdiri (TB)

export interface IndicatorResult {
  z: number;
  status: string;
  label: string;
  tone: Tone;
  flagged: boolean; // needs follow-up by kader / bidan
}

export interface Assessment {
  ageDays: number;
  ageMonths: number;
  wfa?: IndicatorResult;
  lhfa?: IndicatorResult;
  wfh?: IndicatorResult;
  hcfa?: IndicatorResult;
}

const lerp = (a: LMS, b: LMS, t: number): LMS => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export function lmsAtAge(table: Record<Sex, LMS[]>, sex: Sex, days: number): LMS | null {
  if (days < 0 || days > AGE_MAX_DAYS) return null;
  const rows = table[sex];
  const lastIdx = rows.length - 1;
  const lastFullDay = (lastIdx - 1) * AGE_STEP_DAYS; // the final row is AGE_MAX_DAYS, not a full step
  if (days >= lastFullDay) {
    const t = (days - lastFullDay) / (AGE_MAX_DAYS - lastFullDay);
    return lerp(rows[lastIdx - 1], rows[lastIdx], t);
  }
  const i = Math.floor(days / AGE_STEP_DAYS);
  return lerp(rows[i], rows[i + 1], (days - i * AGE_STEP_DAYS) / AGE_STEP_DAYS);
}

export function lmsAtLength(table: Record<Sex, LMS[]>, sex: Sex, cm: number, range: readonly [number, number]): LMS | null {
  if (cm < range[0] || cm > range[1]) return null;
  const pos = (cm - range[0]) / LEN_STEP_CM;
  const i = Math.min(Math.floor(pos), table[sex].length - 2);
  return lerp(table[sex][i], table[sex][i + 1], pos - i);
}

export function valueAtZ([l, m, s]: LMS, z: number) {
  return l === 0 ? m * Math.exp(s * z) : m * Math.pow(1 + l * s * z, 1 / l);
}

// WHO "restricted application" of the LMS method for weight-based indicators beyond ±3 SD.
export function zScore(x: number, lms: LMS, adjustTails: boolean) {
  const [l, m, s] = lms;
  const z = l === 0 ? Math.log(x / m) / s : (Math.pow(x / m, l) - 1) / (l * s);
  if (!adjustTails || Math.abs(z) <= 3) return z;
  if (z > 3) {
    const sd3 = valueAtZ(lms, 3);
    return 3 + (x - sd3) / (sd3 - valueAtZ(lms, 2));
  }
  const sd3n = valueAtZ(lms, -3);
  return -3 + (x - sd3n) / (valueAtZ(lms, -2) - sd3n);
}

// WHO flags for biologically implausible values: almost always a measuring / typing mistake.
const BIV: Record<Indicator, [number, number]> = { WFA: [-6, 5], LHFA: [-6, 6], WFH: [-5, 5], HCFA: [-5, 5] };

function implausible(indicator: Indicator, z: number): IndicatorResult | null {
  const [lo, hi] = BIV[indicator];
  if (z >= lo && z <= hi) return null;
  return { z, status: "TIDAK_WAJAR", label: "Nilai tidak wajar, ukur ulang", tone: "red", flagged: true };
}

function classifyWFA(z: number): IndicatorResult {
  if (z < -3) return { z, status: "SANGAT_KURANG", label: "Berat badan sangat kurang", tone: "red", flagged: true };
  if (z < -2) return { z, status: "KURANG", label: "Berat badan kurang", tone: "amber", flagged: true };
  if (z <= 1) return { z, status: "NORMAL", label: "Berat badan normal", tone: "emerald", flagged: false };
  return { z, status: "RISIKO_LEBIH", label: "Risiko berat badan lebih", tone: "blue", flagged: false };
}

function classifyLHFA(z: number, method: MeasureMethod): IndicatorResult {
  const unit = method === "LENGTH" ? "Panjang" : "Tinggi";
  if (z < -3) return { z, status: "SANGAT_PENDEK", label: "Sangat pendek (severely stunted)", tone: "red", flagged: true };
  if (z < -2) return { z, status: "PENDEK", label: "Pendek (stunted)", tone: "amber", flagged: true };
  if (z <= 3) return { z, status: "NORMAL", label: `${unit} badan normal`, tone: "emerald", flagged: false };
  return { z, status: "TINGGI", label: "Tinggi", tone: "blue", flagged: false };
}

function classifyWFH(z: number): IndicatorResult {
  if (z < -3) return { z, status: "GIZI_BURUK", label: "Gizi buruk (severely wasted)", tone: "red", flagged: true };
  if (z < -2) return { z, status: "GIZI_KURANG", label: "Gizi kurang (wasted)", tone: "amber", flagged: true };
  if (z <= 1) return { z, status: "GIZI_BAIK", label: "Gizi baik (normal)", tone: "emerald", flagged: false };
  if (z <= 2) return { z, status: "BERISIKO_GIZI_LEBIH", label: "Berisiko gizi lebih", tone: "blue", flagged: false };
  if (z <= 3) return { z, status: "GIZI_LEBIH", label: "Gizi lebih (overweight)", tone: "amber", flagged: true };
  return { z, status: "OBESITAS", label: "Obesitas", tone: "red", flagged: true };
}

function classifyHCFA(z: number): IndicatorResult {
  if (z < -2) return { z, status: "MIKROSEFALI", label: "Lingkar kepala di bawah normal (mikrosefali)", tone: "amber", flagged: true };
  if (z > 2) return { z, status: "MAKROSEFALI", label: "Lingkar kepala di atas normal (makrosefali)", tone: "amber", flagged: true };
  return { z, status: "NORMAL", label: "Lingkar kepala normal", tone: "emerald", flagged: false };
}

export function ageInDays(birthDate: string, at: string | Date) {
  const b = new Date(`${birthDate.slice(0, 10)}T00:00:00Z`).getTime();
  const d = typeof at === "string" ? new Date(`${at.slice(0, 10)}T00:00:00Z`).getTime() : Date.UTC(at.getFullYear(), at.getMonth(), at.getDate());
  return Math.round((d - b) / 86_400_000);
}

export const daysToMonths = (days: number) => Math.floor(days / 30.4375);

export function assess(input: {
  sex: Sex;
  birthDate: string;
  measuredAt: string | Date;
  weightKg?: number | null;
  heightCm?: number | null;
  headCm?: number | null;
  method?: MeasureMethod | null;
}): Assessment | null {
  const ageDays = ageInDays(input.birthDate, input.measuredAt);
  if (ageDays < 0 || ageDays > AGE_MAX_DAYS) return null;
  const method: MeasureMethod = input.method ?? (ageDays < 731 ? "LENGTH" : "HEIGHT");
  const out: Assessment = { ageDays, ageMonths: daysToMonths(ageDays) };

  if (input.weightKg) {
    const lms = lmsAtAge(WFA, input.sex, ageDays);
    if (lms) {
      const z = zScore(input.weightKg, lms, true);
      out.wfa = implausible("WFA", z) ?? classifyWFA(z);
    }
  }

  if (input.heightCm) {
    // WHO: under 2 years measure lying down; standing measurements get +0.7 cm (and vice versa).
    let lh = input.heightCm;
    if (ageDays < 731 && method === "HEIGHT") lh += 0.7;
    if (ageDays >= 731 && method === "LENGTH") lh -= 0.7;
    const lms = lmsAtAge(LHFA, input.sex, ageDays);
    if (lms) {
      const z = zScore(lh, lms, false);
      out.lhfa = implausible("LHFA", z) ?? classifyLHFA(z, ageDays < 731 ? "LENGTH" : "HEIGHT");
    }

    if (input.weightKg) {
      const w = ageDays < 731 ? lmsAtLength(WFL, input.sex, lh, WFL_RANGE) : lmsAtLength(WFH, input.sex, lh, WFH_RANGE);
      if (w) {
        const z = zScore(input.weightKg, w, true);
        out.wfh = implausible("WFH", z) ?? classifyWFH(z);
      }
    }
  }

  if (input.headCm) {
    const lms = lmsAtAge(HCFA, input.sex, ageDays);
    if (lms) {
      const z = zScore(input.headCm, lms, false);
      out.hcfa = implausible("HCFA", z) ?? classifyHCFA(z);
    }
  }
  return out;
}

// Kenaikan Berat Minimal (KBM) per bulan, Permenkes 155/2010 (KMS): grams by age in months.
export function kbmGrams(ageMonths: number) {
  const table = [800, 800, 900, 800, 600, 500, 400, 400, 300, 300, 300, 200];
  return ageMonths < table.length ? table[Math.max(0, ageMonths)] : 200;
}

export type GrowthTrend = "N" | "T" | "B" | "O"; // Naik, Tidak naik, Baru (first visit), O = tidak ditimbang bulan lalu

// N/T compares a weighing with the previous one ~1 month earlier (KMS convention).
export function weightTrend(prev: { measuredAt: string; weightKg: number } | null, curr: { measuredAt: string; weightKg: number }, ageMonths: number): GrowthTrend {
  if (!prev) return "B";
  const gapDays = (new Date(curr.measuredAt).getTime() - new Date(prev.measuredAt).getTime()) / 86_400_000;
  if (gapDays < 20) return "B";
  if (gapDays > 45) return "O";
  return (curr.weightKg - prev.weightKg) * 1000 >= kbmGrams(ageMonths) ? "N" : "T";
}

// Curves for the KMS chart: value at z = -3, -2, 0, +2, +3 by month.
export function ageCurves(indicator: "WFA" | "LHFA" | "HCFA", sex: Sex, maxMonths = 60) {
  const table = indicator === "WFA" ? WFA : indicator === "LHFA" ? LHFA : HCFA;
  const zs = [-3, -2, 0, 2, 3] as const;
  return Array.from({ length: maxMonths + 1 }, (_, m) => {
    const lms = lmsAtAge(table, sex, Math.min(AGE_MAX_DAYS, Math.round(m * 30.4375)))!;
    return { month: m, values: zs.map((z) => valueAtZ(lms, z)) };
  });
}

export const TONE_CLASS: Record<Tone, string> = {
  red: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
  amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  blue: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
};
