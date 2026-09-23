import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { MODULES, NOTIFICATION_TYPES } from "@/lib/notifications/registry";

// GET ?userId -> { mutedModules, mutedTypes }
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId wajib disertakan." }, { status: 400 });
  const { data } = await supabaseAdmin.from("notification_preferences").select("*").eq("userId", userId).maybeSingle();
  return NextResponse.json({ mutedModules: data?.mutedModules ?? [], mutedTypes: data?.mutedTypes ?? [] });
}

// PUT { userId, mutedModules, mutedTypes }
export async function PUT(req: Request) {
  try {
    const { userId, mutedModules = [], mutedTypes = [] } = await req.json();
    const { data: user } = await supabaseAdmin.from("users").select("id, communityId").eq("id", userId).maybeSingle();
    if (!user) return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
    // URGENT types are always delivered, so they are never stored as muted.
    const cleanModules = (mutedModules as string[]).filter((m) => m in MODULES);
    const cleanTypes = (mutedTypes as string[]).filter((t) => NOTIFICATION_TYPES[t] && NOTIFICATION_TYPES[t].priority !== "URGENT");
    const { error } = await supabaseAdmin.from("notification_preferences").upsert(
      { userId, communityId: user.communityId, mutedModules: cleanModules, mutedTypes: cleanTypes, updatedAt: new Date().toISOString() },
      { onConflict: "userId" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, mutedModules: cleanModules, mutedTypes: cleanTypes });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
