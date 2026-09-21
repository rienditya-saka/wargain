import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { supabaseClient } from "@/lib/supabase-client";
import { SubscriptionTierCode, UserRole, SessionTenant } from "@/lib/types/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      fullName,
      email,
      password,
      phone,
      communityName,
      communitySlug,
      communityType = "government",
      country = "Indonesia",
      province = "DKI Jakarta",
      regency = "Jakarta Selatan",
      district = "Kebayoran Baru",
      urban = "Mekar",
      neighborhood = "RT 04 / RW 09",
      address = "",
      lat = "-6.2088",
      long = "106.8456",
      planTier = "RT_STANDARD",
    } = body;

    // 1. Validation
    if (!fullName || !email || !password || !phone || !communityName) {
      return NextResponse.json(
        { error: "Mohon lengkapi semua bidang data yang wajib diisi." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Kata sandi minimal harus 6 karakter." },
        { status: 400 }
      );
    }

    if (communityType === "government") {
      if (!province || !regency || !district || !urban || !neighborhood) {
        return NextResponse.json(
          {
            error:
              "Untuk tipe komunitas pemerintahan/RT-RW, hirarki alamat (Provinsi, Kota/Kab, Kec, Kel, RT/RW) wajib diisi.",
          },
          { status: 400 }
        );
      }
    }

    const generatedSlug =
      communitySlug ||
      communityName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    const communityId = `comm_${Date.now()}`;
    const invoiceId = `inv_${Date.now()}`;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    // Amount mapping
    const tierPrices: Record<SubscriptionTierCode, number> = {
      RT_STANDARD: 50000,
      RW_PRO: 175000,
      ENTERPRISE: 450000,
    };
    const price = tierPrices[planTier as SubscriptionTierCode] || 50000;

    // 2. Register User in Supabase Auth
    let supabaseUserId: string;
    
    // Attempt Admin Auth API first for automatic email confirmation
    const { data: adminAuthData, error: adminAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        fullName,
        phone,
        role: "TENANT_ADMIN",
        communityId,
        communityName,
        communitySlug: generatedSlug,
        planTier,
        isTenantActive: false,
        planStatus: "PENDING_PAYMENT",
      },
    });

    if (adminAuthError) {
      // Fallback to standard signUp if admin API has permission restriction
      const { data: clientAuthData, error: clientAuthError } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            fullName,
            phone,
            role: "TENANT_ADMIN",
            communityId,
            communityName,
            communitySlug: generatedSlug,
            planTier,
            isTenantActive: false,
            planStatus: "PENDING_PAYMENT",
          },
        },
      });

      if (clientAuthError) {
        let msg = clientAuthError.message;
        if (msg.includes("already registered") || msg.includes("already exists")) {
          msg = "Email ini sudah terdaftar di Supabase Auth. Silakan gunakan email lain atau login.";
        }
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      if (!clientAuthData.user) {
        return NextResponse.json(
          { error: "Gagal membuat pengguna di Supabase Auth." },
          { status: 500 }
        );
      }
      supabaseUserId = clientAuthData.user.id;
    } else {
      supabaseUserId = adminAuthData.user.id;
    }

    // 3. Construct Data Objects & Insert Records to Supabase Postgres Database Tables
    const newCommunity = {
      id: communityId,
      name: communityName,
      slug: generatedSlug,
      code: `WG-${Math.floor(100000 + Math.random() * 900000)}`,
      type: communityType,
      country,
      province,
      regency,
      district,
      urban,
      neighborhood,
      address: address || `${neighborhood}, Kel. ${urban}, ${district}, ${regency}`,
      lat,
      long,
      planTier: planTier as SubscriptionTierCode,
      planStatus: "PENDING_PAYMENT" as const,
      isActive: false, // ZERO-FREE TIER: Always false until paid
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newUser = {
      id: supabaseUserId,
      email,
      fullName,
      phone,
      role: "TENANT_ADMIN" as UserRole,
      communityId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newInvoice = {
      id: invoiceId,
      invoiceNumber,
      communityId,
      tier: planTier as SubscriptionTierCode,
      amount: price,
      periodMonths: 1,
      status: "PENDING_PAYMENT" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // DB Inserts via Supabase Admin (bypassing RLS)
    const { error: dbCommError } = await supabaseAdmin.from("communities").insert(newCommunity);
    if (dbCommError) {
      console.error("Supabase DB Insert Community Error:", dbCommError);
    }

    const { error: dbUserError } = await supabaseAdmin.from("users").insert({
      id: supabaseUserId,
      email,
      passwordHash: "SUPABASE_AUTH_MANAGED",
      fullName,
      phone,
      role: "TENANT_ADMIN",
      communityId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (dbUserError) {
      console.error("Supabase DB Insert User Error:", dbUserError);
    }

    const { error: dbInvError } = await supabaseAdmin.from("subscription_invoices").insert({
      id: invoiceId,
      invoiceNumber,
      communityId,
      tier: planTier as SubscriptionTierCode,
      amount: price,
      periodMonths: 1,
      status: "PENDING_PAYMENT",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (dbInvError) {
      console.error("Supabase DB Insert Invoice Error:", dbInvError);
    }

    // 4. Automatic Auth Sign-In for instant session access
    const { data: signInData } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    const sessionData: SessionTenant = {
      userId: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      communityId: newCommunity.id,
      communityName: newCommunity.name,
      communitySlug: newCommunity.slug,
      role: newUser.role,
      isTenantActive: newCommunity.isActive,
      planTier: newCommunity.planTier,
      planStatus: newCommunity.planStatus,
      supabaseToken: signInData?.session?.access_token,
    };

    return NextResponse.json({
      success: true,
      message: "Registrasi akun Supabase berhasil. Silakan selesaikan pembayaran langganan.",
      session: sessionData,
      supabaseToken: signInData?.session?.access_token,
      community: newCommunity,
      invoice: newInvoice,
    });
  } catch (error: any) {
    console.error("Supabase Register error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal memproses pendaftaran tenant ke Supabase." },
      { status: 500 }
    );
  }
}
