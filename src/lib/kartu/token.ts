import { createHmac, timingSafeEqual } from "node:crypto";

// Kartu Warga Digital: the QR carries a token signed per day (WIB), so a screenshot stops working tomorrow.
const secret = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "wargain";

export const dayKey = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
const sign = (userId: string, day: string) => createHmac("sha256", secret()).update(`kartu|${userId}|${day}`).digest("base64url").slice(0, 16);

export const makeToken = (userId: string, day = dayKey()) => Buffer.from(`${userId}.${day}.${sign(userId, day)}`).toString("base64url");

export function readToken(token: string) {
  try {
    const [userId, day, sig] = Buffer.from(token, "base64url").toString().split(".");
    if (!userId || !day || !sig) return null;
    const expected = Buffer.from(sign(userId, day));
    const given = Buffer.from(sig);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    return { userId, day };
  } catch {
    return null;
  }
}
