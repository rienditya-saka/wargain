import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { COLLECTION_KEYS, COLLECTION_QUERY, COLLECTION_TABLES } from "@/lib/keamanan/tables";

const VULNERABLE_CATEGORIES = ["LANSIA", "BALITA", "DISABILITAS"];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const communityId = searchParams.get("communityId");
    if (!communityId) {
      return NextResponse.json({ error: "communityId wajib disertakan." }, { status: 400 });
    }

    const collectionResults = await Promise.all(
      COLLECTION_KEYS.map(async (key) => {
        const q = COLLECTION_QUERY[key];
        const { data, error } = await supabaseAdmin
          .from(COLLECTION_TABLES[key])
          .select("*")
          .eq("communityId", communityId)
          .order(q.orderBy, { ascending: q.ascending })
          .limit(q.limit);
        return { key, data: data ?? [], error };
      })
    );

    const failed = collectionResults.find((r) => r.error);
    if (failed) {
      // Most likely the security migration has not been applied yet; the client falls back to demo mode.
      return NextResponse.json({
        ready: false,
        error: `${COLLECTION_TABLES[failed.key]}: ${failed.error!.message}`,
      });
    }

    const [settingsRes, housesRes, vulnerableRes] = await Promise.all([
      supabaseAdmin.from("security_settings").select("*").eq("communityId", communityId).maybeSingle(),
      supabaseAdmin
        .from("houses")
        .select("id, blockNumber, ownerName, occupancyStatus, lat, lng")
        .eq("communityId", communityId),
      supabaseAdmin
        .from("family_cards")
        .select("id, headName, blockNumber, socialCategory, phone, lat, lng")
        .eq("communityId", communityId)
        .in("socialCategory", VULNERABLE_CATEGORIES),
    ]);

    const state: Record<string, unknown> = {};
    collectionResults.forEach((r) => {
      state[r.key] = r.data;
    });

    // Reflect Kas payment status back onto ronda fines.
    const fines = state.fines as { billId?: string; status: string }[];
    const billIds = fines.map((f) => f.billId).filter(Boolean) as string[];
    if (billIds.length > 0) {
      const { data: bills } = await supabaseAdmin.from("generated_bills").select("id, status").in("id", billIds);
      const billStatus = new Map((bills ?? []).map((b) => [b.id, b.status]));
      fines.forEach((f) => {
        const s = f.billId ? billStatus.get(f.billId) : undefined;
        if (s === "PAID") f.status = "LUNAS";
        else if (s === "CANCELLED") f.status = "DIBATALKAN";
      });
    }

    return NextResponse.json({
      ready: true,
      state: {
        ...state,
        settings: settingsRes.data ?? null,
        houses: housesRes.data ?? [],
        vulnerable: (vulnerableRes.data ?? []).filter((v) => v.lat != null && v.lng != null),
      },
    });
  } catch (err: any) {
    console.error("API /api/keamanan/state GET error:", err);
    return NextResponse.json({ ready: false, error: err.message || "Internal server error" });
  }
}
