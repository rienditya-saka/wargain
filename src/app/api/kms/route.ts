import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { houseKeyOf, loadCommunityContext } from "@/lib/community/context";
import { PENGURUS_ROLES } from "@/lib/notifications/registry";
import { buildDashboard, loadChildren, loadHouseholdChildren } from "@/lib/kms/server";
import { VACCINE_BY_CODE } from "@/lib/kms/immunization";

// GET ?communityId&userId[&scope=dashboard][&citizenId]
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const communityId = searchParams.get("communityId");
    const userId = searchParams.get("userId");
    const scope = searchParams.get("scope");
    const citizenId = searchParams.get("citizenId");
    if (!communityId || !userId) return NextResponse.json({ error: "communityId & userId wajib disertakan." }, { status: 400 });

    const { data: me } = await supabaseAdmin.from("users").select("role, communityId").eq("id", userId).maybeSingle();
    if (!me || me.communityId !== communityId) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
    const isPengurus = PENGURUS_ROLES.includes(me.role);

    if (scope === "dashboard") {
      if (!isPengurus) return NextResponse.json({ error: "Khusus pengurus / kader." }, { status: 403 });
      return NextResponse.json(await buildDashboard(communityId));
    }
    if (citizenId && isPengurus) {
      return NextResponse.json({ children: await loadChildren(communityId, (c) => c.id === citizenId) });
    }
    return NextResponse.json({ children: await loadHouseholdChildren(communityId, userId) });
  } catch (err: any) {
    console.error("API /api/kms GET error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// POST { userId, citizenId, kind: "MEASUREMENT", measuredAt, weightKg?, heightCm?, headCm?, method?, notes? }
//   or { userId, citizenId, kind: "IMMUNIZATION", vaccineCode, givenAt, place? }
// Pengurus/kader for anyone; parents for children in their own house (e.g. results from puskesmas).
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, citizenId, kind } = body;
    const { data: child } = await supabaseAdmin.from("citizens").select("id, communityId, houseId").eq("id", citizenId).maybeSingle();
    if (!child) return NextResponse.json({ error: "Data anak tidak ditemukan." }, { status: 404 });
    const ctx = await loadCommunityContext(child.communityId);
    const me = ctx.users.find((u) => u.id === userId);
    const isPengurus = !!me && PENGURUS_ROLES.includes(me.role);
    const ownChild = !!me?.houseKey && me.houseKey === houseKeyOf({ houseId: child.houseId });
    if (!isPengurus && !ownChild) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

    if (kind === "IMMUNIZATION") {
      if (!VACCINE_BY_CODE.has(body.vaccineCode)) return NextResponse.json({ error: "Jenis vaksin tidak dikenal." }, { status: 400 });
      const givenAt = String(body.givenAt ?? today).slice(0, 10);
      if (givenAt > today) return NextResponse.json({ error: "Tanggal imunisasi tidak boleh di masa depan." }, { status: 400 });
      const { error } = await supabaseAdmin.from("immunization_records").upsert(
        {
          id: `imun_${citizenId}_${body.vaccineCode}`,
          communityId: child.communityId,
          citizenId,
          vaccineCode: body.vaccineCode,
          givenAt,
          place: body.place?.trim() || (isPengurus ? "Posyandu" : "Puskesmas / Klinik"),
          recordedBy: me?.fullName ?? null,
        },
        { onConflict: "citizenId,vaccineCode" }
      );
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const toNum = (v: unknown, min: number, max: number) => {
        if (v === null || v === undefined || v === "") return null;
        const n = Number(v);
        if (!Number.isFinite(n) || n < min || n > max) throw new Error("Nilai pengukuran di luar batas wajar.");
        return n;
      };
      const measuredAt = String(body.measuredAt ?? today).slice(0, 10);
      if (measuredAt > today) return NextResponse.json({ error: "Tanggal pengukuran tidak boleh di masa depan." }, { status: 400 });
      const row = {
        id: `gm_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
        communityId: child.communityId,
        citizenId,
        measuredAt,
        weightKg: toNum(body.weightKg, 0.5, 40),
        heightCm: toNum(body.heightCm, 30, 130),
        headCm: toNum(body.headCm, 25, 60),
        method: body.method === "LENGTH" || body.method === "HEIGHT" ? body.method : null,
        source: isPengurus ? "POSYANDU" : "PUSKESMAS",
        recordedBy: me?.fullName ?? null,
        notes: body.notes?.trim() || null,
      };
      if (!row.weightKg && !row.heightCm && !row.headCm) return NextResponse.json({ error: "Isi minimal satu hasil pengukuran." }, { status: 400 });
      const { error } = await supabaseAdmin.from("growth_measurements").insert(row);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const [updated] = await loadChildren(child.communityId, (c) => c.id === citizenId, ctx);
    return NextResponse.json({ success: true, child: updated ?? null });
  } catch (err: any) {
    const status = /batas wajar/.test(err?.message) ? 400 : 500;
    return NextResponse.json({ error: err.message || "Internal server error" }, { status });
  }
}

// DELETE ?id&kind=MEASUREMENT|IMMUNIZATION&userId -> pengurus only (fixing a wrong entry)
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const kind = searchParams.get("kind");
  const userId = searchParams.get("userId");
  const { data: me } = await supabaseAdmin.from("users").select("role").eq("id", userId).maybeSingle();
  if (!me || !PENGURUS_ROLES.includes(me.role)) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
  const table = kind === "IMMUNIZATION" ? "immunization_records" : "growth_measurements";
  const { error } = await supabaseAdmin.from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
