import { supabaseAdmin } from "@/lib/supabase-admin";
import { CommunityContext, houseKeyOf, loadCommunityContext } from "@/lib/community/context";
import { notify } from "@/lib/notifications/server";
import { PENGURUS_ROLES } from "@/lib/notifications/registry";
import { assess, ageInDays, daysToMonths, weightTrend } from "./zscore";
import { VACCINE_BY_CODE, immunizationStatus, immunizationSummary, parseVaccineText } from "./immunization";
import type { ChildKms, GrowthMeasurement, ImmunizationRecord, KmsDashboard, MeasurementPoint } from "./types";

const BALITA_MAX_DAYS = 1826;
const jakartaDate = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));

function buildChild(
  citizen: ChildKms["citizen"],
  rows: GrowthMeasurement[],
  imms: ImmunizationRecord[],
  today = new Date()
): ChildKms {
  const sex = citizen.gender === "P" ? 2 : 1;
  const sorted = [...rows].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  const points: MeasurementPoint[] = [];
  let prevWeighed: MeasurementPoint | null = null;
  for (const r of sorted) {
    const m: MeasurementPoint = {
      ...r,
      weightKg: num(r.weightKg),
      heightCm: num(r.heightCm),
      headCm: num(r.headCm),
      armCm: num(r.armCm),
      assessment: assess({ sex, birthDate: citizen.birthDate, measuredAt: r.measuredAt, weightKg: num(r.weightKg), heightCm: num(r.heightCm), headCm: num(r.headCm), method: r.method ?? null }),
    };
    if (m.weightKg) {
      m.trend = weightTrend(
        prevWeighed ? { measuredAt: prevWeighed.measuredAt, weightKg: prevWeighed.weightKg! } : null,
        { measuredAt: m.measuredAt, weightKg: m.weightKg },
        m.assessment?.ageMonths ?? 0
      );
      prevWeighed = m;
    }
    points.push(m);
  }

  const latest = points[points.length - 1] ?? null;
  const weighed = points.filter((p) => p.weightKg);
  const twoT = weighed.length >= 2 && weighed.slice(-2).every((p) => p.trend === "T");
  const flags: string[] = [];
  const a = latest?.assessment;
  if (a?.wfa?.flagged) flags.push(a.wfa.label);
  if (a?.lhfa?.flagged) flags.push(a.lhfa.label);
  if (a?.wfh?.flagged) flags.push(a.wfh.label);
  if (a?.hcfa?.flagged) flags.push(a.hcfa.label);
  if (twoT) flags.push("Berat badan 2x berturut-turut tidak naik (2T)");

  const doses = immunizationStatus(citizen.birthDate, imms, today);
  const summary = immunizationSummary(doses);
  const month = jakartaDate(today).slice(0, 7);
  const ageDays = ageInDays(citizen.birthDate, jakartaDate(today));

  return {
    citizen,
    ageDays,
    ageMonths: daysToMonths(ageDays),
    measurements: points,
    latest,
    flags,
    twoT,
    weighedThisMonth: weighed.some((p) => p.measuredAt.slice(0, 7) === month),
    immunizations: imms,
    doses,
    immunization: {
      done: summary.done,
      total: summary.total,
      lateCodes: summary.late.map((d) => d.vaccine.code),
      dueCodes: summary.due.map((d) => d.vaccine.code),
      idl: summary.idl,
    },
  };
}

export async function loadChildren(communityId: string, filter?: (c: ChildKms["citizen"]) => boolean, ctx?: CommunityContext) {
  const context = ctx ?? (await loadCommunityContext(communityId));
  const today = jakartaDate();
  const kids = context.citizens
    .filter((c) => c.birthDate && ageInDays(c.birthDate, today) >= 0 && ageInDays(c.birthDate, today) <= BALITA_MAX_DAYS)
    .map((c) => ({ id: c.id, fullName: c.fullName, gender: c.gender, birthDate: c.birthDate!, houseBlock: c.houseBlock, houseId: c.houseId }))
    .filter((c) => !filter || filter(c));
  if (!kids.length) return [];

  const ids = kids.map((k) => k.id);
  const [{ data: gm }, { data: im }] = await Promise.all([
    supabaseAdmin.from("growth_measurements").select("*").in("citizenId", ids).order("measuredAt"),
    supabaseAdmin.from("immunization_records").select("*").in("citizenId", ids),
  ]);
  const byChild = <T extends { citizenId: string }>(rows: T[] | null) => {
    const m = new Map<string, T[]>();
    (rows ?? []).forEach((r) => m.set(r.citizenId, [...(m.get(r.citizenId) ?? []), r]));
    return m;
  };
  const gmBy = byChild(gm as GrowthMeasurement[]);
  const imBy = byChild(im as ImmunizationRecord[]);
  return kids
    .map((k) => buildChild(k, gmBy.get(k.id) ?? [], imBy.get(k.id) ?? []))
    .sort((a, b) => (a.citizen.houseBlock ?? "").localeCompare(b.citizen.houseBlock ?? "", "id", { numeric: true }) || a.ageDays - b.ageDays);
}

export async function loadHouseholdChildren(communityId: string, userId: string) {
  const ctx = await loadCommunityContext(communityId);
  const me = ctx.users.find((u) => u.id === userId);
  if (!me?.houseKey) return [];
  return loadChildren(communityId, (c) => houseKeyOf(c) === me.houseKey, ctx);
}

export async function buildDashboard(communityId: string): Promise<KmsDashboard> {
  const children = await loadChildren(communityId);
  const month = jakartaDate().slice(0, 7);
  const thisMonth = (c: ChildKms) => c.measurements.filter((m) => m.weightKg && m.measuredAt.slice(0, 7) === month).pop();
  const skdn = { S: children.length, K: 0, D: 0, N: 0, T: 0, O: 0, B: 0 };
  children.forEach((c) => {
    if (c.measurements.length) skdn.K++;
    const m = thisMonth(c);
    if (!m) return;
    skdn.D++;
    if (m.trend === "N") skdn.N++;
    else if (m.trend === "T") skdn.T++;
    else if (m.trend === "O") skdn.O++;
    else skdn.B++;
  });
  const latest = (c: ChildKms) => c.latest?.assessment;
  const eligibleIdl = children.filter((c) => c.ageMonths >= 12);
  return {
    month,
    skdn,
    counts: {
      stunting: children.filter((c) => latest(c)?.lhfa?.flagged && latest(c)!.lhfa!.z < -2).length,
      underweight: children.filter((c) => latest(c)?.wfa && latest(c)!.wfa!.z < -2).length,
      wasting: children.filter((c) => latest(c)?.wfh && latest(c)!.wfh!.z < -2).length,
      twoT: children.filter((c) => c.twoT).length,
      immunizationLate: children.filter((c) => c.immunization.lateCodes.length > 0).length,
      idl: eligibleIdl.filter((c) => c.immunization.idl).length,
      eligibleIdl: eligibleIdl.length,
    },
    children,
  };
}

// Posyandu result -> KMS record (+ vaccines) and a heads-up to pengurus when the child needs follow-up.
export async function recordPosyanduResult(reg: {
  id: string;
  communityId: string;
  citizenId: string | null;
  participantName: string;
  checkInAt?: string | null;
  measurements: Record<string, any>;
}, eventStartAt: string, recordedBy?: string | null) {
  if (!reg.citizenId) return null;
  const m = reg.measurements ?? {};
  const measuredAt = jakartaDate(new Date(reg.checkInAt ?? eventStartAt));
  const row = {
    id: `gm_${reg.id}`,
    communityId: reg.communityId,
    citizenId: reg.citizenId,
    measuredAt,
    weightKg: num(m.beratKg),
    heightCm: num(m.tinggiCm),
    headCm: num(m.lingkarKepalaCm),
    armCm: num(m.lingkarLenganCm),
    method: m.caraUkur ?? null,
    vitaminA: !!m.vitaminA,
    source: "POSYANDU",
    registrationId: reg.id,
    recordedBy: recordedBy ?? null,
    notes: m.catatan ?? null,
    updatedAt: new Date().toISOString(),
  };
  if (row.weightKg || row.heightCm || row.headCm) {
    const { error } = await supabaseAdmin.from("growth_measurements").upsert(row, { onConflict: "id" });
    if (error) console.error("recordPosyanduResult growth:", error.message);
  }

  const codes = new Set<string>([...(Array.isArray(m.vaksin) ? m.vaksin : []), ...(m.imunisasi ? parseVaccineText(String(m.imunisasi)) : [])]);
  const vaccines = Array.from(codes).filter((c) => VACCINE_BY_CODE.has(c));
  if (vaccines.length) {
    await supabaseAdmin.from("immunization_records").upsert(
      vaccines.map((code) => ({
        id: `imun_${reg.citizenId}_${code}`,
        communityId: reg.communityId,
        citizenId: reg.citizenId,
        vaccineCode: code,
        givenAt: measuredAt,
        place: "Posyandu",
        registrationId: reg.id,
        recordedBy: recordedBy ?? null,
      })),
      { onConflict: "citizenId,vaccineCode", ignoreDuplicates: true }
    );
  }

  const [child] = await loadChildren(reg.communityId, (c) => c.id === reg.citizenId);
  if (child?.flags.length) {
    await notify({
      communityId: reg.communityId,
      type: "KMS_GROWTH_ALERT",
      entity: { type: "CHILD", id: child.citizen.id },
      title: `⚠️ Perlu tindak lanjut: ${child.citizen.fullName} (${child.ageMonths} bln, ${child.citizen.houseBlock ?? "-"})`,
      body: `${child.flags.join(" · ")}. Jadwalkan kunjungan rumah / rujuk ke bidan puskesmas.`,
      link: "/sosial?tab=posyandu",
      target: { roles: PENGURUS_ROLES },
      dedupeKey: `kms-alert:${child.citizen.id}:${measuredAt}`,
    });
  }
  return child ?? null;
}
