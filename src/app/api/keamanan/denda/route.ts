import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { onFineIssued } from "@/lib/kas/hooks";

// Issues a ronda fine as a regular Kas bill (generated_bills), so it shows up
// in the Kas module and gets paid through the existing MARK_PAID flow.
export async function POST(req: Request) {
  try {
    const { communityId, fine } = await req.json();
    if (!communityId || !fine?.id || !fine?.houseBlock || !fine?.memberName) {
      return NextResponse.json({ error: "communityId dan data denda wajib diisi." }, { status: 400 });
    }

    const amount = Math.max(0, Math.round(Number(fine.amount) || 0));
    if (amount === 0) {
      return NextResponse.json({ error: "Nominal denda harus lebih dari 0." }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from("security_ronda_fines")
      .select("*")
      .eq("shiftId", fine.shiftId)
      .eq("memberName", fine.memberName)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ success: true, fine: existing, duplicated: true });
    }

    const { data: house, error: houseErr } = await supabaseAdmin
      .from("houses")
      .select("id, blockNumber, address, ownerName, ownerPhone, occupantName, occupantPhone")
      .eq("communityId", communityId)
      .ilike("blockNumber", String(fine.houseBlock).trim())
      .limit(1)
      .maybeSingle();

    if (houseErr) {
      return NextResponse.json({ error: houseErr.message }, { status: 500 });
    }
    if (!house) {
      return NextResponse.json(
        { error: `Rumah ${fine.houseBlock} belum terdaftar di Data Kependudukan, tagihan Kas tidak bisa diterbitkan.` },
        { status: 404 }
      );
    }

    const now = new Date();
    const billId = `bill_${now.getTime()}`;
    const billNumber = `DND-${fine.shiftDate.replace(/-/g, "")}-${house.blockNumber.replace(/[^A-Z0-9]/gi, "")}-${now.getTime().toString().slice(-4)}`;
    const periodDate = new Date(`${fine.shiftDate}T00:00:00`);

    const { error: billErr } = await supabaseAdmin.from("generated_bills").insert({
      id: billId,
      communityId,
      masterBillingId: null,
      billNumber,
      title: "Denda Tidak Ronda",
      periodKey: fine.shiftDate,
      periodLabel: periodDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
      houseId: house.id,
      houseBlock: house.blockNumber,
      houseAddress: house.address,
      accountName: house.occupantName || house.ownerName || fine.memberName,
      accountPhone: house.occupantPhone || house.ownerPhone || "081234567890",
      targetType: house.occupantName ? "PENGHUNI" : "PEMILIK",
      chargeBasis: "PER_RUMAH",
      multiplier: 1,
      multiplierLabel: "1 Rumah",
      baseAmount: amount,
      discountAmount: 0,
      totalAmount: amount,
      status: "UNPAID",
      paidAmount: 0,
      notes: `Denda ronda ${fine.memberName} (alpa) jadwal ${fine.shiftDate}`,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    if (billErr) {
      return NextResponse.json({ error: billErr.message }, { status: 500 });
    }

    const fineRow = {
      id: fine.id,
      communityId,
      shiftId: fine.shiftId,
      shiftDate: fine.shiftDate,
      memberName: fine.memberName,
      houseBlock: house.blockNumber,
      amount,
      status: "TERBIT",
      billId,
      billNumber,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    const { data: saved, error: fineErr } = await supabaseAdmin
      .from("security_ronda_fines")
      .insert(fineRow)
      .select()
      .single();
    if (fineErr) {
      return NextResponse.json({ error: fineErr.message }, { status: 500 });
    }

    await onFineIssued(communityId, saved, house.id);

    return NextResponse.json({ success: true, fine: saved });
  } catch (err: any) {
    console.error("API /api/keamanan/denda POST error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
