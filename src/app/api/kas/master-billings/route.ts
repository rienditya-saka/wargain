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

    const { data, error } = await supabaseAdmin
      .from("master_billings")
      .select("*")
      .eq("communityId", communityId)
      .order("createdAt", { ascending: false });

    if (error) {
      console.error("Get master billings error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ masterBillings: data || [] });
  } catch (err: any) {
    console.error("API /api/kas/master-billings GET error:", err);
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
      name,
      description,
      communityType = "CLUSTER",
      chargeBasis = "PER_RUMAH",
      targetAccountType = "AUTO",
      amount = 0,
      vacantDiscountPercent = 0,
      frequency = "MONTHLY",
      scheduleDay = 1,
      scheduleMonth = 1,
      scheduleTime = "01:00",
      isActive = true,
    } = body;

    if (!communityId || !name || amount === undefined) {
      return NextResponse.json(
        { error: "communityId, name, dan amount wajib diisi." },
        { status: 400 }
      );
    }

    const newMaster = {
      id: `mbill_${Date.now()}`,
      communityId,
      name: name.trim(),
      description: description?.trim() || null,
      communityType,
      chargeBasis,
      targetAccountType,
      amount: Number(amount),
      vacantDiscountPercent: Number(vacantDiscountPercent) || 0,
      frequency,
      scheduleDay: Number(scheduleDay) || 1,
      scheduleMonth: Number(scheduleMonth) || 1,
      scheduleTime: scheduleTime || "01:00",
      isActive: Boolean(isActive),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("master_billings")
      .insert(newMaster)
      .select()
      .single();

    if (error) {
      console.error("Create master billing error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, masterBilling: data });
  } catch (err: any) {
    console.error("API /api/kas/master-billings POST error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, communityId, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Master billing id wajib disertakan." },
        { status: 400 }
      );
    }

    const payload: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.description !== undefined) payload.description = updates.description.trim();
    if (updates.communityType !== undefined) payload.communityType = updates.communityType;
    if (updates.chargeBasis !== undefined) payload.chargeBasis = updates.chargeBasis;
    if (updates.targetAccountType !== undefined) payload.targetAccountType = updates.targetAccountType;
    if (updates.amount !== undefined) payload.amount = Number(updates.amount);
    if (updates.vacantDiscountPercent !== undefined) payload.vacantDiscountPercent = Number(updates.vacantDiscountPercent);
    if (updates.frequency !== undefined) payload.frequency = updates.frequency;
    if (updates.scheduleDay !== undefined) payload.scheduleDay = Number(updates.scheduleDay);
    if (updates.scheduleMonth !== undefined) payload.scheduleMonth = Number(updates.scheduleMonth);
    if (updates.scheduleTime !== undefined) payload.scheduleTime = updates.scheduleTime;
    if (updates.isActive !== undefined) payload.isActive = Boolean(updates.isActive);

    const { data, error } = await supabaseAdmin
      .from("master_billings")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Update master billing error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, masterBilling: data });
  } catch (err: any) {
    console.error("API /api/kas/master-billings PUT error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Master billing id wajib disertakan." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("master_billings")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete master billing error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Master billing berhasil dihapus." });
  } catch (err: any) {
    console.error("API /api/kas/master-billings DELETE error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
