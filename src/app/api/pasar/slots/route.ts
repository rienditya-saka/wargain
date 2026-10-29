import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { slotsFor, isOpenOn } from "@/lib/pasar/slots";
import { ACTIVE_BOOKING } from "@/lib/pasar/types";

// GET ?productId&from=YYYY-MM-DD&days=14 -> per-day availability + slots for a service
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  const from = searchParams.get("from");
  const days = Math.min(42, Math.max(1, Number(searchParams.get("days") ?? 14)));
  if (!productId || !from || !/^\d{4}-\d{2}-\d{2}$/.test(from)) return NextResponse.json({ error: "productId & from wajib." }, { status: 400 });

  const { data: p } = await supabaseAdmin.from("shop_products").select("*").eq("id", productId).maybeSingle();
  if (!p || p.type !== "JASA") return NextResponse.json({ error: "Layanan tidak ditemukan." }, { status: 404 });
  const { data: shop } = await supabaseAdmin.from("shops").select("weeklyHours, closedDates, isOpen, status").eq("id", p.shopId).single();

  const start = new Date(`${from}T00:00:00+07:00`);
  const end = new Date(start.getTime() + days * 86_400_000);
  const { data: bookings } = await supabaseAdmin
    .from("shop_orders")
    .select("scheduledAt, scheduledEnd, items")
    .eq("shopId", p.shopId)
    .in("status", ACTIVE_BOOKING)
    .gte("scheduledAt", start.toISOString())
    .lt("scheduledAt", end.toISOString());
  const mine = (bookings ?? []).filter((b: any) => b.items?.[0]?.productId === p.id && b.scheduledEnd);

  const result = Array.from({ length: days }, (_, i) => {
    const key = new Date(start.getTime() + i * 86_400_000 + 12 * 3_600_000).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
    const open = shop?.isOpen && shop.status === "AKTIF" ? isOpenOn(key, shop.weeklyHours, shop.closedDates) : null;
    const slots = open
      ? slotsFor({
          dateKey: key, weeklyHours: shop!.weeklyHours, closedDates: shop!.closedDates, durationMin: p.durationMin ?? 60, capacity: p.slotCapacity,
          bookings: mine.map((b: any) => ({ start: b.scheduledAt, end: b.scheduledEnd })),
        })
      : [];
    return { date: key, open: !!open, hours: open, slots, available: slots.filter((s) => !s.reason).length };
  });
  return NextResponse.json({ days: result });
}
