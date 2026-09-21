import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const communityId = searchParams.get("communityId");
    const status = searchParams.get("status");

    if (!communityId) {
      return NextResponse.json(
        { error: "communityId wajib disertakan." },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from("letter_requests")
      .select("*, template:letter_templates(*)")
      .eq("communityId", communityId)
      .order("createdAt", { ascending: false });

    if (status && status !== "ALL") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Get letter requests error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ requests: data || [] });
  } catch (err: any) {
    console.error("API /api/surat/requests GET error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      communityId,
      templateId,
      applicantName,
      applicantNik,
      applicantPhone,
      applicantAddress,
      purpose,
      extraData = {},
      attachments = [],
      applicantSignature,
      requireSecretary = false,
    } = body;

    if (!communityId || !applicantName || !applicantNik || !purpose) {
      return NextResponse.json(
        { error: "communityId, applicantName, applicantNik, dan purpose wajib diisi." },
        { status: 400 }
      );
    }

    // Generate Request Number: REQ-YYYYMM-XXXX
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const requestNumber = `REQ-${dateStr}-${randomSuffix}`;

    const newRequest = {
      id: `req_${Date.now()}`,
      communityId,
      templateId: templateId || null,
      requestNumber,
      applicantName: applicantName.trim(),
      applicantNik: applicantNik.trim(),
      applicantPhone: applicantPhone?.trim() || "081234567890",
      applicantAddress: applicantAddress?.trim() || "",
      purpose: purpose.trim(),
      extraData,
      attachments,
      status: requireSecretary ? "PENDING_REVIEW" : "WAITING_SIGNATURE",
      applicantSignature: applicantSignature || null,
      applicantSignedAt: applicantSignature ? now.toISOString() : null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("letter_requests")
      .insert(newRequest)
      .select("*, template:letter_templates(*)")
      .single();

    if (error) {
      console.error("Create letter request error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, request: data });
  } catch (err: any) {
    console.error("API /api/surat/requests POST error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      action, // 'APPROVE_SECRETARY' | 'SIGN_RT' | 'REJECT'
      rtSignature,
      rtSignedBy,
      rejectionReason,
      notes,
    } = body;

    if (!id || !action) {
      return NextResponse.json(
        { error: "id dan action wajib disertakan." },
        { status: 400 }
      );
    }

    const now = new Date();
    const payload: Record<string, any> = {
      updatedAt: now.toISOString(),
    };

    if (action === "APPROVE_SECRETARY") {
      payload.status = "WAITING_SIGNATURE";
      payload.secretaryReview = {
        status: "APPROVED",
        reviewedAt: now.toISOString(),
        notes: notes || "Telah diverifikasi oleh Sekretaris RT.",
      };
    } else if (action === "SIGN_RT") {
      // Final Approval & Sign by Ketua RT
      // Generate Official Letter Number: 470/[RT]/[RW]/[MONTH_ROMAN]/[YEAR]
      const romanMonths = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
      const romanMonth = romanMonths[now.getMonth()];
      const letterSeq = Math.floor(10 + Math.random() * 90);
      const issuedNumber = `470/${letterSeq}/RT04/RW09/${romanMonth}/${now.getFullYear()}`;

      payload.status = "APPROVED";
      payload.issuedNumber = issuedNumber;
      payload.issuedAt = now.toISOString();
      payload.rtSignature = rtSignature || null;
      payload.rtSignedBy = rtSignedBy || "Bpk. Bambang Sujatmiko (Ketua RT)";
      payload.rtSignedAt = now.toISOString();
    } else if (action === "REJECT") {
      payload.status = "REJECTED";
      payload.rejectionReason = rejectionReason || "Data permohonan belum lengkap.";
    }

    const { data, error } = await supabaseAdmin
      .from("letter_requests")
      .update(payload)
      .eq("id", id)
      .select("*, template:letter_templates(*)")
      .single();

    if (error) {
      console.error("Update letter request status error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, request: data });
  } catch (err: any) {
    console.error("API /api/surat/requests PATCH error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
