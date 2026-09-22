import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const communityId = searchParams.get("communityId");
    const type = searchParams.get("type"); // optional: 'INCOME' | 'EXPENSE'

    if (!communityId) {
      return NextResponse.json(
        { error: "communityId wajib disertakan." },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from("financial_categories")
      .select("*")
      .eq("communityId", communityId)
      .order("isSystem", { ascending: false })
      .order("name", { ascending: true });

    if (type && (type === "INCOME" || type === "EXPENSE")) {
      query = query.eq("type", type);
    }

    const { data: categories, error } = await query;

    if (error) {
      console.error("Get financial categories error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ categories: categories || [] });
  } catch (err: any) {
    console.error("API /api/kas/categories GET error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { communityId, name, type = "EXPENSE", description } = body;

    if (!communityId || !name || !name.trim()) {
      return NextResponse.json(
        { error: "communityId dan nama pos wajib diisi." },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    // Generate clean unique code
    const generatedCode =
      trimmedName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "_")
        .slice(0, 30) + `_${Date.now().toString().slice(-4)}`;

    const newCategory = {
      id: `fincat_${Date.now()}`,
      communityId,
      name: trimmedName,
      code: generatedCode,
      type: type === "INCOME" ? "INCOME" : "EXPENSE",
      description: description?.trim() || null,
      isSystem: false, // User custom category can never be system
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("financial_categories")
      .insert(newCategory)
      .select()
      .single();

    if (error) {
      console.error("Create financial category error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, category: data });
  } catch (err: any) {
    console.error("API /api/kas/categories POST error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, name, description } = body;

    if (!id || !name || !name.trim()) {
      return NextResponse.json(
        { error: "ID dan nama pos wajib disertakan." },
        { status: 400 }
      );
    }

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("financial_categories")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json(
        { error: "Pos kategori tidak ditemukan." },
        { status: 404 }
      );
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("financial_categories")
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      console.error("Update financial category error:", updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, category: updated });
  } catch (err: any) {
    console.error("API /api/kas/categories PATCH error:", err);
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
      return NextResponse.json({ error: "ID kategori wajib disertakan." }, { status: 400 });
    }

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("financial_categories")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json(
        { error: "Pos kategori tidak ditemukan." },
        { status: 404 }
      );
    }

    if (existing.isSystem) {
      return NextResponse.json(
        { error: "Pos bawaan sistem tidak dapat dihapus." },
        { status: 403 }
      );
    }

    const { error: deleteErr } = await supabaseAdmin
      .from("financial_categories")
      .delete()
      .eq("id", id);

    if (deleteErr) {
      console.error("Delete financial category error:", deleteErr);
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error("API /api/kas/categories DELETE error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
