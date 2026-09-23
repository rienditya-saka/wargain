import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  describeWhen,
  eventLink,
  houseKeyOf,
  insertNotifications,
  loadCommunityContext,
  notifId,
  registrationHouseKey,
} from "@/lib/sosial/server";
import { CATEGORY_META, Measurements, PENGURUS_ROLES } from "@/lib/sosial/types";
import { recordPosyanduResult } from "@/lib/kms/server";
import { VACCINE_BY_CODE } from "@/lib/kms/immunization";
import type { ChildKms } from "@/lib/kms/types";

function regId() {
  return `reg_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// GET ?eventId -> participants of an event
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId wajib disertakan." }, { status: 400 });
  const { data, error } = await supabaseAdmin
    .from("social_event_registrations")
    .select("*")
    .eq("eventId", eventId)
    .order("houseBlock", { ascending: true })
    .order("participantName", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ registrations: data ?? [] });
}

// POST { eventId, userId, citizenIds?: string[], guest?: { name, houseBlock, age, gender } }
export async function POST(req: Request) {
  try {
    const { eventId, userId, citizenIds = [], guest } = await req.json();
    const { data: event } = await supabaseAdmin.from("social_events").select("*").eq("id", eventId).maybeSingle();
    if (!event) return NextResponse.json({ error: "Kegiatan tidak ditemukan." }, { status: 404 });
    if (event.status !== "TERJADWAL") return NextResponse.json({ error: "Kegiatan ini sudah selesai atau dibatalkan." }, { status: 400 });

    const ctx = await loadCommunityContext(event.communityId);
    const actor = userId ? ctx.users.find((u) => u.id === userId) ?? null : null;
    const isPengurus = !!actor && PENGURUS_ROLES.includes(actor.role);
    if (!event.registrationOpen && !isPengurus) {
      return NextResponse.json({ error: "Pendaftaran kegiatan ini ditutup." }, { status: 400 });
    }

    const picked = ctx.citizens.filter((c) => citizenIds.includes(c.id));
    const sameHouse = (c: (typeof picked)[number]) => !!actor?.houseKey && houseKeyOf(c) === actor.houseKey;
    // Warga may only register people from their own house.
    if (!isPengurus && picked.some((c) => !sameHouse(c))) {
      return NextResponse.json({ error: "Anda hanya bisa mendaftarkan anggota keluarga serumah." }, { status: 403 });
    }

    const { data: existing } = await supabaseAdmin
      .from("social_event_registrations")
      .select("id, citizenId, status")
      .eq("eventId", eventId);
    const activeCount = (existing ?? []).filter((r) => r.status !== "BATAL").length;
    const byCitizen = new Map((existing ?? []).filter((r) => r.citizenId).map((r) => [r.citizenId, r]));

    const now = new Date().toISOString();
    const source = isPengurus && (guest || picked.some((c) => !sameHouse(c))) ? "PETUGAS" : "MANDIRI";
    const inserts: Record<string, unknown>[] = [];
    const reactivate: string[] = [];

    for (const c of picked) {
      const prev = byCitizen.get(c.id);
      if (prev && prev.status !== "BATAL") continue;
      if (prev) {
        reactivate.push(prev.id);
        continue;
      }
      inserts.push({
        id: regId() + inserts.length,
        communityId: event.communityId,
        eventId,
        citizenId: c.id,
        participantName: c.fullName,
        houseBlock: c.houseBlock,
        age: c.age,
        gender: c.gender,
        registeredBy: userId ?? null,
        source,
        status: "TERDAFTAR",
        measurements: {},
        createdAt: now,
        updatedAt: now,
      });
    }
    if (guest?.name?.trim()) {
      inserts.push({
        id: regId() + "g",
        communityId: event.communityId,
        eventId,
        citizenId: null,
        participantName: guest.name.trim(),
        houseBlock: guest.houseBlock?.trim() || null,
        age: guest.age ? Number(guest.age) : null,
        gender: guest.gender ?? null,
        registeredBy: userId ?? null,
        source: "PETUGAS",
        status: "TERDAFTAR",
        measurements: {},
        createdAt: now,
        updatedAt: now,
      });
    }

    const added = inserts.length + reactivate.length;
    if (added === 0) return NextResponse.json({ success: true, added: 0, message: "Semua peserta sudah terdaftar." });
    if (event.capacity && activeCount + added > event.capacity) {
      return NextResponse.json({ error: `Kuota penuh. Sisa ${Math.max(0, event.capacity - activeCount)} tempat.` }, { status: 409 });
    }

    if (inserts.length) {
      const { error } = await supabaseAdmin.from("social_event_registrations").insert(inserts);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (reactivate.length) {
      await supabaseAdmin.from("social_event_registrations").update({ status: "TERDAFTAR", updatedAt: now }).in("id", reactivate);
    }

    if (userId && actor) {
      const names = [...picked.map((c) => c.fullName), ...(guest?.name ? [guest.name] : [])];
      const meta = CATEGORY_META[event.category as keyof typeof CATEGORY_META] ?? CATEGORY_META.LAINNYA;
      await insertNotifications([
        {
          id: notifId(),
          communityId: event.communityId,
          userId,
          type: "SOCIAL_REGISTERED",
          title: `✅ Terdaftar: ${event.title}`,
          body: `${names.join(", ")} terdaftar ${meta.label}, ${describeWhen(event)} di ${event.location}.`,
          link: eventLink(event.id),
          eventId: event.id,
          createdAt: now,
        },
      ]);
    }

    return NextResponse.json({ success: true, added });
  } catch (err: any) {
    console.error("API /api/sosial/registrations POST error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// PATCH { id, userId, status?, measurements?, notes? }
export async function PATCH(req: Request) {
  try {
    const { id, userId, status, measurements, notes } = await req.json();
    const { data: reg } = await supabaseAdmin.from("social_event_registrations").select("*").eq("id", id).maybeSingle();
    if (!reg) return NextResponse.json({ error: "Data peserta tidak ditemukan." }, { status: 404 });

    const ctx = await loadCommunityContext(reg.communityId);
    const actor = userId ? ctx.users.find((u) => u.id === userId) ?? null : null;
    const isPengurus = !!actor && PENGURUS_ROLES.includes(actor.role);
    const regHouse = registrationHouseKey(ctx, reg);
    const ownHouse = !!actor?.houseKey && actor.houseKey === regHouse;
    // Warga can only cancel their own household; everything else is for pengurus/kader.
    if (!isPengurus && !(ownHouse && status === "BATAL" && measurements === undefined)) {
      return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
    }

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { updatedAt: now };
    if (status) {
      patch.status = status;
      if (status === "HADIR" && !reg.checkInAt) patch.checkInAt = now;
    }
    if (measurements) {
      patch.measurements = { ...(reg.measurements ?? {}), ...(measurements as Measurements) };
      if (!status && reg.status === "TERDAFTAR") {
        patch.status = "HADIR";
        patch.checkInAt = reg.checkInAt ?? now;
      }
    }
    if (notes !== undefined) patch.notes = notes;

    const { data: updated, error } = await supabaseAdmin.from("social_event_registrations").update(patch).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Posyandu result goes straight to the family's phones; balita results also land in the KMS.
    let kms: ChildKms | null = null;
    if (measurements) {
      const { data: event } = await supabaseAdmin.from("social_events").select("*").eq("id", reg.eventId).single();
      if (event?.category === "POSYANDU_BALITA") kms = await recordPosyanduResult(updated, event.startAt, actor?.fullName);
      const recipients = regHouse ? ctx.usersByHouse.get(regHouse) ?? [] : [];
      const m = updated.measurements as Measurements & { vaksin?: string[] };
      const a = kms?.latest?.assessment;
      const trend = kms?.latest?.trend;
      const status = [
        a?.wfa && `BB/U: ${a.wfa.label.toLowerCase()}`,
        a?.lhfa && `TB/U: ${a.lhfa.label.toLowerCase()}`,
        trend === "N" ? "berat naik ✓" : trend === "T" ? "berat tidak naik" : null,
      ].filter(Boolean);
      const parts = [
        m.beratKg != null && `BB ${m.beratKg} kg`,
        m.tinggiCm != null && `TB ${m.tinggiCm} cm`,
        m.lingkarKepalaCm != null && `LK ${m.lingkarKepalaCm} cm`,
        m.tensi && `Tensi ${m.tensi}`,
        m.gulaDarah != null && `Gula ${m.gulaDarah} mg/dL`,
        m.kolesterol != null && `Kolesterol ${m.kolesterol}`,
        m.asamUrat != null && `Asam urat ${m.asamUrat}`,
        m.vaksin?.length ? `Imunisasi ${m.vaksin.map((c) => VACCINE_BY_CODE.get(c)?.short ?? c).join(", ")}` : m.imunisasi && `Imunisasi ${m.imunisasi}`,
        m.vitaminA && "Vitamin A ✓",
      ].filter(Boolean);
      if (status.length) parts.push(`Status: ${status.join(", ")}`);
      await insertNotifications(
        recipients.map((u) => ({
          // One result notification per participant per event (re-saves update nothing new).
          id: `notif_res_${reg.id}_${u.id}`.slice(0, 120),
          communityId: reg.communityId,
          userId: u.id,
          type: "SOCIAL_RESULT",
          title: `📋 Hasil ${event?.title ?? "posyandu"}: ${reg.participantName}`,
          body: parts.join(" · ") || "Hasil pemeriksaan sudah dicatat kader.",
          link: `/sosial?tab=kesehatan`,
          eventId: reg.eventId,
          createdAt: now,
        }))
      );
    }

    return NextResponse.json({ success: true, registration: updated, kms });
  } catch (err: any) {
    console.error("API /api/sosial/registrations PATCH error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
