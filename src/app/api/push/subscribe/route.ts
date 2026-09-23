import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// POST { userId, subscription: PushSubscriptionJSON } -> register this device
export async function POST(req: Request) {
  try {
    const { userId, subscription } = await req.json();
    const endpoint = subscription?.endpoint;
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;
    if (!userId || !endpoint || !p256dh || !auth) return NextResponse.json({ error: "Data langganan tidak lengkap." }, { status: 400 });
    if (!/^https:\/\//.test(endpoint)) return NextResponse.json({ error: "Endpoint tidak valid." }, { status: 400 });

    const { data: user } = await supabaseAdmin.from("users").select("id, communityId").eq("id", userId).maybeSingle();
    if (!user) return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });

    const now = new Date().toISOString();
    // The endpoint identifies the device; re-subscribing (or a different user on the same phone) takes it over.
    const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
      {
        id: `push_${Buffer.from(endpoint).toString("base64url").slice(-32)}`,
        userId,
        communityId: user.communityId,
        endpoint,
        p256dh,
        auth,
        userAgent: req.headers.get("user-agent")?.slice(0, 200) ?? null,
        failCount: 0,
        updatedAt: now,
      },
      { onConflict: "endpoint" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const { count } = await supabaseAdmin.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("userId", userId);
    return NextResponse.json({ success: true, devices: count ?? 1 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// DELETE { userId, endpoint } -> this device stops receiving push
export async function DELETE(req: Request) {
  try {
    const { userId, endpoint } = await req.json();
    if (!userId || !endpoint) return NextResponse.json({ error: "userId & endpoint wajib." }, { status: 400 });
    await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("userId", userId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
