import { describe, expect, it } from "vitest";
import { WFA } from "@/lib/kms/who-standards";
import { ageInDays, assess, daysToMonths, kbmGrams, lmsAtAge, valueAtZ, weightTrend, zScore } from "@/lib/kms/zscore";
import { immunizationStatus, immunizationSummary, parseVaccineText } from "@/lib/kms/immunization";

describe("WHO z-score (LMS)", () => {
  const lms = lmsAtAge(WFA, 1, 0)!;

  it("median bayi laki-laki baru lahir ≈ 3,35 kg dan z = 0", () => {
    expect(lms[1]).toBeCloseTo(3.35, 1);
    expect(zScore(lms[1], lms, true)).toBeCloseTo(0, 6);
  });

  it("valueAtZ dan zScore saling invers", () => {
    for (const z of [-2, -1, 1, 2]) expect(zScore(valueAtZ(lms, z), lms, false)).toBeCloseTo(z, 6);
  });

  it("di luar rentang umur 0–1826 hari tidak dihitung", () => {
    expect(lmsAtAge(WFA, 1, -1)).toBeNull();
    expect(lmsAtAge(WFA, 1, 1827)).toBeNull();
  });
});

describe("assess() — klasifikasi Permenkes 2/2020", () => {
  const base = { sex: 1 as const, birthDate: "2025-09-01", measuredAt: "2026-09-02" }; // 366 hari = 12 bulan penuh

  it("anak 12 bulan 9,6 kg / 75,7 cm → normal", () => {
    const a = assess({ ...base, weightKg: 9.6, heightCm: 75.7 })!;
    expect(a.ageMonths).toBe(12);
    expect(a.wfa?.status).toBe("NORMAL");
    expect(a.lhfa?.status).toBe("NORMAL");
    expect(a.wfh?.status).toBe("GIZI_BAIK");
  });

  it("berat sangat rendah → SANGAT_KURANG dan ditandai", () => {
    const a = assess({ ...base, weightKg: 6.4 })!;
    expect(a.wfa?.status).toBe("SANGAT_KURANG");
    expect(a.wfa?.flagged).toBe(true);
  });

  it("tinggi pendek → stunting (PENDEK)", () => {
    const a = assess({ ...base, heightCm: 70.5 })!;
    expect(a.lhfa?.status).toBe("PENDEK");
  });

  it("nilai mustahil (salah ketik) → TIDAK_WAJAR (BIV)", () => {
    const a = assess({ ...base, weightKg: 40 })!;
    expect(a.wfa?.status).toBe("TIDAK_WAJAR");
  });

  it("umur di luar 0–5 tahun → null", () => {
    expect(assess({ ...base, measuredAt: "2024-01-01", weightKg: 5 })).toBeNull();
    expect(assess({ sex: 2, birthDate: "2019-01-01", measuredAt: "2026-01-01", weightKg: 20 })).toBeNull();
  });

  it("ageInDays / daysToMonths", () => {
    expect(ageInDays("2026-01-01", "2026-01-31")).toBe(30);
    expect(daysToMonths(365)).toBe(11);
    expect(daysToMonths(366)).toBe(12);
  });
});

describe("KBM & tren N/T (Permenkes 155/2010)", () => {
  it("tabel KBM", () => {
    expect(kbmGrams(0)).toBe(800);
    expect(kbmGrams(2)).toBe(900);
    expect(kbmGrams(11)).toBe(200);
    expect(kbmGrams(30)).toBe(200);
  });

  const prev = { measuredAt: "2026-08-01", weightKg: 6.0 };
  it("naik ≥ KBM → N, kurang → T", () => {
    expect(weightTrend(prev, { measuredAt: "2026-09-01", weightKg: 6.5 }, 5)).toBe("N");
    expect(weightTrend(prev, { measuredAt: "2026-09-01", weightKg: 6.2 }, 5)).toBe("T");
  });
  it("kunjungan pertama B, jeda > 45 hari O", () => {
    expect(weightTrend(null, { measuredAt: "2026-09-01", weightKg: 6 }, 5)).toBe("B");
    expect(weightTrend(prev, { measuredAt: "2026-10-01", weightKg: 7 }, 5)).toBe("O");
  });
});

describe("Jadwal imunisasi Kemenkes", () => {
  it("bayi baru lahir: HB-0 jatuh tempo, BCG segera/belum", () => {
    const s = immunizationStatus("2026-09-25", [], new Date("2026-09-25T10:00:00+07:00"));
    expect(s.find((x) => x.vaccine.code === "HB0")?.status).toBe("JATUH_TEMPO");
    expect(["SEGERA", "BELUM_WAKTUNYA"]).toContain(s.find((x) => x.vaccine.code === "BCG")?.status);
  });

  it("anak 3 bulan tanpa imunisasi: HB-0 & BCG terlambat", () => {
    const s = immunizationStatus("2026-06-25", [], new Date("2026-09-25T10:00:00+07:00"));
    expect(s.find((x) => x.vaccine.code === "HB0")?.status).toBe("TERLAMBAT");
    expect(s.find((x) => x.vaccine.code === "BCG")?.status).toBe("TERLAMBAT");
    const sum = immunizationSummary(s);
    expect(sum.late.length).toBeGreaterThan(0);
    expect(sum.idl).toBe(false);
  });

  it("dosis yang sudah diberikan → SUDAH", () => {
    const s = immunizationStatus("2026-06-25", [{ vaccineCode: "HB0", givenAt: "2026-06-25" }], new Date("2026-09-25T10:00:00+07:00"));
    expect(s.find((x) => x.vaccine.code === "HB0")?.status).toBe("SUDAH");
  });

  it("parseVaccineText memetakan catatan lama", () => {
    const codes = parseVaccineText("BCG, polio 1, DPT 2, campak");
    expect(codes).toEqual(expect.arrayContaining(["BCG", "OPV1", "DPT2", "MR1"]));
    expect(parseVaccineText("MR lanjutan 2")).toContain("MR2");
  });
});
