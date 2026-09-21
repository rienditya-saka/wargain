import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const communityId = searchParams.get("communityId");

    if (!communityId) {
      return NextResponse.json(
        { error: "Parameter communityId wajib disertakan." },
        { status: 400 }
      );
    }

    // 1. Fetch houses
    const { data: houses, error: houseError } = await supabaseAdmin
      .from("houses")
      .select("*")
      .eq("communityId", communityId)
      .order("blockNumber", { ascending: true });

    if (houseError) {
      console.error("Supabase houses fetch error:", houseError);
      return NextResponse.json({ error: houseError.message }, { status: 500 });
    }

    // 2. Fetch family cards
    const { data: familyCards, error: kkError } = await supabaseAdmin
      .from("family_cards")
      .select("*")
      .eq("communityId", communityId)
      .order("noKK", { ascending: true });

    if (kkError) {
      console.error("Supabase family_cards fetch error:", kkError);
      return NextResponse.json({ error: kkError.message }, { status: 500 });
    }

    // 3. Fetch citizens
    const { data: citizens, error: citError } = await supabaseAdmin
      .from("citizens")
      .select("*")
      .eq("communityId", communityId)
      .order("role", { ascending: true });

    if (citError) {
      console.error("Supabase citizens fetch error:", citError);
      return NextResponse.json({ error: citError.message }, { status: 500 });
    }

    return NextResponse.json({
      houses: houses || [],
      familyCards: familyCards || [],
      citizens: citizens || [],
    });
  } catch (err: any) {
    console.error("API /api/kependudukan GET error:", err);
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
      noKK,
      headName,
      blockNumber,
      address,
      phone,
      residencyType = "TETAP",
      socialCategory = "SEJAHTERA",
      occupancyStatus = "MILIK_SENDIRI",
      members = [],
    } = body;

    if (!communityId || !noKK || !headName || !blockNumber) {
      return NextResponse.json(
        { error: "communityId, noKK, headName, dan blockNumber wajib diisi." },
        { status: 400 }
      );
    }

    const familyCardId = `kk_${Date.now()}`;

    // 1. Insert Family Card
    const newFamilyCard = {
      id: familyCardId,
      communityId,
      noKK: noKK.trim(),
      headName: headName.trim(),
      blockNumber: blockNumber.trim().toUpperCase(),
      address: address?.trim() || `${blockNumber.trim().toUpperCase()}`,
      phone: phone?.trim() || "081234567890",
      residencyType,
      socialCategory,
      occupancyStatus,
      lat: -6.2088 + (Math.random() - 0.5) * 0.003,
      lng: 106.8456 + (Math.random() - 0.5) * 0.003,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { data: insertedKK, error: kkInsertErr } = await supabaseAdmin
      .from("family_cards")
      .insert(newFamilyCard)
      .select()
      .single();

    if (kkInsertErr) {
      console.error("Insert KK error:", kkInsertErr);
      return NextResponse.json({ error: kkInsertErr.message }, { status: 500 });
    }

    // 2. Insert Citizens (Members)
    if (members && members.length > 0) {
      const citizenRecords = members.map((m: any, idx: number) => ({
        id: `cit_${Date.now()}_${idx}`,
        communityId,
        familyCardId,
        nik: m.nik?.trim() || `${noKK.slice(0, 12)}${String(idx + 1).padStart(4, "0")}`,
        fullName: m.fullName.trim(),
        role: m.role || (idx === 0 ? "KEPALA_KELUARGA" : "ANAK"),
        gender: m.gender || "L",
        age: Number(m.age) || 0,
        phone: idx === 0 ? phone?.trim() : undefined,
        maritalStatus: m.maritalStatus || (m.role === "ANAK" ? "BELUM KAWIN" : "KAWIN"),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      const { error: citInsertErr } = await supabaseAdmin
        .from("citizens")
        .insert(citizenRecords);

      if (citInsertErr) {
        console.error("Insert citizens error:", citInsertErr);
      }
    }

    // 3. Link or create house if applicable
    const { data: existingHouse } = await supabaseAdmin
      .from("houses")
      .select("id")
      .eq("communityId", communityId)
      .ilike("blockNumber", blockNumber.trim())
      .maybeSingle();

    if (existingHouse) {
      await supabaseAdmin
        .from("houses")
        .update({
          currentKKId: familyCardId,
          occupancyStatus: "DITEMPATI",
          occupantName: headName.trim(),
          occupantPhone: phone?.trim() || "081234567890",
          totalResidents: Math.max(1, members.length),
          updatedAt: new Date().toISOString(),
        })
        .eq("id", existingHouse.id);

      await supabaseAdmin
        .from("family_cards")
        .update({ houseId: existingHouse.id })
        .eq("id", familyCardId);
    }

    return NextResponse.json({
      success: true,
      familyCard: insertedKK,
    });
  } catch (err: any) {
    console.error("API /api/kependudukan POST error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
