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
      .from("letter_templates")
      .select("*")
      .eq("communityId", communityId)
      .eq("isActive", true)
      .order("title", { ascending: true });

    if (error) {
      console.error("Get letter templates error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ templates: data || [] });
  } catch (err: any) {
    console.error("API /api/surat/templates GET error:", err);
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
      title,
      code,
      description,
      category = "UMUM",
      requiredDocs = [],
      components = [],
      approvalWorkflow = { requireSecretary: false, requireRT: true },
    } = body;

    if (!communityId || !title || !code) {
      return NextResponse.json(
        { error: "communityId, title, dan code wajib diisi." },
        { status: 400 }
      );
    }

    const templateId = `tmpl_${Date.now()}`;
    const newTemplate = {
      id: templateId,
      communityId,
      title: title.trim(),
      code: code.trim().toUpperCase(),
      description: description?.trim() || null,
      category,
      requiredDocs,
      components,
      approvalWorkflow,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("letter_templates")
      .insert(newTemplate)
      .select()
      .single();

    if (error) {
      console.error("Create letter template error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, template: data });
  } catch (err: any) {
    console.error("API /api/surat/templates POST error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, title, description, category, requiredDocs, components, approvalWorkflow, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Template id wajib disertakan." },
        { status: 400 }
      );
    }

    const payload: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (title !== undefined) payload.title = title.trim();
    if (description !== undefined) payload.description = description.trim();
    if (category !== undefined) payload.category = category;
    if (requiredDocs !== undefined) payload.requiredDocs = requiredDocs;
    if (components !== undefined) payload.components = components;
    if (approvalWorkflow !== undefined) payload.approvalWorkflow = approvalWorkflow;
    if (isActive !== undefined) payload.isActive = isActive;

    const { data, error } = await supabaseAdmin
      .from("letter_templates")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Update letter template error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, template: data });
  } catch (err: any) {
    console.error("API /api/surat/templates PUT error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
