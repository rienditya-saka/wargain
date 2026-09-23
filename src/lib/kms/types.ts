import type { Assessment, GrowthTrend, MeasureMethod } from "./zscore";
import type { DoseState } from "./immunization";

export interface GrowthMeasurement {
  id: string;
  citizenId: string;
  measuredAt: string;
  weightKg?: number | null;
  heightCm?: number | null;
  headCm?: number | null;
  armCm?: number | null;
  method?: MeasureMethod | null;
  vitaminA?: boolean;
  source: string;
  notes?: string | null;
}

export interface MeasurementPoint extends GrowthMeasurement {
  assessment: Assessment | null;
  trend?: GrowthTrend;
}

export interface ImmunizationRecord {
  id: string;
  citizenId: string;
  vaccineCode: string;
  givenAt: string;
  place?: string | null;
}

export interface ChildKms {
  citizen: { id: string; fullName: string; gender: string; birthDate: string; houseBlock: string | null; houseId: string | null };
  ageDays: number;
  ageMonths: number;
  measurements: MeasurementPoint[];
  latest: MeasurementPoint | null;
  flags: string[]; // human-readable problems needing follow-up
  twoT: boolean; // two consecutive "tidak naik"
  weighedThisMonth: boolean;
  immunizations: ImmunizationRecord[];
  doses: DoseState[];
  immunization: { done: number; total: number; lateCodes: string[]; dueCodes: string[]; idl: boolean };
}

export interface KmsDashboard {
  month: string;
  skdn: { S: number; K: number; D: number; N: number; T: number; O: number; B: number };
  counts: { stunting: number; underweight: number; wasting: number; twoT: number; immunizationLate: number; idl: number; eligibleIdl: number };
  children: ChildKms[];
}
