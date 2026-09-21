import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { SessionTenant } from "@/lib/types/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, communityId, userId } = body;

    if (!email && !communityId && !userId) {
      return NextResponse.json(
        { error: "Kredensial identitas pengguna wajib diisi." },
        { status: 400 }
      );
    }

    // 1. Fetch User details from DB or Auth
    let userRow: any = null;
    let targetCommunityId = communityId;
    let targetUserId = userId;

    if (email) {
      const { data: dbUser } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (dbUser) {
        userRow = dbUser;
        targetCommunityId = dbUser.communityId;
        targetUserId = dbUser.id;
      }
    }

    if (!targetCommunityId && targetUserId) {
      const { data: dbUser } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("id", targetUserId)
        .single();
      if (dbUser) {
        userRow = dbUser;
        targetCommunityId = dbUser.communityId;
      }
    }

    // 2. Fetch live community record from Supabase Postgres
    let communityRow: any = null;
    if (targetCommunityId) {
      const { data: dbComm } = await supabaseAdmin
        .from("communities")
        .select("*")
        .eq("id", targetCommunityId)
        .single();

      if (dbComm) {
        communityRow = dbComm;
      }
    }

    // 3. Fallback check to auth.users raw_user_meta_data if DB record is pending
    if (!communityRow && targetUserId) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
      if (authUser?.user) {
        const meta = authUser.user.user_metadata || {};
        const isTenantActive = meta.isTenantActive ?? false;
        const planStatus = meta.planStatus || "PENDING_PAYMENT";

        const sessionData: SessionTenant = {
          userId: authUser.user.id,
          email: authUser.user.email || email,
          fullName: meta.fullName || "Pengurus RT",
          communityId: meta.communityId || targetCommunityId || "comm_default",
          communityName: meta.communityName || "Komunitas WargaIn",
          communitySlug: meta.communitySlug || "komunitas-wargain",
          role: meta.role || "TENANT_ADMIN",
          isTenantActive,
          planTier: meta.planTier || "RT_STANDARD",
          planStatus,
        };

        return NextResponse.json({
          success: true,
          session: sessionData,
        });
      }
    }

    if (!communityRow && !userRow) {
      return NextResponse.json(
        { error: "Data komunitas tidak ditemukan di Supabase." },
        { status: 444 }
      );
    }

    const sessionData: SessionTenant = {
      userId: userRow?.id || targetUserId || `usr_${Date.now()}`,
      email: userRow?.email || email || "",
      fullName: userRow?.fullName || "Pengurus RT",
      communityId: communityRow?.id || targetCommunityId,
      communityName: communityRow?.name || "Komunitas RT/RW",
      communitySlug: communityRow?.slug || "rt-rw",
      role: userRow?.role || "TENANT_ADMIN",
      isTenantActive: communityRow?.isActive ?? false,
      planTier: communityRow?.planTier || "RT_STANDARD",
      planStatus: communityRow?.planStatus || "PENDING_PAYMENT",
    };

    // Update raw_user_meta_data in Auth if synced
    if (targetUserId) {
      await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        user_metadata: {
          isTenantActive: sessionData.isTenantActive,
          planStatus: sessionData.planStatus,
          planTier: sessionData.planTier,
          communityName: sessionData.communityName,
        },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      session: sessionData,
    });
  } catch (error: any) {
    console.error("Sync Session Error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal melakukan sinkronisasi sesi." },
      { status: 500 }
    );
  }
}
