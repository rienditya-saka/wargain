import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PasarError, loadActor, myShop } from "@/lib/pasar/server";
import { SHOP_CATEGORY_META } from "@/lib/pasar/types";
import { publishFeedPost } from "@/lib/feed/server";

const TIME = /^\d{2}:\d{2}$/;
const fail = (e: any) => NextResponse.json({ error: e.message || "Internal server error" }, { status: e instanceof PasarError ? e.status : 500 });

// GET ?userId -> my shop (any status)
export async function GET(req: Request) {
  try {
    const actor = await loadActor(new URL(req.url).searchParams.get("userId"));
    return NextResponse.json({ shop: await myShop(actor) });
  } catch (e: any) {
    return fail(e);
  }
}

// POST { userId, shop: {...} } -> create or update my shop
export async function POST(req: Request) {
  try {
    const { userId, shop: input } = await req.json();
    const actor = await loadActor(userId);
    const existing = await myShop(actor);
    if (!input?.name?.trim()) throw new PasarError("Nama lapak wajib diisi.");

    const hours = Array.isArray(input.weeklyHours)
      ? input.weeklyHours
          .filter((h: any) => Number.isInteger(h.day) && h.day >= 0 && h.day <= 6 && TIME.test(h.start) && TIME.test(h.end) && h.start < h.end)
          .map((h: any) => ({ day: h.day, start: h.start, end: h.end }))
      : undefined;
    const pm = input.paymentMethods ?? {};
    const transfer = pm.transfer?.bank && pm.transfer?.accountNo
      ? { bank: String(pm.transfer.bank).slice(0, 40), accountNo: String(pm.transfer.accountNo).replace(/[^\d-]/g, "").slice(0, 30), accountName: String(pm.transfer.accountName ?? "").slice(0, 60) }
      : null;
    const qris = pm.qris?.imageUrl ? { imageUrl: pm.qris.imageUrl } : null;
    if (!pm.cash && !transfer && !qris) throw new PasarError("Aktifkan minimal satu metode pembayaran.");

    const row: Record<string, unknown> = {
      name: input.name.trim().slice(0, 60),
      tagline: input.tagline?.trim().slice(0, 80) || null,
      description: (input.description ?? "").trim().slice(0, 1000),
      category: input.category in SHOP_CATEGORY_META ? input.category : "LAINNYA",
      logoUrl: input.logoUrl ?? null,
      bannerUrl: input.bannerUrl ?? null,
      phone: input.phone?.trim().slice(0, 20) || actor.phone,
      isOpen: input.isOpen ?? true,
      pickupEnabled: input.pickupEnabled ?? true,
      deliveryEnabled: input.deliveryEnabled ?? false,
      deliveryFee: Math.max(0, Math.round(Number(input.deliveryFee) || 0)),
      minOrder: Math.max(0, Math.round(Number(input.minOrder) || 0)),
      paymentMethods: { cash: !!pm.cash, transfer, qris },
      closedDates: Array.isArray(input.closedDates) ? input.closedDates.filter((d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(0, 60) : [],
      updatedAt: new Date().toISOString(),
    };
    if (hours) row.weeklyHours = hours;

    if (existing) {
      const { data, error } = await supabaseAdmin.from("shops").update(row).eq("id", existing.id).select().single();
      if (error) throw new PasarError(error.message, 500);
      return NextResponse.json({ success: true, shop: data });
    }

    const { data, error } = await supabaseAdmin
      .from("shops")
      .insert({ ...row, id: `shop_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, communityId: actor.communityId, ownerId: actor.id, houseBlock: actor.houseBlock, createdAt: row.updatedAt })
      .select()
      .single();
    if (error) throw new PasarError(error.message, 500);

    await publishFeedPost({
      communityId: actor.communityId, module: "PASAR", type: "GENERAL", entity: { type: "SHOP", id: data.id },
      title: `🎉 Lapak baru: ${data.name}`,
      content: `${SHOP_CATEGORY_META[data.category as keyof typeof SHOP_CATEGORY_META]?.emoji ?? "🛍️"} ${data.tagline ?? data.description.slice(0, 140)}\nMampir ke Pasar Warga ya, tetangga!`,
      images: data.bannerUrl ? [data.bannerUrl] : data.logoUrl ? [data.logoUrl] : [],
      author: { id: actor.id, name: actor.fullName, role: actor.role, block: actor.houseBlock },
    });
    return NextResponse.json({ success: true, shop: data, created: true });
  } catch (e: any) {
    return fail(e);
  }
}
