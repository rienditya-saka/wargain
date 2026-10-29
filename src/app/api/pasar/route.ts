import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET ?communityId[&userId] -> catalog: active shops + their active products (+ caller's own shop id)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const communityId = searchParams.get("communityId");
    const userId = searchParams.get("userId");
    if (!communityId) return NextResponse.json({ error: "communityId wajib disertakan." }, { status: 400 });

    const [{ data: shops, error }, { data: products }, { data: houses }] = await Promise.all([
      supabaseAdmin.from("shops").select("*").eq("communityId", communityId).eq("status", "AKTIF").order("orderCount", { ascending: false }),
      supabaseAdmin.from("shop_products").select("*").eq("communityId", communityId).eq("isActive", true).order("soldCount", { ascending: false }).limit(500),
      supabaseAdmin.from("houses").select("blockNumber, lat, lng").eq("communityId", communityId),
    ]);
    if (error) return NextResponse.json({ error: error.message, ready: false }, { status: 500 });

    const active = new Set((shops ?? []).map((s) => s.id));
    // Shop location for the map comes from its house block (the seller's home).
    const houseAt = new Map((houses ?? []).map((h) => [String(h.blockNumber).toUpperCase(), h]));
    const withLoc = (shops ?? []).map((s) => {
      const h = s.houseBlock ? houseAt.get(String(s.houseBlock).toUpperCase()) : undefined;
      return { ...s, lat: h?.lat ?? null, lng: h?.lng ?? null };
    });
    const mine = userId ? withLoc.find((s) => s.ownerId === userId)?.id ?? null : null;
    let myShopAnyStatus: string | null = mine;
    if (userId && !mine) {
      const { data } = await supabaseAdmin.from("shops").select("id").eq("communityId", communityId).eq("ownerId", userId).maybeSingle();
      myShopAnyStatus = data?.id ?? null;
    }

    return NextResponse.json({
      ready: true,
      shops: withLoc,
      products: (products ?? []).filter((p) => active.has(p.shopId)),
      myShopId: myShopAnyStatus,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
