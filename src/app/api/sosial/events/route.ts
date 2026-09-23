import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  autoEnroll,
  describeWhen,
  houseKeyOf,
  loadCommunityContext,
  markEventPostCancelled,
  notifyNewEvent,
  notifyRegistrantHouseholds,
  publishEventToFeed,
} from "@/lib/sosial/server";
import { CATEGORY_META, SocialCategory, SocialEvent, isEligible } from "@/lib/sosial/types";

const MAX_OCCURRENCES = 12;

function eventId() {
  return `evt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function shiftDate(iso: string, frequency: "WEEKLY" | "MONTHLY", step: number) {
  const d = new Date(iso);
  if (frequency === "WEEKLY") d.setUTCDate(d.getUTCDate() + 7 * step);
  else d.setUTCMonth(d.getUTCMonth() + step);
  return d.toISOString();
}

// GET ?communityId&userId[&scope=upcoming|all][&eventId]
// Returns events with counts, the caller's household and the household's registrations.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const communityId = searchParams.get("communityId");
    const userId = searchParams.get("userId");
    const scope = searchParams.get("scope") ?? "upcoming";
    const onlyId = searchParams.get("eventId");
    if (!communityId) return NextResponse.json({ error: "communityId wajib disertakan." }, { status: 400 });

    let query = supabaseAdmin.from("social_events").select("*").eq("communityId", communityId).order("startAt", { ascending: scope === "upcoming" });
    if (onlyId) query = query.eq("id", onlyId);
    else if (scope === "upcoming") query = query.gte("startAt", new Date(Date.now() - 6 * 3_600_000).toISOString()).limit(60);
    else query = query.limit(200);
    const { data: events, error } = await query;
    if (error) return NextResponse.json({ error: error.message, ready: false }, { status: 500 });

    const ids = (events ?? []).map((e) => e.id);
    const { data: regs } = ids.length
      ? await supabaseAdmin.from("social_event_registrations").select("id, eventId, status").in("eventId", ids)
      : { data: [] as { id: string; eventId: string; status: string }[] };
    const counts = new Map<string, { registered: number; attended: number }>();
    (regs ?? []).forEach((r) => {
      const c = counts.get(r.eventId) ?? { registered: 0, attended: 0 };
      if (r.status !== "BATAL") c.registered++;
      if (r.status === "HADIR") c.attended++;
      counts.set(r.eventId, c);
    });

    // Household of the caller: everyone living in the same house as the linked resident.
    let household: unknown[] = [];
    let householdRegistrations: unknown[] = [];
    let houseBlock: string | null = null;
    if (userId) {
      const ctx = await loadCommunityContext(communityId);
      const me = ctx.users.find((u) => u.id === userId);
      houseBlock = me?.houseBlock ?? null;
      if (me?.houseKey) {
        household = ctx.citizens.filter((c) => houseKeyOf(c) === me.houseKey);
        const memberIds = (household as { id: string }[]).map((c) => c.id);
        if (memberIds.length) {
          const { data: hr } = await supabaseAdmin
            .from("social_event_registrations")
            .select("*")
            .eq("communityId", communityId)
            .in("citizenId", memberIds)
            .order("createdAt", { ascending: false })
            .limit(300);
          householdRegistrations = hr ?? [];
        }
      }
    }

    return NextResponse.json({
      ready: true,
      events: (events ?? []).map((e) => ({
        ...e,
        registeredCount: counts.get(e.id)?.registered ?? 0,
        attendedCount: counts.get(e.id)?.attended ?? 0,
      })),
      household,
      householdRegistrations,
      houseBlock,
    });
  } catch (err: any) {
    console.error("API /api/sosial/events GET error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// POST { communityId, userId, event: {...}, repeat?: { frequency: WEEKLY|MONTHLY, count } }
export async function POST(req: Request) {
  try {
    const { communityId, userId, event, repeat } = await req.json();
    if (!communityId || !event?.title?.trim() || !event?.startAt || !event?.location?.trim()) {
      return NextResponse.json({ error: "Judul, waktu mulai, dan lokasi wajib diisi." }, { status: 400 });
    }
    const category: SocialCategory = event.category in CATEGORY_META ? event.category : "LAINNYA";
    const occurrences = repeat?.frequency ? Math.min(MAX_OCCURRENCES, Math.max(1, Number(repeat.count) || 1)) : 1;
    const seriesId = occurrences > 1 ? `series_${Date.now().toString(36)}` : null;
    const now = new Date().toISOString();
    const durationMs = event.endAt ? new Date(event.endAt).getTime() - new Date(event.startAt).getTime() : null;

    const rows: SocialEvent[] = Array.from({ length: occurrences }, (_, i) => {
      const startAt = i === 0 ? new Date(event.startAt).toISOString() : shiftDate(event.startAt, repeat.frequency, i);
      return {
        id: eventId() + i,
        communityId,
        seriesId,
        title: event.title.trim(),
        category,
        description: (event.description ?? "").trim(),
        location: event.location.trim(),
        lat: event.lat ?? null,
        lng: event.lng ?? null,
        startAt,
        endAt: durationMs ? new Date(new Date(startAt).getTime() + durationMs).toISOString() : null,
        audience: event.audience ?? CATEGORY_META[category].audience,
        autoEnroll: Boolean(event.autoEnroll),
        registrationOpen: event.registrationOpen ?? true,
        capacity: event.capacity ? Number(event.capacity) : null,
        services: Array.isArray(event.services) ? event.services : [],
        organizerName: (event.organizerName ?? "Pengurus RT").trim(),
        contactPhone: event.contactPhone ?? null,
        coverUrl: event.coverUrl ?? null,
        status: "TERJADWAL",
        cancelReason: null,
        createdBy: userId ?? null,
        createdAt: now,
        updatedAt: now,
      };
    });

    const { error } = await supabaseAdmin.from("social_events").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const ctx = await loadCommunityContext(communityId);
    const enrolled = await autoEnroll(rows, ctx);
    await notifyNewEvent(rows[0], occurrences, ctx);
    const author = ctx.users.find((u) => u.id === userId);
    await publishEventToFeed(rows, { id: userId ?? null, name: author?.fullName ?? rows[0].organizerName, role: author?.role ?? null });

    const eligible = rows[0].audience === "SEMUA" ? null : ctx.citizens.filter((c) => isEligible(rows[0].audience, c, new Date(rows[0].startAt))).length;
    return NextResponse.json({ success: true, events: rows, enrolled, eligible });
  } catch (err: any) {
    console.error("API /api/sosial/events POST error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// PATCH { id, action: UPDATE|CANCEL|COMPLETE|SYNC_ENROLL, patch?, reason?, applyToSeries? }
export async function PATCH(req: Request) {
  try {
    const { id, action, patch = {}, reason, applyToSeries } = await req.json();
    const { data: current, error: fetchErr } = await supabaseAdmin.from("social_events").select("*").eq("id", id).single();
    if (fetchErr || !current) return NextResponse.json({ error: "Kegiatan tidak ditemukan." }, { status: 404 });

    const targetFilter = applyToSeries && current.seriesId
      ? supabaseAdmin.from("social_events").select("*").eq("seriesId", current.seriesId).gte("startAt", current.startAt)
      : supabaseAdmin.from("social_events").select("*").eq("id", id);
    const { data: targets } = await targetFilter;
    const targetIds = (targets ?? [current]).map((t: SocialEvent) => t.id);
    const now = new Date().toISOString();
    const ctx = await loadCommunityContext(current.communityId);

    if (action === "CANCEL") {
      await supabaseAdmin.from("social_events").update({ status: "DIBATALKAN", cancelReason: reason ?? null, updatedAt: now }).in("id", targetIds);
      // A cancelled series (or single event) shows as cancelled on the feed.
      if (!current.seriesId || applyToSeries) await markEventPostCancelled(current, reason);
      await notifyRegistrantHouseholds(current, ctx, () => ({
        type: "SOCIAL_CANCELLED",
        title: `❌ ${current.title} dibatalkan`,
        body: `Jadwal ${describeWhen(current)} dibatalkan${reason ? `: ${reason}` : ""}.${targetIds.length > 1 ? ` (${targetIds.length} jadwal)` : ""}`,
      }));
      return NextResponse.json({ success: true, affected: targetIds.length });
    }

    if (action === "COMPLETE") {
      await supabaseAdmin.from("social_events").update({ status: "SELESAI", updatedAt: now }).eq("id", id);
      // Anyone still "TERDAFTAR" when the event closes didn't show up.
      await supabaseAdmin.from("social_event_registrations").update({ status: "TIDAK_HADIR", updatedAt: now }).eq("eventId", id).eq("status", "TERDAFTAR");
      return NextResponse.json({ success: true });
    }

    if (action === "SYNC_ENROLL") {
      const enrolled = await autoEnroll((targets ?? [current]) as SocialEvent[], ctx);
      return NextResponse.json({ success: true, enrolled });
    }

    // UPDATE
    const allowed = ["title", "description", "location", "lat", "lng", "startAt", "endAt", "audience", "autoEnroll", "registrationOpen", "capacity", "services", "organizerName", "contactPhone", "coverUrl", "category"];
    const clean: Record<string, unknown> = { updatedAt: now };
    allowed.forEach((k) => {
      if (k in patch) clean[k] = patch[k];
    });
    // Moving the time only makes sense per occurrence.
    const ids = "startAt" in clean || "endAt" in clean ? [id] : targetIds;
    const { error } = await supabaseAdmin.from("social_events").update(clean).in("id", ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: updated } = await supabaseAdmin.from("social_events").select("*").eq("id", id).single();
    if ("startAt" in clean || "location" in clean) {
      await notifyRegistrantHouseholds(updated, ctx, () => ({
        type: "SOCIAL_UPDATED",
        title: `🔔 Perubahan jadwal: ${updated.title}`,
        body: `Sekarang ${describeWhen(updated)} di ${updated.location}.`,
      }));
    }
    return NextResponse.json({ success: true, event: updated });
  } catch (err: any) {
    console.error("API /api/sosial/events PATCH error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
