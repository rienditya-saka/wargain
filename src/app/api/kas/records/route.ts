import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const communityId = searchParams.get("communityId");

    if (!communityId) {
      return NextResponse.json(
        { error: "communityId wajib disertakan." },
        { status: 400 }
      );
    }

    const { data: records, error } = await supabaseAdmin
      .from("financial_records")
      .select("*")
      .eq("communityId", communityId)
      .order("transactionDate", { ascending: false });

    if (error) {
      console.error("Get financial records error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const list = records || [];
    const totalIncome = list
      .filter((r) => r.type === "INCOME")
      .reduce((acc, r) => acc + (r.amount || 0), 0);
    const totalExpense = list
      .filter((r) => r.type === "EXPENSE")
      .reduce((acc, r) => acc + (r.amount || 0), 0);
    const netBalance = totalIncome - totalExpense;

    return NextResponse.json({
      records: list,
      summary: {
        totalIncome,
        totalExpense,
        netBalance,
      },
    });
  } catch (err: any) {
    console.error("API /api/kas/records GET error:", err);
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
      type = "EXPENSE",
      category = "OPERASIONAL",
      title,
      amount,
      paymentMethod = "TUNAI",
      recordedBy = "Bendahara RT",
      notes,
      transactionDate,
    } = body;

    if (!communityId || !title || !amount) {
      return NextResponse.json(
        { error: "communityId, title, dan amount wajib diisi." },
        { status: 400 }
      );
    }

    const newRecord = {
      id: `fin_${Date.now()}`,
      communityId,
      type,
      category,
      title: title.trim(),
      amount: Number(amount),
      paymentMethod,
      recordedBy,
      notes: notes?.trim() || null,
      transactionDate: transactionDate || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("financial_records")
      .insert(newRecord)
      .select()
      .single();

    if (error) {
      console.error("Create financial record error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, record: data });
  } catch (err: any) {
    console.error("API /api/kas/records POST error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
