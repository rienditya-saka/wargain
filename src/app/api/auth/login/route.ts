import { NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabase-client";
import { SessionTenant } from "@/lib/types/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan kata sandi wajib diisi." },
        { status: 400 }
      );
    }

    // Authenticate using Supabase Auth
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      let errorMessage = error?.message || "Gagal otentikasi Supabase.";
      if (
        errorMessage.toLowerCase().includes("invalid login credentials") ||
        errorMessage.toLowerCase().includes("invalid_grant")
      ) {
        errorMessage = "Email atau kata sandi Supabase Anda tidak valid.";
      }
      return NextResponse.json(
        { error: errorMessage },
        { status: 401 }
      );
    }

    const metadata = data.user.user_metadata || {};
    const isMockActive = email.includes("active");

    const sessionData: SessionTenant = {
      userId: data.user.id,
      email: data.user.email || email,
      fullName: metadata.fullName || (email.split("@")[0].toUpperCase() + " (Ketua RT)"),
      communityId: metadata.communityId || "comm_rt04_mekar",
      communityName: metadata.communityName || "RT 04 / RW 09 Kel. Mekar",
      communitySlug: metadata.communitySlug || "rt04-rw09-mekar",
      role: metadata.role || "TENANT_ADMIN",
      isTenantActive: metadata.isTenantActive ?? isMockActive,
      planTier: metadata.planTier || "RT_STANDARD",
      planStatus: metadata.planStatus || (isMockActive ? "ACTIVE" : "PENDING_PAYMENT"),
      supabaseToken: data.session?.access_token,
    };

    return NextResponse.json({
      success: true,
      message: "Login Supabase Auth berhasil.",
      session: sessionData,
      supabaseToken: data.session?.access_token,
    });
  } catch (error: any) {
    console.error("Supabase Login error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal memproses login Supabase Auth." },
      { status: 500 }
    );
  }
}
