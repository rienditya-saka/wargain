import { describe, expect, it } from "vitest";
import { extractPlates, normalizePlate, plateKey } from "@/lib/keamanan/plate";
import { blockKey, houseKeyOf } from "@/lib/community/context";
import { MODULES, NOTIFICATION_TYPES, PENGURUS_ROLES, typeMeta } from "@/lib/notifications/registry";
import { FEED_FILTERS } from "@/lib/feed/types";
import { KABAR_META, fmtDate, rupiah, timeLeft } from "@/lib/balai/types";
import { dayKey, makeToken, readToken } from "@/lib/kartu/token";

describe("ANPR — plat nomor", () => {
  it("normalizePlate merapikan & memperbaiki salah baca OCR", () => {
    expect(normalizePlate("b1234abc")).toBe("B 1234 ABC");
    expect(normalizePlate("B 12O4 XY")).toBe("B 1204 XY");
    expect(normalizePlate("F 1S KJ")).toBe("F 15 KJ");
  });
  it("extractPlates mengabaikan teks tanpa angka", () => {
    const p = extractPlates(["INDONESIA", "B 1234 KJT", "09.28"]);
    expect(p).toContain("B 1234 KJT");
    expect(p.some((x) => x.startsWith("INDONESIA"))).toBe(false);
  });
  it("plateKey untuk pencocokan", () => {
    expect(plateKey("b 1234-abc")).toBe("B1234ABC");
    expect(plateKey()).toBe("");
  });
});

describe("Rumah / KK", () => {
  it("blockKey", () => {
    expect(blockKey("Blok C-03")).toBe("C-03");
    expect(blockKey(" blok  a 1 ")).toBe("A1");
    expect(blockKey(null)).toBe("");
  });
  it("houseKeyOf mengutamakan id rumah", () => {
    expect(houseKeyOf({ houseId: "h1", houseBlock: "C-03" })).toBe("id:h1");
    expect(houseKeyOf({ houseBlock: "Blok C-03" })).toBe("block:C-03");
    expect(houseKeyOf({})).toBeNull();
  });
});

describe("Registry notifikasi & feed", () => {
  it("setiap jenis notifikasi menunjuk modul yang terdaftar", () => {
    for (const [type, meta] of Object.entries(NOTIFICATION_TYPES)) expect(MODULES, type).toHaveProperty(meta.module);
  });
  it("notifikasi Balai terdaftar", () => {
    expect(typeMeta("BALAI_KABAR_DUKA").priority).toBe("HIGH");
    expect(typeMeta("BALAI_MEETING_REMINDER").module).toBe("BALAI");
    expect(typeMeta("TIDAK_ADA").module).toBe("SISTEM");
  });
  it("peran pengurus", () => {
    expect(PENGURUS_ROLES).toEqual(expect.arrayContaining(["KETUA", "SEKRETARIS", "BENDAHARA", "HUMAS"]));
    expect(PENGURUS_ROLES).not.toContain("ANGGOTA");
  });
  it("filter feed Balai memuat polling, musyawarah, galang dana", () => {
    expect(FEED_FILTERS.BALAI.types).toEqual(["POLL", "MEETING", "FUNDRAISER"]);
    expect(FEED_FILTERS.ANNOUNCEMENT.types).toContain("KABAR");
  });
});

describe("Helper Balai", () => {
  it("rupiah", () => {
    expect(rupiah(1500000)).toBe("Rp 1.500.000");
    expect(rupiah(0)).toBe("Rp 0");
  });
  it("timeLeft", () => {
    expect(timeLeft(new Date(Date.now() - 1000).toISOString())).toBe("Ditutup");
    expect(timeLeft(new Date(Date.now() + 3 * 86_400_000 + 60_000).toISOString())).toBe("3 hari lagi");
    expect(timeLeft(new Date(Date.now() + 5 * 3_600_000 + 60_000).toISOString())).toBe("5 jam lagi");
    expect(timeLeft(new Date(Date.now() + 10 * 60_000 + 5000).toISOString())).toBe("10 menit lagi");
  });
  it("fmtDate memakai WIB", () => {
    expect(fmtDate("2026-09-25")).toContain("25");
  });
  it("kategori kabar duka & gangguan berprioritas tinggi", () => {
    expect(KABAR_META.DUKA.priority).toBe("HIGH");
    expect(KABAR_META.PEMADAMAN.priority).toBe("HIGH");
    expect(KABAR_META.KELAHIRAN.priority).toBe("NORMAL");
  });
});

describe("Token QR Kartu Warga", () => {
  it("token hari ini valid & membawa userId", () => {
    expect(readToken(makeToken("user_abc"))).toEqual({ userId: "user_abc", day: dayKey() });
  });
  it("token dipalsukan ditolak", () => {
    const [, day, sig] = Buffer.from(makeToken("user_abc"), "base64url").toString().split(".");
    expect(readToken(Buffer.from(`user_lain.${day}.${sig}`).toString("base64url"))).toBeNull();
    expect(readToken("sampah")).toBeNull();
    expect(readToken("")).toBeNull();
  });
  it("token tanggal lain tetap bertanda tangan sah tetapi harinya berbeda", () => {
    const t = readToken(makeToken("user_abc", "2026-01-01"));
    expect(t?.day).toBe("2026-01-01");
    expect(t?.day).not.toBe(dayKey());
  });
});
