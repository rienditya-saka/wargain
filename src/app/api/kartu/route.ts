import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PENGURUS_ROLES } from "@/lib/notifications/registry";
import { dayKey, makeToken, readToken } from "@/lib/kartu/token";

async function cardOf(userId: string) {
  const { data: u } = await supabaseAdmin.from("users").select("id, fullName, role, communityId, houseBlock, citizenId, phone, createdAt").eq("id", userId).maybeSingle();
  if (!u) return null;
  const [{ data: community }, { data: citizen }] = await Promise.all([
    supabaseAdmin.from("communities").select("name").eq("id", u.communityId).maybeSingle(),
    u.citizenId ? supabaseAdmin.from("citizens").select("id, role, gender, houseId, familyCardId, house:houses(blockNumber, address, occupancyStatus)").eq("id", u.citizenId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const c = citizen as any;
  let members: { name: string; role: string; age: number }[] = [];
  if (c?.familyCardId) {
    const { data } = await supabaseAdmin.from("citizens").select("fullName, role, age").eq("familyCardId", c.familyCardId).order("age", { ascending: false });
    members = (data ?? []).map((m) => ({ name: m.fullName, role: m.role, age: m.age }));
  }
  return {
    user: u,
    card: {
      fullName: u.fullName,
      role: u.role,
      isPengurus: PENGURUS_ROLES.includes(u.role),
      communityName: community?.name ?? "",
      houseBlock: c?.house?.blockNumber ?? u.houseBlock ?? null,
      address: c?.house?.address ?? null,
      occupancy: c?.house?.occupancyStatus ?? null,
      familyRole: c?.role ?? null,
      members,
      memberSince: u.createdAt,
      cardNo: `WRG-${u.id.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase()}`,
    },
  };
}

// GET ?userId            -> my card + today's QR token
// GET ?token&viewerId    -> verify a scanned card (viewer must be a logged-in account of the same community)
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const token = sp.get("token");
  try {
    if (token) {
      const viewerId = sp.get("viewerId");
      const { data: viewer } = viewerId ? await supabaseAdmin.from("users").select("id, communityId, role").eq("id", viewerId).maybeSingle() : { data: null };
      if (!viewer) return NextResponse.json({ error: "Login dulu untuk memverifikasi kartu." }, { status: 401 });
      const parsed = readToken(token);
      if (!parsed) return NextResponse.json({ valid: false, reason: "QR tidak dikenal / palsu." });
      const found = await cardOf(parsed.userId);
      if (!found) return NextResponse.json({ valid: false, reason: "Akun pemilik kartu tidak ditemukan." });
      if (found.user.communityId !== viewer.communityId) return NextResponse.json({ valid: false, reason: "Bukan warga lingkungan ini." });
      if (parsed.day !== dayKey()) return NextResponse.json({ valid: false, reason: "QR kedaluwarsa (bukan QR hari ini). Minta pemilik membuka ulang kartunya.", card: { fullName: found.card.fullName } });
      return NextResponse.json({ valid: true, card: found.card, checkedAt: new Date().toISOString() });
    }

    const found = await cardOf(sp.get("userId") ?? "");
    if (!found) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 401 });
    const tomorrow = new Date(`${dayKey()}T00:00:00+07:00`).getTime() + 86_400_000;
    return NextResponse.json({ card: found.card, token: makeToken(found.user.id), validUntil: new Date(tomorrow).toISOString() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Internal server error" }, { status: 500 });
  }
}
