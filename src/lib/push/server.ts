import webpush from "web-push";
import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Web Push delivery for rows written by the notification platform. Every module that calls
// notify()/deliver() gets phone notifications for free. LOW priority stays in-app only.

let configured: boolean | null = null;
function ensureConfigured() {
  if (configured !== null) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    console.warn("[push] VAPID keys missing, web push disabled");
    configured = false;
    return false;
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@wargain.id", pub, priv);
  configured = true;
  return true;
}

export interface PushRow {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  priority: string;
  entityType?: string | null;
  entityId?: string | null;
  createdAt: string;
}

const TTL_BY_PRIORITY: Record<string, number> = { URGENT: 60 * 60, HIGH: 12 * 60 * 60, NORMAL: 24 * 60 * 60 };

export async function sendPush(rows: PushRow[]) {
  const deliverable = rows.filter((r) => r.priority !== "LOW");
  if (!deliverable.length || !ensureConfigured()) return { sent: 0, failed: 0 };

  const userIds = Array.from(new Set(deliverable.map((r) => r.userId)));
  const { data: subs } = await supabaseAdmin.from("push_subscriptions").select("*").in("userId", userIds);
  if (!subs?.length) return { sent: 0, failed: 0 };

  const byUser = new Map<string, typeof subs>();
  subs.forEach((s) => byUser.set(s.userId, [...(byUser.get(s.userId) ?? []), s]));

  let sent = 0;
  let failed = 0;
  const dead: string[] = [];
  const ok: string[] = [];
  const jobs: Promise<void>[] = [];

  for (const r of deliverable) {
    const payload = JSON.stringify({
      id: r.id,
      title: r.title,
      body: r.body,
      link: r.link ?? "/feed",
      priority: r.priority,
      // Same entity replaces the previous phone notification instead of stacking.
      tag: r.entityId ? `${r.type}:${r.entityId}` : undefined,
      createdAt: r.createdAt,
    });
    for (const s of byUser.get(r.userId) ?? []) {
      jobs.push(
        webpush
          .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
            TTL: TTL_BY_PRIORITY[r.priority] ?? 86400,
            urgency: r.priority === "URGENT" ? "high" : r.priority === "HIGH" ? "normal" : "low",
          })
          .then(() => {
            sent++;
            ok.push(s.id);
          })
          .catch((err: any) => {
            failed++;
            // 404/410: the browser dropped this subscription.
            if (err?.statusCode === 404 || err?.statusCode === 410) dead.push(s.id);
            else console.error("[push] send failed:", err?.statusCode, err?.body ?? err?.message);
          })
      );
    }
  }
  await Promise.all(jobs);

  if (dead.length) await supabaseAdmin.from("push_subscriptions").delete().in("id", dead);
  if (ok.length) {
    await supabaseAdmin
      .from("push_subscriptions")
      .update({ lastSuccessAt: new Date().toISOString(), failCount: 0 })
      .in("id", Array.from(new Set(ok)));
  }
  return { sent, failed };
}

// Runs after the response is sent (Next.js `after`), so pushing never slows the request.
export function schedulePush(rows: PushRow[]) {
  if (!rows.some((r) => r.priority !== "LOW")) return;
  try {
    after(() => sendPush(rows).then(() => undefined));
  } catch {
    // Outside a request scope (scripts): send inline.
    void sendPush(rows).catch((e) => console.error("[push]", e));
  }
}
