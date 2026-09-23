"use client";

import * as React from "react";
import { HeartPulse } from "lucide-react";
import { CATEGORY_META, HouseholdMember, Measurements, SocialEvent, SocialRegistration, ageInMonths } from "@/lib/sosial/types";

interface Visit {
  reg: SocialRegistration;
  event?: SocialEvent;
  date: string;
}

function Sparkline({ values, tone = "stroke-emerald-500" }: { values: number[]; tone?: string }) {
  if (values.length < 2) return null;
  const w = 120;
  const h = 36;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 4 - ((v - min) / span) * (h - 8)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-28 h-9" aria-hidden>
      <polyline points={pts} fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={tone} />
      {values.map((v, i) => (
        <circle key={i} cx={(i / (values.length - 1)) * w} cy={h - 4 - ((v - min) / span) * (h - 8)} r="2.5" className="fill-white stroke-emerald-600" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

function summary(m: Measurements) {
  return [
    m.beratKg != null && `BB ${m.beratKg} kg`,
    m.tinggiCm != null && `TB ${m.tinggiCm} cm`,
    m.lingkarKepalaCm != null && `LK ${m.lingkarKepalaCm} cm`,
    m.lingkarLenganCm != null && `LiLA ${m.lingkarLenganCm} cm`,
    m.tensi && `Tensi ${m.tensi}`,
    m.gulaDarah != null && `Gula ${m.gulaDarah}`,
    m.kolesterol != null && `Kol ${m.kolesterol}`,
    m.asamUrat != null && `AU ${m.asamUrat}`,
    m.imunisasi && `💉 ${m.imunisasi}`,
    m.vitaminA && "Vit A ✓",
  ].filter(Boolean) as string[];
}

// Simple flag for adult blood pressure; not a diagnosis, just a nudge to follow up.
function tensiFlag(tensi?: string) {
  if (!tensi) return null;
  const [sys, dia] = tensi.split("/").map(Number);
  if (!sys || !dia) return null;
  if (sys >= 140 || dia >= 90) return { label: "Tensi tinggi", tone: "bg-red-500/10 text-red-600" };
  if (sys < 90 || dia < 60) return { label: "Tensi rendah", tone: "bg-amber-500/10 text-amber-700" };
  return { label: "Tensi normal", tone: "bg-emerald-500/10 text-emerald-700" };
}

export function HealthHistory({
  household,
  registrations,
  events,
}: {
  household: HouseholdMember[];
  registrations: SocialRegistration[];
  events: SocialEvent[];
}) {
  const eventById = new Map(events.map((e) => [e.id, e]));
  const visitsByMember = new Map<string, Visit[]>();
  registrations
    .filter((r) => r.citizenId && Object.keys(r.measurements ?? {}).length > 0)
    .forEach((r) => {
      const event = eventById.get(r.eventId);
      const list = visitsByMember.get(r.citizenId!) ?? [];
      list.push({ reg: r, event, date: event?.startAt ?? r.checkInAt ?? r.updatedAt });
      visitsByMember.set(r.citizenId!, list);
    });
  visitsByMember.forEach((v) => v.sort((a, b) => a.date.localeCompare(b.date)));

  const members = household.filter((m) => visitsByMember.has(m.id) || ageInMonths(m.birthDate, m.age) < 60 || m.age >= 60);

  if (members.length === 0) {
    return (
      <div className="text-center text-xs text-slate-500 py-10 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
        Belum ada riwayat posyandu di keluarga Anda.
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {members.map((m) => {
        const visits = visitsByMember.get(m.id) ?? [];
        const latest = visits[visits.length - 1];
        const weights = visits.map((v) => v.reg.measurements.beratKg).filter((x): x is number => typeof x === "number");
        const months = ageInMonths(m.birthDate, m.age);
        const isBalita = months < 60;
        const flag = !isBalita ? tensiFlag(latest?.reg.measurements.tensi) : null;
        return (
          <li key={m.id} className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${isBalita ? "bg-pink-500/10" : "bg-amber-500/10"}`}>
                  {isBalita ? "👶" : "👵"}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold truncate">{m.fullName}</p>
                  <p className="text-[11px] text-slate-500">{isBalita ? `${months} bulan` : `${m.age} tahun`} · {visits.length} kunjungan</p>
                </div>
              </div>
              <Sparkline values={weights} />
            </div>

            {latest ? (
              <div className="rounded-xl bg-neutral-50 dark:bg-[#0B130E] p-3 space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase">
                  Terakhir · {new Date(latest.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {summary(latest.reg.measurements).map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded-full bg-white dark:bg-neutral-800 text-[11px] font-bold">{s}</span>
                  ))}
                  {flag && <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${flag.tone}`}>{flag.label}</span>}
                </div>
                {latest.reg.measurements.catatan && <p className="text-[11px] text-slate-600 dark:text-slate-300">📝 {latest.reg.measurements.catatan}</p>}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <HeartPulse className="w-3.5 h-3.5" /> Belum ada hasil. Datang ke {isBalita ? "Posyandu Balita" : "Posyandu Lansia"} berikutnya.
              </p>
            )}

            {visits.length > 1 && (
              <details className="text-[11px]">
                <summary className="cursor-pointer font-bold text-emerald-700 dark:text-emerald-400">Riwayat lengkap</summary>
                <ul className="mt-2 space-y-1">
                  {[...visits].reverse().map((v) => (
                    <li key={v.reg.id} className="flex gap-2">
                      <span className="text-slate-500 shrink-0 w-20">{new Date(v.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" })}</span>
                      <span className="min-w-0">{CATEGORY_META[v.event?.category ?? "LAINNYA"]?.emoji} {summary(v.reg.measurements).join(" · ")}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </li>
        );
      })}
    </ul>
  );
}
