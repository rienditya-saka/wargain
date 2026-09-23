import { supabaseAdmin } from "@/lib/supabase-admin";
import { houseKeyOf, loadCommunityContext, recordHouseKey } from "@/lib/community/context";
import { notify } from "@/lib/notifications/server";
import { describeWhen, eventLink, insertNotifications } from "@/lib/sosial/server";
import { CATEGORY_META } from "@/lib/sosial/types";
import { loadChildren } from "@/lib/kms/server";
import { VACCINE_BY_CODE } from "@/lib/kms/immunization";

// Scheduled reminders, triggered by pg_cron -> pg_net -> /api/cron/reminders.
// Every reminder has a deterministic id / dedupeKey, so re-runs (or overlapping runs) never double-send.

const TZ = "Asia/Jakarta";
const EVENT_WINDOW_MS = 24 * 3_600_000;
const QUIET_START = 21; // no non-urgent pushes 21:00–06:00 WIB
const QUIET_END = 6;

const jakartaHour = (d = new Date()) => Number(d.toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: TZ }));
const jakartaDay = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });

export function isQuietHours(d = new Date()) {
  const h = jakartaHour(d);
  return h >= QUIET_START || h < QUIET_END;
}

function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)}`;
}

// H-1 reminder for every household with someone registered for an event in the next 24 hours.
export async function runEventReminders(now = new Date()) {
  if (isQuietHours(now)) return { skipped: "quiet-hours", events: 0, sent: 0 };

  const { data: events, error } = await supabaseAdmin
    .from("social_events")
    .select("*")
    .eq("status", "TERJADWAL")
    .gte("startAt", now.toISOString())
    .lte("startAt", new Date(now.getTime() + EVENT_WINDOW_MS).toISOString());
  if (error) throw new Error(`events: ${error.message}`);
  if (!events?.length) return { events: 0, sent: 0 };

  const { data: regs } = await supabaseAdmin
    .from("social_event_registrations")
    .select("eventId, participantName, citizenId, houseBlock, registeredBy")
    .in("eventId", events.map((e) => e.id))
    .eq("status", "TERDAFTAR");

  let sent = 0;
  const byCommunity = new Map<string, typeof events>();
  events.forEach((e) => byCommunity.set(e.communityId, [...(byCommunity.get(e.communityId) ?? []), e]));

  for (const [communityId, list] of byCommunity) {
    const ctx = await loadCommunityContext(communityId);
    const today = jakartaDay(now);
    const rows: Record<string, unknown>[] = [];
    for (const e of list) {
      // participant names per recipient account (household members + whoever registered them)
      const namesByUser = new Map<string, Set<string>>();
      (regs ?? [])
        .filter((r) => r.eventId === e.id)
        .forEach((r) => {
          const hk = recordHouseKey(ctx, r);
          const users = new Set((hk ? ctx.usersByHouse.get(hk) ?? [] : []).map((u) => u.id));
          if (r.registeredBy) users.add(r.registeredBy);
          users.forEach((uid) => namesByUser.set(uid, (namesByUser.get(uid) ?? new Set()).add(r.participantName)));
        });
      const meta = CATEGORY_META[e.category as keyof typeof CATEGORY_META] ?? CATEGORY_META.LAINNYA;
      const when = jakartaDay(new Date(e.startAt)) === today ? "hari ini" : "besok";
      namesByUser.forEach((names, userId) => {
        if (!ctx.users.some((u) => u.id === userId)) return;
        rows.push({
          // same id scheme as the old on-open reminders, so nothing is sent twice
          id: `notif_rem_${e.id}_${userId}`.slice(0, 120),
          communityId,
          userId,
          type: "SOCIAL_REMINDER",
          title: `⏰ Pengingat: ${e.title} ${when}`,
          body: `${meta.emoji} ${Array.from(names).join(", ")} · ${describeWhen(e)} di ${e.location}.`,
          link: eventLink(e.id),
          eventId: e.id,
          createdAt: now.toISOString(),
        });
      });
    }
    sent += await insertNotifications(rows);
  }
  return { events: events.length, sent };
}

// Daily: parents of children with doses due / overdue. Overdue doses are repeated weekly.
export async function runImmunizationReminders(now = new Date()) {
  if (isQuietHours(now)) return { skipped: "quiet-hours", children: 0, notified: 0 };

  const { data: communities } = await supabaseAdmin.from("users").select("communityId").not("citizenId", "is", null);
  const ids = Array.from(new Set((communities ?? []).map((c) => c.communityId)));
  const week = isoWeek(now);
  let children = 0;
  let notified = 0;

  for (const communityId of ids) {
    const ctx = await loadCommunityContext(communityId);
    const kids = await loadChildren(communityId, undefined, ctx);
    for (const k of kids) {
      const due = k.doses.filter((d) => d.status === "JATUH_TEMPO").map((d) => d.vaccine.code);
      const late = k.immunization.lateCodes;
      const pending = [...late, ...due];
      if (!pending.length) continue;
      const hk = houseKeyOf(k.citizen);
      const parents = hk ? ctx.usersByHouse.get(hk) ?? [] : [];
      if (!parents.length) continue;
      children++;
      const names = pending.map((c) => VACCINE_BY_CODE.get(c)?.short ?? c);
      const firstName = k.citizen.fullName.split(" ")[0];
      notified += await notify({
        communityId,
        ctx,
        type: "KMS_IMMUNIZATION_DUE",
        entity: { type: "CHILD", id: k.citizen.id },
        title: `💉 ${firstName} ${late.length ? "terlambat" : "jadwal"} imunisasi: ${names.slice(0, 3).join(", ")}${names.length > 3 ? ` +${names.length - 3}` : ""}`,
        body: `${late.length ? "Masih bisa dikejar, jangan ditunda. " : ""}Bawa buku KIA ke posyandu atau puskesmas terdekat.`,
        link: "/sosial?tab=kesehatan",
        target: { userIds: parents.map((u) => u.id) },
        // new set of doses -> new reminder; overdue ones come back once a week
        dedupeKey: `imun:${k.citizen.id}:${[...pending].sort().join(",")}${late.length ? `:${week}` : ""}`,
      });
    }
  }
  return { communities: ids.length, children, notified };
}
