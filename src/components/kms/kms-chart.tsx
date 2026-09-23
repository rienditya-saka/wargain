"use client";

import * as React from "react";
import { ageCurves } from "@/lib/kms/zscore";
import type { MeasurementPoint } from "@/lib/kms/types";

type Kind = "WFA" | "LHFA" | "HCFA";
const UNIT: Record<Kind, string> = { WFA: "kg", LHFA: "cm", HCFA: "cm" };

// KMS-style chart: WHO z-score bands (like the Buku KIA) with the child's points on top.
export function KmsChart({ kind, sex, points, ageMonthsNow }: { kind: Kind; sex: 1 | 2; points: MeasurementPoint[]; ageMonthsNow: number }) {
  const maxX = Math.min(60, Math.max(12, Math.ceil((ageMonthsNow + 4) / 6) * 6));
  const curves = React.useMemo(() => ageCurves(kind, sex, maxX), [kind, sex, maxX]);
  const series = points
    .map((p) => ({
      month: (p.assessment?.ageDays ?? 0) / 30.4375,
      value: kind === "WFA" ? p.weightKg : kind === "LHFA" ? p.heightCm : p.headCm,
      trend: p.trend,
      date: p.measuredAt,
    }))
    .filter((p): p is { month: number; value: number; trend: MeasurementPoint["trend"]; date: string } => typeof p.value === "number" && p.month <= maxX);

  const W = 340;
  const H = 220;
  const pad = { l: 30, r: 8, t: 8, b: 22 };
  const allY = curves.flatMap((c) => [c.values[0], c.values[4]]).concat(series.map((s) => s.value));
  const yMin = Math.floor(Math.min(...allY) * 0.95);
  const yMax = Math.ceil(Math.max(...allY) * 1.03);
  const x = (m: number) => pad.l + (m / maxX) * (W - pad.l - pad.r);
  const y = (v: number) => H - pad.b - ((v - yMin) / (yMax - yMin)) * (H - pad.t - pad.b);
  const line = (i: number) => curves.map((c) => `${x(c.month)},${y(c.values[i])}`).join(" ");
  const band = (lo: number, hi: number) =>
    `${curves.map((c) => `${x(c.month)},${y(c.values[hi])}`).join(" ")} ${[...curves].reverse().map((c) => `${x(c.month)},${y(c.values[lo])}`).join(" ")}`;
  const lowEdge = curves.map((c) => `${x(c.month)},${y(c.values[0])}`).join(" ");
  const highEdge = curves.map((c) => `${x(c.month)},${y(c.values[4])}`).join(" ");
  const yTicks = Array.from({ length: 5 }, (_, i) => yMin + ((yMax - yMin) * i) / 4);
  const xTicks = Array.from({ length: maxX / 6 + 1 }, (_, i) => i * 6);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Grafik ${kind === "WFA" ? "berat" : kind === "LHFA" ? "tinggi" : "lingkar kepala"} menurut umur`}>
      {/* bands: < -3 red, -3..-2 amber, -2..+2 green, +2..+3 amber, > +3 red */}
      <polygon points={`${lowEdge} ${x(maxX)},${y(yMin)} ${x(0)},${y(yMin)}`} className="fill-red-500/15" />
      <polygon points={band(0, 1)} className="fill-amber-400/25" />
      <polygon points={band(1, 3)} className="fill-emerald-500/20" />
      <polygon points={band(3, 4)} className="fill-amber-400/25" />
      <polygon points={`${highEdge} ${x(maxX)},${y(yMax)} ${x(0)},${y(yMax)}`} className="fill-red-500/10" />
      {[0, 1, 3, 4].map((i) => (
        <polyline key={i} points={line(i)} fill="none" strokeWidth="0.8" className={i === 0 || i === 4 ? "stroke-red-500/60" : "stroke-amber-500/70"} />
      ))}
      <polyline points={line(2)} fill="none" strokeWidth="1.2" strokeDasharray="4 3" className="stroke-emerald-700/70" />

      {yTicks.map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className="stroke-slate-400/15" />
          <text x={pad.l - 4} y={y(v) + 3} textAnchor="end" className="fill-slate-500 text-[8px]">{Math.round(v)}</text>
        </g>
      ))}
      {xTicks.map((m) => (
        <text key={m} x={x(m)} y={H - 8} textAnchor="middle" className="fill-slate-500 text-[8px]">{m}</text>
      ))}
      <text x={W - pad.r} y={H - 1} textAnchor="end" className="fill-slate-400 text-[7px]">umur (bulan)</text>
      <text x={2} y={pad.t + 4} className="fill-slate-400 text-[7px]">{UNIT[kind]}</text>
      <line x1={x(ageMonthsNow)} x2={x(ageMonthsNow)} y1={pad.t} y2={H - pad.b} strokeDasharray="2 2" className="stroke-slate-500/40" />

      {series.length > 1 && <polyline points={series.map((s) => `${x(s.month)},${y(s.value)}`).join(" ")} fill="none" strokeWidth="2" className="stroke-slate-800 dark:stroke-white" />}
      {series.map((s) => (
        <circle key={s.date} cx={x(s.month)} cy={y(s.value)} r="3.2" strokeWidth="1.5" className={`${s.trend === "T" ? "fill-red-500" : "fill-emerald-600"} stroke-white dark:stroke-slate-900`}>
          <title>{`${new Date(s.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}: ${s.value} ${UNIT[kind]}${s.trend ? ` (${s.trend})` : ""}`}</title>
        </circle>
      ))}
    </svg>
  );
}
