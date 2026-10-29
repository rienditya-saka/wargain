import { describe, expect, it } from "vitest";
import { dayOfWeek, isOpenNow, isOpenOn, jakartaDateKey, slotsFor } from "@/lib/pasar/slots";

// 2026-09-28 = Senin
const MONDAY = "2026-09-28";
const hours = [{ day: 1, start: "08:00", end: "12:00" }];
const earlier = new Date("2026-09-27T08:00:00+07:00");

describe("Kalender booking jasa Pasar Warga", () => {
  it("dayOfWeek & jakartaDateKey memakai WIB", () => {
    expect(dayOfWeek(MONDAY)).toBe(1);
    // 23:30 UTC = 06:30 WIB keesokan harinya
    expect(jakartaDateKey(new Date("2026-09-27T23:30:00Z"))).toBe(MONDAY);
  });

  it("slot mengikuti jam buka dan durasi", () => {
    const s = slotsFor({ dateKey: MONDAY, weeklyHours: hours, closedDates: [], durationMin: 60, capacity: 1, bookings: [], now: earlier });
    expect(s.map((x) => x.label)).toEqual(["08:00", "09:00", "10:00", "11:00"]);
    expect(s.every((x) => x.remaining === 1 && !x.reason)).toBe(true);
    expect(s[0].start).toBe("2026-09-28T01:00:00.000Z");
  });

  it("booking yang tumpang tindih membuat slot PENUH (anti double booking)", () => {
    const bookings = [{ start: "2026-09-28T02:00:00.000Z", end: "2026-09-28T03:00:00.000Z" }]; // 09:00–10:00 WIB
    const s = slotsFor({ dateKey: MONDAY, weeklyHours: hours, closedDates: [], durationMin: 60, capacity: 1, bookings, now: earlier });
    expect(s.find((x) => x.label === "09:00")).toMatchObject({ remaining: 0, reason: "PENUH" });
    expect(s.find((x) => x.label === "10:00")?.remaining).toBe(1);
  });

  it("kapasitas > 1 menyisakan kuota", () => {
    const bookings = [{ start: "2026-09-28T01:00:00.000Z", end: "2026-09-28T02:00:00.000Z" }];
    const s = slotsFor({ dateKey: MONDAY, weeklyHours: hours, closedDates: [], durationMin: 60, capacity: 3, bookings, now: earlier });
    expect(s[0].remaining).toBe(2);
  });

  it("slot kurang dari 1 jam dari sekarang = LEWAT", () => {
    const s = slotsFor({ dateKey: MONDAY, weeklyHours: hours, closedDates: [], durationMin: 60, capacity: 1, bookings: [], now: new Date("2026-09-28T08:30:00+07:00") });
    expect(s.find((x) => x.label === "09:00")?.reason).toBe("LEWAT");
    expect(s.find((x) => x.label === "10:00")?.reason).toBeUndefined();
  });

  it("tanggal libur / hari tutup tidak punya slot", () => {
    expect(slotsFor({ dateKey: MONDAY, weeklyHours: hours, closedDates: [MONDAY], durationMin: 60, capacity: 1, bookings: [] })).toEqual([]);
    expect(isOpenOn("2026-09-29", hours, [])).toBeNull();
  });

  it("isOpenNow", () => {
    expect(isOpenNow(hours, [], new Date("2026-09-28T09:15:00+07:00"))).toBe(true);
    expect(isOpenNow(hours, [], new Date("2026-09-28T12:00:00+07:00"))).toBe(false);
  });
});
