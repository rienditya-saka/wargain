import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PasarError, loadActor, myShop } from "@/lib/pasar/server";
import type { Order, OrderItem, Product } from "@/lib/pasar/types";

const fail = (e: any) => NextResponse.json({ error: e.message || "Internal server error" }, { status: e instanceof PasarError ? e.status : 500 });

// GET ?userId -> seller dashboard: today, this month, top products, low stock, to-do counts, 14-day revenue
export async function GET(req: Request) {
  try {
    const actor = await loadActor(new URL(req.url).searchParams.get("userId"));
    const shop = await myShop(actor);
    if (!shop) return NextResponse.json({ shop: null });

    const monthStart = new Date(`${new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }).slice(0, 7)}-01T00:00:00+07:00`);
    const since = new Date(Math.min(monthStart.getTime(), Date.now() - 14 * 86_400_000));
    const [{ data: orders }, { data: products }] = await Promise.all([
      supabaseAdmin.from("shop_orders").select("*").eq("shopId", shop.id).gte("createdAt", since.toISOString()),
      supabaseAdmin.from("shop_products").select("*").eq("shopId", shop.id),
    ]);
    const list = (orders ?? []) as Order[];
    const day = (d: string) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
    const today = day(new Date().toISOString());
    const done = list.filter((o) => o.status === "SELESAI");
    const month = done.filter((o) => new Date(o.createdAt) >= monthStart);

    const revenueByDay = Array.from({ length: 14 }, (_, i) => {
      const key = day(new Date(Date.now() - (13 - i) * 86_400_000).toISOString());
      return { date: key, total: done.filter((o) => day(o.createdAt) === key).reduce((n, o) => n + o.total, 0) };
    });
    const sold = new Map<string, { name: string; qty: number; revenue: number }>();
    month.forEach((o) => (o.items as OrderItem[]).forEach((i) => {
      const s = sold.get(i.productId) ?? { name: i.name, qty: 0, revenue: 0 };
      s.qty += i.qty;
      s.revenue += i.subtotal;
      sold.set(i.productId, s);
    }));

    return NextResponse.json({
      shop,
      todo: {
        toConfirm: list.filter((o) => o.status === "MENUNGGU").length,
        inProgress: list.filter((o) => ["DIKONFIRMASI", "DIPROSES", "SIAP", "DIANTAR"].includes(o.status)).length,
        paymentsToVerify: list.filter((o) => o.paymentStatus === "MENUNGGU_VERIFIKASI").length,
        bookingsToday: list.filter((o) => o.type === "JASA" && o.scheduledAt && day(o.scheduledAt) === today && !["DITOLAK", "DIBATALKAN"].includes(o.status)).length,
      },
      today: { orders: list.filter((o) => day(o.createdAt) === today && !["DITOLAK", "DIBATALKAN"].includes(o.status)).length, revenue: done.filter((o) => day(o.createdAt) === today).reduce((n, o) => n + o.total, 0) },
      month: { orders: month.length, revenue: month.reduce((n, o) => n + o.total, 0), unpaid: list.filter((o) => o.paymentStatus !== "LUNAS" && !["DITOLAK", "DIBATALKAN"].includes(o.status)).reduce((n, o) => n + o.total, 0) },
      revenueByDay,
      topProducts: Array.from(sold.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      lowStock: ((products ?? []) as Product[]).filter((p) => p.isActive && p.trackStock && p.stock != null && p.stock <= p.lowStockAt).map((p) => ({ id: p.id, name: p.name, stock: p.stock })),
    });
  } catch (e: any) {
    return fail(e);
  }
}
