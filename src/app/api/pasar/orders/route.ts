import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { OrderAction, PasarError, createOrder, loadActor, myShop, transition } from "@/lib/pasar/server";

const fail = (e: any) => NextResponse.json({ error: e.message || "Internal server error" }, { status: e instanceof PasarError ? e.status : 500 });
const SHOP_FIELDS = "id, name, logoUrl, phone, houseBlock, paymentMethods, ownerId";

// GET ?userId&scope=buyer|seller[&from&to] -> orders (with shop summary)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const actor = await loadActor(searchParams.get("userId"));
    const scope = searchParams.get("scope") === "seller" ? "seller" : "buyer";
    let q = supabaseAdmin.from("shop_orders").select(`*, shop:shops(${SHOP_FIELDS})`).order("createdAt", { ascending: false }).limit(200);
    if (scope === "seller") {
      const shop = await myShop(actor);
      if (!shop) return NextResponse.json({ orders: [] });
      q = q.eq("shopId", shop.id);
      const from = searchParams.get("from");
      const to = searchParams.get("to");
      if (from && to) q = q.gte("scheduledAt", from).lt("scheduledAt", to);
    } else {
      q = q.eq("buyerId", actor.id);
    }
    const { data, error } = await q;
    if (error) throw new PasarError(error.message, 500);
    return NextResponse.json({ orders: data ?? [] });
  } catch (e: any) {
    return fail(e);
  }
}

// POST { userId, shopId, items, fulfillment, paymentMethod, scheduledAt?, notes? }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const actor = await loadActor(body.userId);
    const order = await createOrder(actor, body);
    return NextResponse.json({ success: true, order });
  } catch (e: any) {
    return fail(e);
  }
}

// PATCH { userId, orderId, action, note?, proofUrl?, rating?, review? }
export async function PATCH(req: Request) {
  try {
    const { userId, orderId, action, ...payload } = await req.json();
    const actor = await loadActor(userId);
    const order = await transition(actor, orderId, action as OrderAction, payload);
    const { data } = await supabaseAdmin.from("shop_orders").select(`*, shop:shops(${SHOP_FIELDS})`).eq("id", order.id).single();
    return NextResponse.json({ success: true, order: data });
  } catch (e: any) {
    return fail(e);
  }
}
