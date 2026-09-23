import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
// Reminders (H-1 kegiatan, imunisasi) are created by the scheduled job in src/lib/reminders/server.ts
// (pg_cron -> /api/cron/reminders), so reading notifications has no side effects.

// GET ?userId -> latest notifications + unread count
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId wajib disertakan." }, { status: 400 });


    const [{ data, error }, { count }] = await Promise.all([
      supabaseAdmin.from("notifications").select("*").eq("userId", userId).order("createdAt", { ascending: false }).limit(50),
      supabaseAdmin.from("notifications").select("id", { count: "exact", head: true }).eq("userId", userId).is("readAt", null),
    ]);
    if (error) return NextResponse.json({ error: error.message, ready: false }, { status: 500 });
    return NextResponse.json({ ready: true, notifications: data ?? [], unread: count ?? 0 });
  } catch (err: any) {
    console.error("API /api/notifications GET error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// PATCH { userId, ids?: string[], all?: boolean } -> mark as read
export async function PATCH(req: Request) {
  try {
    const { userId, ids, all } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId wajib disertakan." }, { status: 400 });
    let q = supabaseAdmin.from("notifications").update({ readAt: new Date().toISOString() }).eq("userId", userId).is("readAt", null);
    if (!all) {
      if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ success: true });
      q = q.in("id", ids);
    }
    const { error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("API /api/notifications PATCH error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
