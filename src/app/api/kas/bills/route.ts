import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const communityId = searchParams.get("communityId");
    const periodKey = searchParams.get("periodKey");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    if (!communityId) {
      return NextResponse.json(
        { error: "communityId wajib disertakan." },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from("generated_bills")
      .select("*")
      .eq("communityId", communityId)
      .order("houseBlock", { ascending: true });

    if (periodKey && periodKey !== "ALL") {
      query = query.eq("periodKey", periodKey);
    }

    if (status && status !== "ALL") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Get bills error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let filtered = data || [];
    if (search && search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.accountName?.toLowerCase().includes(q) ||
          b.houseBlock?.toLowerCase().includes(q) ||
          b.billNumber?.toLowerCase().includes(q) ||
          b.title?.toLowerCase().includes(q)
      );
    }

    // Compute metrics
    const totalCount = filtered.length;
    const totalAmount = filtered.reduce((acc, b) => acc + (b.totalAmount || 0), 0);
    const paidBills = filtered.filter((b) => b.status === "PAID");
    const paidAmount = paidBills.reduce((acc, b) => acc + (b.paidAmount || b.totalAmount || 0), 0);
    const unpaidBills = filtered.filter((b) => b.status === "UNPAID");
    const unpaidAmount = unpaidBills.reduce((acc, b) => acc + (b.totalAmount || 0), 0);

    return NextResponse.json({
      bills: filtered,
      metrics: {
        totalCount,
        totalAmount,
        paidCount: paidBills.length,
        paidAmount,
        unpaidCount: unpaidBills.length,
        unpaidAmount,
        collectionPercentage: totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0,
      },
    });
  } catch (err: any) {
    console.error("API /api/kas/bills GET error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, action, paymentMethod = "TUNAI_BENDAHARA", notes, recordedBy = "Bendahara RT" } = body;

    if (!id) {
      return NextResponse.json({ error: "Bill id wajib disertakan." }, { status: 400 });
    }

    const { data: currentBill, error: fetchErr } = await supabaseAdmin
      .from("generated_bills")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !currentBill) {
      return NextResponse.json({ error: "Tagihan tidak ditemukan." }, { status: 404 });
    }

    if (action === "MARK_PAID") {
      const paidAt = new Date().toISOString();
      const paidAmount = currentBill.totalAmount;

      const { data: updated, error: updateErr } = await supabaseAdmin
        .from("generated_bills")
        .update({
          status: "PAID",
          paidAt,
          paidAmount,
          paymentMethod,
          notes: notes?.trim() || currentBill.notes,
          updatedAt: paidAt,
        })
        .eq("id", id)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      // Automatically sync income to financial_records (Buku Kas)
      await supabaseAdmin.from("financial_records").insert({
        id: `fin_${Date.now()}`,
        communityId: currentBill.communityId,
        billId: currentBill.id,
        type: "INCOME",
        category: "IURAN_WARGA",
        title: `Penerimaan ${currentBill.title} - ${currentBill.houseBlock} (${currentBill.accountName})`,
        amount: paidAmount,
        paymentMethod: paymentMethod || "TUNAI",
        recordedBy,
        notes: `Pelunasan tagihan ${currentBill.billNumber} via ${paymentMethod}`,
        transactionDate: paidAt,
      });

      return NextResponse.json({ success: true, bill: updated });
    } else if (action === "CANCEL") {
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from("generated_bills")
        .update({
          status: "CANCELLED",
          notes: notes?.trim() || "Dibatalkan oleh Pengurus RT",
          updatedAt: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, bill: updated });
    }

    return NextResponse.json({ error: "Action tidak dikenal." }, { status: 400 });
  } catch (err: any) {
    console.error("API /api/kas/bills PATCH error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
