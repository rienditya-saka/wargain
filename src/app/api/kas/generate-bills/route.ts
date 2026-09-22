import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      communityId,
      masterBillingId,
      periodKey: customPeriodKey,
      periodLabel: customPeriodLabel,
    } = body;

    if (!communityId) {
      return NextResponse.json(
        { error: "communityId wajib disertakan." },
        { status: 400 }
      );
    }

    // 1. Fetch Target Master Billing(s)
    let masterQuery = supabaseAdmin
      .from("master_billings")
      .select("*")
      .eq("communityId", communityId)
      .eq("isActive", true);

    if (masterBillingId && masterBillingId !== "ALL") {
      masterQuery = masterQuery.eq("id", masterBillingId);
    }

    const { data: masters, error: masterErr } = await masterQuery;
    if (masterErr || !masters || masters.length === 0) {
      return NextResponse.json(
        { error: "Master tagihan tidak ditemukan atau tidak aktif." },
        { status: 404 }
      );
    }

    // 2. Fetch all Houses in Community
    const { data: houses, error: houseErr } = await supabaseAdmin
      .from("houses")
      .select("*")
      .eq("communityId", communityId)
      .order("blockNumber", { ascending: true });

    if (houseErr || !houses || houses.length === 0) {
      return NextResponse.json(
        { error: "Belum ada data rumah/kavling yang terdaftar di komunitas ini." },
        { status: 404 }
      );
    }

    // 3. Fetch Family Cards to accurately count KK per house
    const { data: familyCards } = await supabaseAdmin
      .from("family_cards")
      .select("id, houseId, blockNumber, headName")
      .eq("communityId", communityId);

    const houseKKMap = new Map<string, number>();
    (familyCards || []).forEach((kk) => {
      if (kk.houseId) {
        houseKKMap.set(kk.houseId, (houseKKMap.get(kk.houseId) || 0) + 1);
      }
    });

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth() + 1;
    const monthNames = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const currentMonthName = monthNames[now.getMonth()];

    let createdBills: any[] = [];
    let skippedCount = 0;

    // 4. Iterate over each Master Billing Rule
    for (const master of masters) {
      // Determine default Period Key & Label based on frequency
      let periodKey = customPeriodKey;
      let periodLabel = customPeriodLabel;

      if (!periodKey || !periodLabel) {
        if (master.frequency === "WEEKLY") {
          // Simple weekly representation e.g. 2026-W38
          const weekNum = Math.ceil(now.getDate() / 7);
          periodKey = `${currentYear}-M${String(currentMonthNum).padStart(2, "0")}-W${weekNum}`;
          periodLabel = `Minggu ke-${weekNum} (${currentMonthName} ${currentYear})`;
        } else if (master.frequency === "YEARLY") {
          periodKey = `${currentYear}`;
          periodLabel = `Tahun ${currentYear}`;
        } else {
          // Monthly default
          periodKey = `${currentYear}-${String(currentMonthNum).padStart(2, "0")}`;
          periodLabel = `${currentMonthName} ${currentYear}`;
        }
      }

      // Check existing bills for this master and period to avoid duplicate batch generation
      const { data: existingBills } = await supabaseAdmin
        .from("generated_bills")
        .select("houseId")
        .eq("communityId", communityId)
        .eq("masterBillingId", master.id)
        .eq("periodKey", periodKey);

      const existingHouseIds = new Set((existingBills || []).map((b) => b.houseId));

      const billsToInsert: any[] = [];

      // 5. Generate bill for each House
      for (const house of houses) {
        if (existingHouseIds.has(house.id)) {
          skippedCount++;
          continue;
        }

        const isVacantOrRenov =
          house.occupancyStatus === "KOSONG" || house.occupancyStatus === "RENOVASI";

        // Route Account Name & Target Type
        let targetType: "PENGHUNI" | "PEMILIK" = "PENGHUNI";
        let accountName = house.occupantName || house.ownerName || "Warga Tanpa Nama";
        let accountPhone = house.occupantPhone || house.ownerPhone || "081234567890";

        if (master.targetAccountType === "PEMILIK" || isVacantOrRenov) {
          targetType = "PEMILIK";
          accountName = house.ownerName || "Pemilik Unit";
          accountPhone = house.ownerPhone || "081234567890";
        } else if (master.targetAccountType === "PENGHUNI") {
          targetType = "PENGHUNI";
          accountName = house.occupantName || house.ownerName || "Penghuni Unit";
          accountPhone = house.occupantPhone || house.ownerPhone || "081234567890";
        }

        // Calculate Multiplier, Discount, and Total
        let multiplier = 1;
        let multiplierLabel = "1 Rumah";
        let baseAmount = master.amount;
        let discountAmount = 0;
        let totalAmount = master.amount;

        if (master.chargeBasis === "PER_RUMAH") {
          multiplier = 1;
          multiplierLabel = `1 ${master.communityType === "KAPLING" ? "Kavling" : "Rumah"}`;
          baseAmount = master.amount;

          if (isVacantOrRenov && master.vacantDiscountPercent > 0) {
            discountAmount = Math.round((master.amount * master.vacantDiscountPercent) / 100);
            totalAmount = Math.max(0, master.amount - discountAmount);
          } else {
            totalAmount = master.amount;
          }
        } else if (master.chargeBasis === "PER_KK") {
          const kkCount = houseKKMap.get(house.id) || (isVacantOrRenov ? 0 : 1);
          multiplier = Math.max(0, kkCount);
          multiplierLabel = `${multiplier} KK`;
          baseAmount = master.amount;

          if (multiplier === 0 && isVacantOrRenov) {
            totalAmount = 0;
          } else {
            totalAmount = master.amount * multiplier;
          }
        } else if (master.chargeBasis === "PER_WARGA") {
          const residents = Number(house.totalResidents) || (isVacantOrRenov ? 0 : 1);
          multiplier = Math.max(0, residents);
          multiplierLabel = `${multiplier} Jiwa`;
          baseAmount = master.amount;

          if (multiplier === 0 && isVacantOrRenov) {
            totalAmount = 0;
          } else {
            totalAmount = master.amount * multiplier;
          }
        }

        // If totalAmount is 0 and house is vacant and chargeBasis is per KK/warga, skip unless specified
        if (totalAmount <= 0 && isVacantOrRenov && master.chargeBasis !== "PER_RUMAH") {
          continue;
        }

        const cleanBlock = (house.blockNumber || "UNIT").replace(/[^a-zA-Z0-9]/g, "");
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const billNumber = `TAG/${periodKey.replace(/[^a-zA-Z0-9]/g, "")}/${cleanBlock}/${randomSuffix}`;

        billsToInsert.push({
          id: `bill_${Date.now()}_${cleanBlock}_${randomSuffix}`,
          communityId,
          masterBillingId: master.id,
          billNumber,
          title: master.name,
          periodKey,
          periodLabel,
          houseId: house.id,
          houseBlock: house.blockNumber,
          houseAddress: house.address,
          accountName,
          accountPhone,
          targetType,
          chargeBasis: master.chargeBasis,
          multiplier,
          multiplierLabel,
          baseAmount,
          discountAmount,
          totalAmount,
          status: "UNPAID",
          paidAmount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      if (billsToInsert.length > 0) {
        const { data: inserted, error: insertErr } = await supabaseAdmin
          .from("generated_bills")
          .insert(billsToInsert)
          .select();

        if (insertErr) {
          console.error("Insert generated bills error:", insertErr);
        } else if (inserted) {
          createdBills = [...createdBills, ...inserted];
        }

        // Update lastGeneratedAt on master_billings
        await supabaseAdmin
          .from("master_billings")
          .update({
            lastGeneratedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .eq("id", master.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil men-generate ${createdBills.length} tagihan warga.`,
      generatedCount: createdBills.length,
      skippedCount,
      bills: createdBills,
    });
  } catch (err: any) {
    console.error("API /api/kas/generate-bills POST error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
