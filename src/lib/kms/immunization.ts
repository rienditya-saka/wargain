// Jadwal imunisasi rutin lengkap bayi & baduta (Program Imunisasi Nasional, Kemenkes RI,
// termasuk PCV, Rotavirus dan IPV-2 yang masuk program nasional 2022–2023).
// Dosis per usia sasaran; "late" = batas usia setelah itu dianggap terlambat (masih bisa dikejar).
// Selalu konfirmasi ke bidan / puskesmas: jadwal daerah bisa berbeda (mis. JE di daerah endemis).

export interface Vaccine {
  code: string;
  name: string;
  short: string;
  dueDays: number; // target age in days
  lateDays: number; // considered overdue after this age
  group: string;
}

const M = 30.4375;
const month = (m: number) => Math.round(m * M);

export const IMMUNIZATION_SCHEDULE: Vaccine[] = [
  { code: "HB0", name: "Hepatitis B (HB-0)", short: "HB-0", dueDays: 0, lateDays: 7, group: "Lahir" },
  { code: "BCG", name: "BCG", short: "BCG", dueDays: month(1), lateDays: month(2), group: "1 bulan" },
  { code: "OPV1", name: "Polio tetes 1 (bOPV)", short: "Polio 1", dueDays: month(1), lateDays: month(2), group: "1 bulan" },
  { code: "DPT1", name: "DPT-HB-Hib 1", short: "DPT-HB-Hib 1", dueDays: month(2), lateDays: month(3), group: "2 bulan" },
  { code: "OPV2", name: "Polio tetes 2 (bOPV)", short: "Polio 2", dueDays: month(2), lateDays: month(3), group: "2 bulan" },
  { code: "PCV1", name: "PCV 1 (pneumokokus)", short: "PCV 1", dueDays: month(2), lateDays: month(3), group: "2 bulan" },
  { code: "RV1", name: "Rotavirus 1", short: "Rotavirus 1", dueDays: month(2), lateDays: month(3), group: "2 bulan" },
  { code: "DPT2", name: "DPT-HB-Hib 2", short: "DPT-HB-Hib 2", dueDays: month(3), lateDays: month(4), group: "3 bulan" },
  { code: "OPV3", name: "Polio tetes 3 (bOPV)", short: "Polio 3", dueDays: month(3), lateDays: month(4), group: "3 bulan" },
  { code: "PCV2", name: "PCV 2 (pneumokokus)", short: "PCV 2", dueDays: month(3), lateDays: month(4), group: "3 bulan" },
  { code: "RV2", name: "Rotavirus 2", short: "Rotavirus 2", dueDays: month(3), lateDays: month(4), group: "3 bulan" },
  { code: "DPT3", name: "DPT-HB-Hib 3", short: "DPT-HB-Hib 3", dueDays: month(4), lateDays: month(5), group: "4 bulan" },
  { code: "OPV4", name: "Polio tetes 4 (bOPV)", short: "Polio 4", dueDays: month(4), lateDays: month(5), group: "4 bulan" },
  { code: "IPV1", name: "Polio suntik 1 (IPV)", short: "IPV 1", dueDays: month(4), lateDays: month(5), group: "4 bulan" },
  { code: "RV3", name: "Rotavirus 3", short: "Rotavirus 3", dueDays: month(4), lateDays: month(5), group: "4 bulan" },
  { code: "MR1", name: "Campak-Rubella (MR) 1", short: "MR 1", dueDays: month(9), lateDays: month(12), group: "9 bulan" },
  { code: "IPV2", name: "Polio suntik 2 (IPV)", short: "IPV 2", dueDays: month(9), lateDays: month(12), group: "9 bulan" },
  { code: "PCV3", name: "PCV 3 (booster)", short: "PCV 3", dueDays: month(12), lateDays: month(15), group: "12 bulan" },
  { code: "DPT4", name: "DPT-HB-Hib lanjutan", short: "DPT-HB-Hib 4", dueDays: month(18), lateDays: month(24), group: "18 bulan" },
  { code: "MR2", name: "Campak-Rubella (MR) lanjutan", short: "MR 2", dueDays: month(18), lateDays: month(24), group: "18 bulan" },
];

export const VACCINE_BY_CODE = new Map(IMMUNIZATION_SCHEDULE.map((v) => [v.code, v]));

export type DoseStatus = "SUDAH" | "TERLAMBAT" | "JATUH_TEMPO" | "SEGERA" | "BELUM_WAKTUNYA";

export interface DoseState {
  vaccine: Vaccine;
  status: DoseStatus;
  givenAt?: string;
  dueDate: string;
}

const UPCOMING_WINDOW_DAYS = 30;

export function immunizationStatus(birthDate: string, given: { vaccineCode: string; givenAt: string }[], today = new Date()): DoseState[] {
  const birth = new Date(`${birthDate.slice(0, 10)}T00:00:00Z`);
  const ageDays = Math.floor((today.getTime() - birth.getTime()) / 86_400_000);
  const givenBy = new Map(given.map((g) => [g.vaccineCode, g.givenAt]));
  return IMMUNIZATION_SCHEDULE.map((v) => {
    const dueDate = new Date(birth.getTime() + v.dueDays * 86_400_000).toISOString().slice(0, 10);
    const givenAt = givenBy.get(v.code);
    let status: DoseStatus;
    if (givenAt) status = "SUDAH";
    else if (ageDays > v.lateDays) status = "TERLAMBAT";
    else if (ageDays >= v.dueDays) status = "JATUH_TEMPO";
    else if (v.dueDays - ageDays <= UPCOMING_WINDOW_DAYS) status = "SEGERA";
    else status = "BELUM_WAKTUNYA";
    return { vaccine: v, status, givenAt, dueDate };
  });
}

export function immunizationSummary(states: DoseState[]) {
  const due = states.filter((s) => s.status === "JATUH_TEMPO" || s.status === "SEGERA");
  const late = states.filter((s) => s.status === "TERLAMBAT");
  const done = states.filter((s) => s.status === "SUDAH").length;
  const eligible = states.filter((s) => s.status !== "BELUM_WAKTUNYA" && s.status !== "SEGERA").length;
  // "Imunisasi Dasar Lengkap" (IDL): all doses due before 12 months done.
  const basic = states.filter((s) => s.vaccine.dueDays < Math.round(12 * 30.4375));
  const idl = basic.every((s) => s.status === "SUDAH");
  return { due, late, done, eligible, total: states.length, idl };
}

// Best-effort mapping of free-text entries (old posyandu records) to schedule codes.
export function parseVaccineText(text: string): string[] {
  const t = text.toUpperCase().replace(/\s+/g, " ");
  const codes = new Set<string>();
  const add = (re: RegExp, code: string) => re.test(t) && codes.add(code);
  add(/HB[\s-]?0/, "HB0");
  add(/BCG/, "BCG");
  add(/(CAMPAK|MR)[^0-9]*(2|LANJUT)/, "MR2");
  if (!codes.has("MR2")) add(/CAMPAK|RUBELLA|\bMR\b/, "MR1");
  const dpt = t.match(/DPT[^0-9]*(\d)/);
  if (dpt) codes.add(`DPT${dpt[1]}`);
  const pcv = t.match(/PCV[^0-9]*(\d)/);
  if (pcv) codes.add(`PCV${pcv[1]}`);
  const ipv = t.match(/IPV[^0-9]*(\d)?/);
  if (ipv) codes.add(`IPV${ipv[1] ?? 1}`);
  const opv = t.match(/(POLIO|OPV)[^0-9]*(\d)/);
  if (opv && !/IPV|SUNTIK/.test(t)) codes.add(`OPV${opv[2]}`);
  const rv = t.match(/ROTA[^0-9]*(\d)/);
  if (rv) codes.add(`RV${rv[1]}`);
  return Array.from(codes).filter((c) => VACCINE_BY_CODE.has(c));
}
