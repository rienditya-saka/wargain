import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { CommunityContext, blockKey, loadCommunityContext } from "@/lib/community/context";
import { ModuleKey, NotificationPriority, typeMeta } from "./registry";
import { schedulePush } from "@/lib/push/server";

export interface NotifyTarget {
  all?: boolean; // every account in the community
  userIds?: string[];
  roles?: string[]; // e.g. PENGURUS_ROLES
  houseKeys?: string[]; // from houseKeyOf()/recordHouseKey()
  houseBlocks?: string[]; // block labels, when only the text is known (e.g. keamanan records)
}

export interface NotifyInput {
  communityId: string;
  type: string;
  title: string;
  body?: string;
  link?: string | null;
  entity?: { type: string; id: string };
  target: NotifyTarget;
  excludeUserIds?: (string | null | undefined)[];
  actorName?: string | null;
  priority?: NotificationPriority;
  module?: ModuleKey;
  // Same dedupeKey + user => delivered once (reminders, results that may be re-saved).
  dedupeKey?: string;
  ctx?: CommunityContext;
}

export interface NotificationRow {
  id: string;
  communityId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  module: string;
  priority: string;
  entityType?: string | null;
  entityId?: string | null;
  eventId?: string | null;
  actorName?: string | null;
  createdAt: string;
}

let seq = 0;
function randomId() {
  seq = (seq + 1) % 1_000_000;
  return `ntf_${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
function stableId(key: string, userId: string) {
  return `ntf_${createHash("sha1").update(`${key}|${userId}`).digest("hex").slice(0, 24)}`;
}

function resolveRecipients(ctx: CommunityContext, target: NotifyTarget) {
  const ids = new Set<string>();
  if (target.all) ctx.users.forEach((u) => ids.add(u.id));
  target.userIds?.forEach((id) => id && ids.add(id));
  if (target.roles?.length) ctx.users.filter((u) => target.roles!.includes(u.role)).forEach((u) => ids.add(u.id));
  target.houseKeys?.forEach((k) => k && (ctx.usersByHouse.get(k) ?? []).forEach((u) => ids.add(u.id)));
  if (target.houseBlocks?.length) {
    const wanted = new Set(target.houseBlocks.map(blockKey).filter(Boolean));
    ctx.users.filter((u) => wanted.has(blockKey(u.houseBlock))).forEach((u) => ids.add(u.id));
  }
  const valid = new Set(ctx.users.map((u) => u.id));
  return Array.from(ids).filter((id) => valid.has(id));
}

// Drops rows the recipient muted (URGENT always goes through), then inserts.
export async function deliver(rows: NotificationRow[]) {
  if (rows.length === 0) return 0;
  const userIds = Array.from(new Set(rows.map((r) => r.userId)));
  const { data: prefs } = await supabaseAdmin
    .from("notification_preferences")
    .select('"userId", "mutedModules", "mutedTypes"')
    .in("userId", userIds);
  const prefByUser = new Map((prefs ?? []).map((p: any) => [p.userId, p]));
  const allowed = rows.filter((r) => {
    if (r.priority === "URGENT") return true;
    const p = prefByUser.get(r.userId);
    return !p || (!p.mutedModules?.includes(r.module) && !p.mutedTypes?.includes(r.type));
  });
  // Only rows that are actually new get pushed (dedupeKey re-sends are ignored).
  const fresh: NotificationRow[] = [];
  for (let i = 0; i < allowed.length; i += 500) {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .upsert(allowed.slice(i, i + 500), { onConflict: "id", ignoreDuplicates: true })
      .select("id");
    if (error) console.error("notify deliver:", error.message);
    const inserted = new Set((data ?? []).map((r) => r.id));
    fresh.push(...allowed.slice(i, i + 500).filter((r) => inserted.has(r.id)));
  }
  schedulePush(fresh);
  return fresh.length;
}

export async function notify(input: NotifyInput): Promise<number> {
  try {
    const ctx = input.ctx ?? (await loadCommunityContext(input.communityId));
    const exclude = new Set(input.excludeUserIds?.filter(Boolean) as string[]);
    const recipients = resolveRecipients(ctx, input.target).filter((id) => !exclude.has(id));
    const meta = typeMeta(input.type);
    const now = new Date().toISOString();
    const rows: NotificationRow[] = recipients.map((userId) => ({
      id: input.dedupeKey ? stableId(input.dedupeKey, userId) : randomId(),
      communityId: input.communityId,
      userId,
      type: input.type,
      title: input.title,
      body: input.body ?? "",
      link: input.link ?? null,
      module: input.module ?? meta.module,
      priority: input.priority ?? meta.priority,
      entityType: input.entity?.type ?? null,
      entityId: input.entity?.id ?? null,
      eventId: input.entity?.type === "SOCIAL_EVENT" ? input.entity.id : null,
      actorName: input.actorName ?? null,
      createdAt: now,
    }));
    return await deliver(rows);
  } catch (err) {
    // Notifications must never break the action that triggered them.
    console.error("notify failed:", err);
    return 0;
  }
}
