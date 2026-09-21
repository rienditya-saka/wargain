import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      communityId,
      blockNumber,
      address,
      rtRw = "004/009",
      occupancyStatus = "KOSONG",
      ownerName,
      ownerPhone = "081234567890",
      ownerAddress,
      currentKKId,
      occupantName,
      occupantPhone,
      totalResidents = 0,
      lat = -6.2088,
      lng = 106.8456,
      notes,
    } = body;

    if (!communityId || !blockNumber || !ownerName) {
      return NextResponse.json(
        { error: "communityId, blockNumber, dan ownerName wajib diisi." },
        { status: 400 }
      );
    }

    const houseId = `house_${Date.now()}`;
    const newHouse = {
      id: houseId,
      communityId,
      blockNumber: blockNumber.trim().toUpperCase(),
      address: address?.trim() || `${blockNumber.trim().toUpperCase()} RT/RW ${rtRw}`,
      rtRw,
      occupancyStatus,
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone.trim(),
      ownerAddress: ownerAddress?.trim() || null,
      currentKKId: currentKKId || null,
      occupantName: occupantName?.trim() || null,
      occupantPhone: occupantPhone?.trim() || null,
      totalResidents: Number(totalResidents) || 0,
      lat: Number(lat) || -6.2088,
      lng: Number(lng) || 106.8456,
      notes: notes?.trim() || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("houses")
      .insert(newHouse)
      .select()
      .single();

    if (error) {
      console.error("Create house error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Bidirectional sync: if currentKKId is set, update family_cards.houseId
    if (currentKKId) {
      await supabaseAdmin
        .from("family_cards")
        .update({
          houseId,
          blockNumber: blockNumber.trim().toUpperCase(),
          updatedAt: new Date().toISOString(),
        })
        .eq("id", currentKKId);
    }

    return NextResponse.json({ success: true, house: data });
  } catch (err: any) {
    console.error("API /api/kependudukan/houses POST error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, communityId, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "House id wajib disertakan." }, { status: 400 });
    }

    const payload: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (updates.blockNumber !== undefined) payload.blockNumber = updates.blockNumber.trim().toUpperCase();
    if (updates.address !== undefined) payload.address = updates.address.trim();
    if (updates.rtRw !== undefined) payload.rtRw = updates.rtRw;
    if (updates.occupancyStatus !== undefined) payload.occupancyStatus = updates.occupancyStatus;
    if (updates.ownerName !== undefined) payload.ownerName = updates.ownerName.trim();
    if (updates.ownerPhone !== undefined) payload.ownerPhone = updates.ownerPhone.trim();
    if (updates.ownerAddress !== undefined) payload.ownerAddress = updates.ownerAddress?.trim() || null;
    if (updates.currentKKId !== undefined) payload.currentKKId = updates.currentKKId || null;
    if (updates.occupantName !== undefined) payload.occupantName = updates.occupantName?.trim() || null;
    if (updates.occupantPhone !== undefined) payload.occupantPhone = updates.occupantPhone?.trim() || null;
    if (updates.totalResidents !== undefined) payload.totalResidents = Number(updates.totalResidents);
    if (updates.lat !== undefined) payload.lat = Number(updates.lat);
    if (updates.lng !== undefined) payload.lng = Number(updates.lng);
    if (updates.notes !== undefined) payload.notes = updates.notes?.trim() || null;

    const { data, error } = await supabaseAdmin
      .from("houses")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Update house error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If currentKKId is provided and changed, update the family card
    if (updates.currentKKId) {
      await supabaseAdmin
        .from("family_cards")
        .update({
          houseId: id,
          blockNumber: updates.blockNumber ? updates.blockNumber.trim().toUpperCase() : undefined,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", updates.currentKKId);
    }

    return NextResponse.json({ success: true, house: data });
  } catch (err: any) {
    console.error("API /api/kependudukan/houses PATCH error:", err);
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
      return NextResponse.json({ error: "House id wajib disertakan." }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("houses")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete house error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("API /api/kependudukan/houses DELETE error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
