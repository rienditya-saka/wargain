import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runEventReminders, runImmunizationReminders } from "@/lib/reminders/server";

// Called by Supabase pg_cron (via pg_net) — see supabase/migrations/*_schedule_reminder_cron.sql.
// POST /api/cron/reminders?job=events|immunization  with  Authorization: Bearer <CRON_SECRET>
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  if (!secret || !header.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const job = new URL(req.url).searchParams.get("job");
  const started = Date.now();
  try {
    const result =
      job === "events" ? await runEventReminders() :
      job === "immunization" ? await runImmunizationReminders() :
      null;
    if (!result) return NextResponse.json({ error: "job harus events | immunization" }, { status: 400 });
    console.info(`[cron] ${job}`, result, `${Date.now() - started}ms`);
    return NextResponse.json({ success: true, job, ...result, ms: Date.now() - started });
  } catch (err: any) {
    console.error(`[cron] ${job} failed:`, err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
