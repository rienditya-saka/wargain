import { supabaseAdmin } from "@/lib/supabase-admin";
import { CommunityContext, houseKeyOf, recordHouseKey } from "@/lib/community/context";
import { deliver } from "@/lib/notifications/server";
import { typeMeta } from "@/lib/notifications/registry";
import { publishFeedPost, updateFeedPostByEntity } from "@/lib/feed/server";
import { AUDIENCE_META, CATEGORY_META, SocialEvent, formatEventDate, formatEventTime, isEligible } from "./types";

export {
  blockKey,
  houseKeyOf,
  loadCommunityCitizens,
  loadCommunityContext,
  recordHouseKey as registrationHouseKey,
} from "@/lib/community/context";
export type { CitizenRow, CommunityContext, UserRow } from "@/lib/community/context";

type SocialNotification = {
  id: string;
  communityId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  eventId?: string | null;
  createdAt: string;
};

// Sosial builds per-user rows itself (names differ per household); delivery goes through the platform.
export async function insertNotifications(rows: SocialNotification[] | Record<string, unknown>[]): Promise<number> {
  const typed = rows as SocialNotification[];
  return deliver(
    typed.map((r) => ({
      ...r,
      module: "SOSIAL",
      priority: typeMeta(r.type).priority,
      entityType: r.eventId ? "SOCIAL_EVENT" : null,
      entityId: r.eventId ?? null,
    }))
  );
}

let notifSeq = 0;
export function notifId(prefix = "ntf") {
  notifSeq = (notifSeq + 1) % 1_000_000;
  return `${prefix}_${Date.now().toString(36)}${notifSeq.toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function eventLink(eventId: string) {
  return `/sosial?event=${encodeURIComponent(eventId)}`;
}

export function describeWhen(e: Pick<SocialEvent, "startAt" | "endAt">) {
  return `${formatEventDate(e.startAt)}, ${formatEventTime(e.startAt, e.endAt)}`;
}

// ---------------- Feed ----------------

function eventFeedEntity(e: SocialEvent) {
  return e.seriesId ? { type: "SOCIAL_EVENT_SERIES", id: e.seriesId } : { type: "SOCIAL_EVENT", id: e.id };
}

function eventPayload(e: SocialEvent, occurrences: string[]) {
  return {
    eventId: e.id,
    category: e.category,
    startAt: e.startAt,
    endAt: e.endAt,
    location: e.location,
    audience: e.audience,
    autoEnroll: e.autoEnroll,
    capacity: e.capacity,
    services: e.services,
    coverUrl: e.coverUrl,
    status: e.status,
    occurrences,
  };
}

// One feed post per event (or per recurring series).
export async function publishEventToFeed(events: SocialEvent[], author: { id?: string | null; name: string; role?: string | null }) {
  const first = events[0];
  const meta = CATEGORY_META[first.category];
  await publishFeedPost({
    communityId: first.communityId,
    module: "SOSIAL",
    type: "SOCIAL_EVENT",
    title: first.title,
    content: first.description,
    images: first.coverUrl ? [first.coverUrl] : [],
    payload: eventPayload(first, events.map((e) => e.startAt)),
    entity: eventFeedEntity(first),
    author: { id: author.id, name: first.organizerName || author.name, role: author.role ?? meta.label },
  });
}

export async function markEventPostCancelled(event: SocialEvent, reason?: string | null) {
  await updateFeedPostByEntity(event.communityId, "SOSIAL", eventFeedEntity(event), {
    payload: { status: "DIBATALKAN", cancelReason: reason ?? null },
  });
}

// ---------------- Enrollment & notifications ----------------

// Auto-enrolls eligible residents into the given events and notifies their households.
// Returns the number of new registrations.
export async function autoEnroll(events: SocialEvent[], ctx: CommunityContext, options: { notify: boolean } = { notify: true }) {
  const targets = events.filter((e) => e.autoEnroll && e.audience !== "SEMUA" && e.status === "TERJADWAL");
  if (targets.length === 0) return 0;

  const { data: existing } = await supabaseAdmin
    .from("social_event_registrations")
    .select("eventId, citizenId")
    .in("eventId", targets.map((e) => e.id));
  const already = new Set((existing ?? []).map((r) => `${r.eventId}:${r.citizenId}`));

  const now = new Date().toISOString();
  const rows: Record<string, unknown>[] = [];
  const byHouse = new Map<string, { event: SocialEvent; names: string[]; houseKey: string }>();

  for (const e of targets) {
    const at = new Date(e.startAt);
    for (const c of ctx.citizens) {
      if (!isEligible(e.audience, c, at) || already.has(`${e.id}:${c.id}`)) continue;
      rows.push({
        id: `reg_${e.id.slice(-12)}_${c.id.slice(-14)}`.replace(/[^a-zA-Z0-9_]/g, ""),
        communityId: e.communityId,
        eventId: e.id,
        citizenId: c.id,
        participantName: c.fullName,
        houseBlock: c.houseBlock,
        age: c.age,
        gender: c.gender,
        registeredBy: null,
        source: "OTOMATIS",
        status: "TERDAFTAR",
        measurements: {},
        createdAt: now,
        updatedAt: now,
      });
      const hk = houseKeyOf(c);
      if (!hk) continue;
      const key = `${e.seriesId ?? e.id}:${hk}`;
      const entry = byHouse.get(key) ?? { event: e, names: [], houseKey: hk };
      if (!entry.names.includes(c.fullName)) entry.names.push(c.fullName);
      // Keep the earliest occurrence of a series for the message.
      if (new Date(e.startAt) < new Date(entry.event.startAt)) entry.event = e;
      byHouse.set(key, entry);
    }
  }

  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabaseAdmin
      .from("social_event_registrations")
      .upsert(rows.slice(i, i + 500), { onConflict: "id", ignoreDuplicates: true });
    if (error) throw new Error(`auto-enroll: ${error.message}`);
  }

  if (options.notify && rows.length > 0) {
    const notifs: SocialNotification[] = [];
    byHouse.forEach(({ event, names, houseKey }) => {
      const meta = CATEGORY_META[event.category];
      const series = event.seriesId ? " (jadwal rutin)" : "";
      (ctx.usersByHouse.get(houseKey) ?? []).forEach((u) => {
        notifs.push({
          id: notifId(),
          communityId: event.communityId,
          userId: u.id,
          type: "SOCIAL_AUTO_ENROLLED",
          title: `${meta.emoji} ${names.join(", ")} otomatis terdaftar ${meta.label}${series}`,
          body: `Jadwal terdekat ${describeWhen(event)} di ${event.location}. Tidak bisa hadir? Batalkan dari halaman Kegiatan Sosial.`,
          link: eventLink(event.id),
          eventId: event.id,
          createdAt: now,
        });
      });
    });
    await insertNotifications(notifs);
  }

  return rows.length;
}

// "Kegiatan baru" announcement: everyone for open events, only eligible households for targeted ones.
export async function notifyNewEvent(event: SocialEvent, occurrences: number, ctx: CommunityContext) {
  const meta = CATEGORY_META[event.category];
  const at = new Date(event.startAt);
  let recipients = ctx.users;
  if (event.audience !== "SEMUA" && event.audience !== "KEPALA_KELUARGA") {
    const eligibleHouses = new Set(ctx.citizens.filter((c) => isEligible(event.audience, c, at)).map((c) => houseKeyOf(c)));
    recipients = ctx.users.filter((u) => (u.houseKey && eligibleHouses.has(u.houseKey)) || ["TENANT_ADMIN", "KETUA", "SEKRETARIS", "HUMAS"].includes(u.role));
  }
  const now = new Date().toISOString();
  const repeat = occurrences > 1 ? ` · ${occurrences}x jadwal rutin` : "";
  await insertNotifications(
    recipients
      .filter((u) => u.id !== event.createdBy)
      .map((u) => ({
        id: notifId(),
        communityId: event.communityId,
        userId: u.id,
        type: "SOCIAL_NEW_EVENT",
        title: `${meta.emoji} Kegiatan baru: ${event.title}`,
        body: `${describeWhen(event)} · ${event.location}${repeat}. Untuk: ${AUDIENCE_META[event.audience].label}.`,
        link: eventLink(event.id),
        eventId: event.id,
        createdAt: now,
      }))
  );
}

// Notify the households of everyone registered for an event.
export async function notifyRegistrantHouseholds(
  event: SocialEvent,
  ctx: CommunityContext,
  build: (names: string[]) => { type: string; title: string; body: string }
) {
  const { data: regs } = await supabaseAdmin
    .from("social_event_registrations")
    .select("participantName, citizenId, houseBlock, registeredBy, status")
    .eq("eventId", event.id)
    .neq("status", "BATAL");
  const byUser = new Map<string, string[]>();
  (regs ?? []).forEach((r) => {
    const hk = recordHouseKey(ctx, r);
    const recipients = new Set<string>((hk ? ctx.usersByHouse.get(hk) ?? [] : []).map((u) => u.id));
    if (r.registeredBy) recipients.add(r.registeredBy);
    recipients.forEach((id) => byUser.set(id, [...(byUser.get(id) ?? []), r.participantName]));
  });
  const now = new Date().toISOString();
  const validIds = new Set(ctx.users.map((u) => u.id));
  await insertNotifications(
    Array.from(byUser.entries())
      .filter(([userId]) => validIds.has(userId))
      .map(([userId, names]) => ({
        id: notifId(),
        communityId: event.communityId,
        userId,
        ...build(Array.from(new Set(names))),
        link: eventLink(event.id),
        eventId: event.id,
        createdAt: now,
      }))
  );
}
