import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendPush } from "@/lib/push/server";

// POST { userId } -> sends a test notification to all of this user's devices (not stored in the bell).
export async function POST(req: Request) {
  const { userId } = await req.json();
  const { data: user } = await supabaseAdmin.from("users").select("id, fullName").eq("id", userId).maybeSingle();
  if (!user) return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
  const result = await sendPush([
    {
      id: `test_${Date.now()}`,
      userId,
      type: "SISTEM_TEST",
      title: "🔔 Notifikasi WargaIn aktif",
      body: `Halo ${user.fullName.split(" ")[0]}, pengumuman, pengingat posyandu & sinyal darurat akan muncul di HP ini.`,
      link: "/feed",
      priority: "HIGH",
      createdAt: new Date().toISOString(),
    },
  ]);
  if (!result.sent) return NextResponse.json({ error: "Belum ada perangkat yang aktif untuk akun ini." }, { status: 404 });
  return NextResponse.json({ success: true, ...result });
}
