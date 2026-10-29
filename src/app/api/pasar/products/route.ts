import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PasarError, hideProductFromFeed, loadActor, myShop, publishProductToFeed } from "@/lib/pasar/server";
import type { Product } from "@/lib/pasar/types";

const fail = (e: any) => NextResponse.json({ error: e.message || "Internal server error" }, { status: e instanceof PasarError ? e.status : 500 });
const int = (v: unknown, min = 0) => (v === null || v === undefined || v === "" ? null : Math.max(min, Math.round(Number(v))));

// GET ?userId -> all products of my shop (including inactive)
export async function GET(req: Request) {
  try {
    const actor = await loadActor(new URL(req.url).searchParams.get("userId"));
    const shop = await myShop(actor);
    if (!shop) return NextResponse.json({ products: [] });
    const { data } = await supabaseAdmin.from("shop_products").select("*").eq("shopId", shop.id).order("createdAt", { ascending: false });
    return NextResponse.json({ products: data ?? [] });
  } catch (e: any) {
    return fail(e);
  }
}

// POST { userId, product: {...}, publishToFeed? } -> create / update (id present) a product or service
export async function POST(req: Request) {
  try {
    const { userId, product: p, publishToFeed } = await req.json();
    const actor = await loadActor(userId);
    const shop = await myShop(actor);
    if (!shop) throw new PasarError("Buka lapak dulu sebelum menambah produk.");
    if (!p?.name?.trim()) throw new PasarError("Nama produk wajib diisi.");
    const price = int(p.price);
    if (price === null) throw new PasarError("Harga wajib diisi.");
    const type = p.type === "JASA" ? "JASA" : "PRODUK";
    const durationMin = type === "JASA" ? int(p.durationMin, 15) : null;
    if (type === "JASA" && !durationMin) throw new PasarError("Isi durasi layanan.");

    const row: Record<string, unknown> = {
      type,
      name: p.name.trim().slice(0, 80),
      description: (p.description ?? "").trim().slice(0, 1500),
      category: String(p.category ?? shop.category).slice(0, 40),
      price,
      comparePrice: int(p.comparePrice),
      unit: String(p.unit ?? (type === "JASA" ? "sesi" : "pcs")).slice(0, 20),
      images: Array.isArray(p.images) ? p.images.slice(0, 5) : [],
      trackStock: type === "PRODUK" ? !!p.trackStock : false,
      stock: type === "PRODUK" && p.trackStock ? int(p.stock) ?? 0 : null,
      lowStockAt: int(p.lowStockAt) ?? 3,
      variants: Array.isArray(p.variants)
        ? p.variants.filter((v: any) => v?.name?.trim()).slice(0, 10).map((v: any) => ({ name: String(v.name).trim().slice(0, 30), priceDelta: Math.round(Number(v.priceDelta) || 0) }))
        : [],
      preorderDays: type === "PRODUK" ? int(p.preorderDays) ?? 0 : 0,
      maxPerOrder: int(p.maxPerOrder, 1),
      durationMin,
      slotCapacity: type === "JASA" ? int(p.slotCapacity, 1) ?? 1 : 1,
      serviceLocation: type === "JASA" ? (p.serviceLocation === "KE_RUMAH" ? "KE_RUMAH" : "DI_TEMPAT") : null,
      isActive: p.isActive ?? true,
      updatedAt: new Date().toISOString(),
    };

    let saved: Product;
    if (p.id) {
      const { data: current } = await supabaseAdmin.from("shop_products").select("shopId").eq("id", p.id).maybeSingle();
      if (current?.shopId !== shop.id) throw new PasarError("Produk tidak ditemukan.", 404);
      const { data, error } = await supabaseAdmin.from("shop_products").update(row).eq("id", p.id).select().single();
      if (error) throw new PasarError(error.message, 500);
      saved = data as Product;
    } else {
      const { data, error } = await supabaseAdmin
        .from("shop_products")
        .insert({ ...row, id: `prd_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, communityId: shop.communityId, shopId: shop.id, createdAt: row.updatedAt })
        .select()
        .single();
      if (error) throw new PasarError(error.message, 500);
      saved = data as Product;
    }

    if (!saved.isActive) await hideProductFromFeed(shop, saved.id);
    else if (publishToFeed) await publishProductToFeed(shop, saved);
    return NextResponse.json({ success: true, product: saved });
  } catch (e: any) {
    return fail(e);
  }
}

// PATCH { userId, productId, stockDelta?, isActive? } -> quick stock adjust / toggle from the list
export async function PATCH(req: Request) {
  try {
    const { userId, productId, stockDelta, setStock, isActive } = await req.json();
    const actor = await loadActor(userId);
    const shop = await myShop(actor);
    const { data: p } = await supabaseAdmin.from("shop_products").select("*").eq("id", productId).maybeSingle();
    if (!shop || !p || p.shopId !== shop.id) throw new PasarError("Produk tidak ditemukan.", 404);
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (setStock !== undefined) patch.stock = Math.max(0, Math.round(Number(setStock)));
    else if (stockDelta) patch.stock = Math.max(0, (p.stock ?? 0) + Math.round(Number(stockDelta)));
    if (patch.stock !== undefined) patch.trackStock = true;
    if (isActive !== undefined) patch.isActive = !!isActive;
    const { data, error } = await supabaseAdmin.from("shop_products").update(patch).eq("id", productId).select().single();
    if (error) throw new PasarError(error.message, 500);
    if (isActive === false) await hideProductFromFeed(shop, productId);
    return NextResponse.json({ success: true, product: data });
  } catch (e: any) {
    return fail(e);
  }
}
