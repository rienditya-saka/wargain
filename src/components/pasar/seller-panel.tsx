"use client";

import * as React from "react";
import { toast } from "sonner";
import { LayoutDashboard, ClipboardList, Package, CalendarDays, Settings, Plus, ChevronLeft, ChevronRight, AlertTriangle, Wallet, Clock, Pencil } from "lucide-react";
import type { Order, Product, Shop } from "@/lib/pasar/types";
import { ORDER_STATUS_META, PAYMENT_STATUS_META, rupiah } from "@/lib/pasar/types";
import { pasarApi, useOrders } from "@/lib/pasar/client";
import { isOpenNow } from "@/lib/pasar/slots";
import { OrderDetail, OrderStatusPill } from "./order-detail";
import { ProductForm } from "./product-form";
import { ShopForm } from "./shop-form";
import { Sheet } from "./sheet";

type View = "ringkasan" | "pesanan" | "produk" | "jadwal" | "pengaturan";
type OrderFilter = "BARU" | "AKTIF" | "BAYAR" | "SELESAI" | "SEMUA";

interface Dashboard {
  todo: { toConfirm: number; inProgress: number; paymentsToVerify: number; bookingsToday: number };
  today: { orders: number; revenue: number };
  month: { orders: number; revenue: number; unpaid: number };
  revenueByDay: { date: string; total: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
  lowStock: { id: string; name: string; stock: number }[];
}

const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

export function SellerPanel({ userId, shop, onShopChange, initialOrderId, initialView }: { userId: string; shop: Shop; onShopChange: (s: Shop) => void; initialOrderId?: string | null; initialView?: string | null }) {
  const [view, setView] = React.useState<View>((["ringkasan", "pesanan", "produk", "jadwal", "pengaturan"].includes(initialView ?? "") ? initialView : "ringkasan") as View);
  const { orders, act, reload: reloadOrders } = useOrders(userId, "seller");
  const [dash, setDash] = React.useState<Dashboard | null>(null);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [openOrder, setOpenOrder] = React.useState<string | null>(initialOrderId ?? null);
  const [editing, setEditing] = React.useState<Product | "new" | null>(null);
  const [filter, setFilter] = React.useState<OrderFilter>("BARU");

  const loadDash = React.useCallback(() => pasarApi<Dashboard>(`/api/pasar/dashboard?userId=${encodeURIComponent(userId)}`).then(setDash).catch(() => {}), [userId]);
  const loadProducts = React.useCallback(() => pasarApi<{ products: Product[] }>(`/api/pasar/products?userId=${encodeURIComponent(userId)}`).then((r) => setProducts(r.products)).catch(() => {}), [userId]);
  React.useEffect(() => {
    loadDash();
    loadProducts();
  }, [loadDash, loadProducts, orders.length]);
  React.useEffect(() => {
    if (initialOrderId) setOpenOrder(initialOrderId);
  }, [initialOrderId]);

  const onAct = async (id: string, action: string, payload?: Record<string, unknown>) => {
    await act(id, action, payload);
    loadDash();
    if (["REJECT", "CANCEL"].includes(action)) loadProducts();
  };

  const toggleOpen = async () => {
    try {
      const r = await pasarApi<{ shop: Shop }>("/api/pasar/shops", "POST", { userId, shop: { ...shop, isOpen: !shop.isOpen } });
      onShopChange(r.shop);
      toast.success(r.shop.isOpen ? "Lapak dibuka kembali." : "Lapak ditutup sementara. Warga tidak bisa memesan.");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const quickProduct = async (p: Product, patch: Record<string, unknown>) => {
    try {
      const r = await pasarApi<{ product: Product }>("/api/pasar/products", "PATCH", { userId, productId: p.id, ...patch });
      setProducts((l) => l.map((x) => (x.id === p.id ? r.product : x)));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const nav: { id: View; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: "ringkasan", label: "Ringkasan", icon: LayoutDashboard },
    { id: "pesanan", label: "Pesanan", icon: ClipboardList, badge: (dash?.todo.toConfirm ?? 0) + (dash?.todo.paymentsToVerify ?? 0) },
    { id: "produk", label: "Produk", icon: Package, badge: dash?.lowStock.length || undefined },
    { id: "jadwal", label: "Jadwal", icon: CalendarDays, badge: dash?.todo.bookingsToday || undefined },
    { id: "pengaturan", label: "Lapak", icon: Settings },
  ];

  const filtered = orders.filter((o) => {
    if (filter === "BARU") return o.status === "MENUNGGU";
    if (filter === "AKTIF") return ["DIKONFIRMASI", "DIPROSES", "SIAP", "DIANTAR"].includes(o.status);
    if (filter === "BAYAR") return o.paymentStatus === "MENUNGGU_VERIFIKASI" || (o.paymentStatus !== "LUNAS" && !["DITOLAK", "DIBATALKAN"].includes(o.status) && o.status !== "MENUNGGU");
    if (filter === "SELESAI") return ["SELESAI", "DITOLAK", "DIBATALKAN"].includes(o.status);
    return true;
  });
  const current = orders.find((o) => o.id === openOrder) ?? null;
  const openNow = shop.isOpen && isOpenNow(shop.weeklyHours, shop.closedDates);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl overflow-hidden border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17]">
        <div className="relative h-20 bg-gradient-to-br from-emerald-600 to-teal-700">{shop.bannerUrl && <img src={shop.bannerUrl} alt="" className="w-full h-full object-cover" />}</div>
        <div className="px-4 pb-3 -mt-7 flex items-end gap-3">
          <div className="w-14 h-14 rounded-2xl border-4 border-white dark:border-[#131F17] bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex items-center justify-center text-2xl shrink-0">{shop.logoUrl ? <img src={shop.logoUrl} alt="" className="w-full h-full object-cover" /> : "🏪"}</div>
          <div className="min-w-0 flex-1 pb-0.5">
            <p className="text-sm font-black truncate">{shop.name}</p>
            <p className="text-[11px] text-slate-500">{shop.isOpen ? (openNow ? "🟢 Buka sekarang" : "🟡 Di luar jam buka") : "🔴 Tutup sementara"} · ⭐ {Number(shop.ratingAvg).toFixed(1)} ({shop.ratingCount}) · {shop.orderCount} pesanan selesai</p>
          </div>
          <button onClick={toggleOpen} className={`shrink-0 h-9 px-3 rounded-xl text-[11px] font-black ${shop.isOpen ? "border border-neutral-200 dark:border-neutral-700" : "bg-emerald-600 text-white"}`}>{shop.isOpen ? "Tutup sementara" : "Buka lapak"}</button>
        </div>
        <div className="flex gap-1 px-2 pb-2 overflow-x-auto">
          {nav.map((n) => (
            <button key={n.id} onClick={() => setView(n.id)} className={`relative shrink-0 min-h-[38px] px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 ${view === n.id ? "bg-emerald-600 text-white" : "text-slate-500"}`}>
              <n.icon className="w-4 h-4" /> {n.label}
              {!!n.badge && <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center ${view === n.id ? "bg-white/25" : "bg-red-600 text-white"}`}>{n.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      {view === "ringkasan" && dash && (
        <div className="space-y-3">
          {(dash.todo.toConfirm > 0 || dash.todo.paymentsToVerify > 0) && (
            <div className="grid grid-cols-2 gap-2">
              {dash.todo.toConfirm > 0 && <button onClick={() => { setView("pesanan"); setFilter("BARU"); }} className="rounded-2xl bg-amber-400 text-slate-900 p-3 text-left"><p className="text-2xl font-black">{dash.todo.toConfirm}</p><p className="text-[11px] font-bold">pesanan menunggu konfirmasi</p></button>}
              {dash.todo.paymentsToVerify > 0 && <button onClick={() => { setView("pesanan"); setFilter("BAYAR"); }} className="rounded-2xl bg-sky-600 text-white p-3 text-left"><p className="text-2xl font-black">{dash.todo.paymentsToVerify}</p><p className="text-[11px] font-bold">bukti bayar perlu dicek</p></button>}
            </div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              ["Omzet hari ini", rupiah(dash.today.revenue), `${dash.today.orders} pesanan`],
              ["Omzet bulan ini", rupiah(dash.month.revenue), `${dash.month.orders} selesai`],
              ["Sedang berjalan", String(dash.todo.inProgress), "pesanan aktif"],
              ["Belum dibayar", rupiah(dash.month.unpaid), "piutang pembeli"],
            ].map(([l, v, s]) => (
              <div key={l} className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] p-3">
                <p className="text-[10px] font-semibold text-slate-500">{l}</p>
                <p className="text-base font-black truncate">{v}</p>
                <p className="text-[10px] text-slate-400">{s}</p>
              </div>
            ))}
          </div>
          <RevenueChart data={dash.revenueByDay} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] p-4 space-y-2">
              <p className="text-xs font-extrabold">🏆 Terlaris bulan ini</p>
              {dash.topProducts.length === 0 ? <p className="text-xs text-slate-500">Belum ada penjualan selesai.</p> : dash.topProducts.map((t, i) => (
                <div key={t.name} className="flex items-center gap-2 text-xs">
                  <span className="w-5 text-slate-400 font-black">{i + 1}</span>
                  <span className="flex-1 truncate font-semibold">{t.name}</span>
                  <span className="text-slate-500">{t.qty}×</span>
                  <span className="font-bold w-24 text-right">{rupiah(t.revenue)}</span>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] p-4 space-y-2">
              <p className="text-xs font-extrabold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-500" /> Stok menipis</p>
              {dash.lowStock.length === 0 ? <p className="text-xs text-slate-500">Semua stok aman.</p> : dash.lowStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <span className="truncate font-semibold">{p.name}</span>
                  <span className={`font-black ${p.stock === 0 ? "text-red-600" : "text-amber-600"}`}>{p.stock === 0 ? "Habis" : `Sisa ${p.stock}`}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === "pesanan" && (
        <div className="space-y-2">
          <div className="flex gap-1 overflow-x-auto">
            {([["BARU", "Baru"], ["AKTIF", "Diproses"], ["BAYAR", "Pembayaran"], ["SELESAI", "Riwayat"], ["SEMUA", "Semua"]] as [OrderFilter, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} className={`shrink-0 min-h-[36px] px-3 rounded-full text-[11px] font-bold border ${filter === k ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900" : "border-neutral-200 dark:border-neutral-800"}`}>{l}</button>
            ))}
          </div>
          {filtered.length === 0 ? <p className="text-center text-xs text-slate-500 py-10 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">Tidak ada pesanan.</p> : (
            <ul className="space-y-2">{filtered.map((o) => <OrderRow key={o.id} order={o} seller onOpen={() => setOpenOrder(o.id)} />)}</ul>
          )}
        </div>
      )}

      {view === "produk" && (
        <div className="space-y-2">
          <button onClick={() => setEditing("new")} className="w-full min-h-[48px] rounded-2xl border-2 border-dashed border-emerald-500/50 text-emerald-700 dark:text-emerald-400 text-sm font-black flex items-center justify-center gap-2"><Plus className="w-5 h-5" /> Tambah produk / jasa</button>
          <ul className="space-y-2">
            {products.map((p) => (
              <li key={p.id} className={`rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] p-3 flex items-center gap-3 ${p.isActive ? "" : "opacity-60"}`}>
                <div className="w-14 h-14 rounded-xl bg-neutral-100 dark:bg-neutral-800 overflow-hidden shrink-0 flex items-center justify-center">{p.images[0] ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" /> : p.type === "JASA" ? "🔧" : "📦"}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate">{p.type === "JASA" && <span className="text-sky-600">[Jasa] </span>}{p.name}</p>
                  <p className="text-[11px] text-slate-500">{rupiah(p.price)}/{p.unit} · {p.soldCount} terjual{p.ratingCount ? ` · ⭐ ${Number(p.ratingAvg).toFixed(1)}` : ""}</p>
                  {p.type === "PRODUK" && p.trackStock && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <button onClick={() => quickProduct(p, { stockDelta: -1 })} className="w-7 h-7 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm font-black" aria-label="Kurangi stok">−</button>
                      <span className={`text-xs font-black w-14 text-center ${p.stock === 0 ? "text-red-600" : p.stock != null && p.stock <= p.lowStockAt ? "text-amber-600" : ""}`}>Stok {p.stock ?? 0}</span>
                      <button onClick={() => quickProduct(p, { stockDelta: 1 })} className="w-7 h-7 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm font-black" aria-label="Tambah stok">+</button>
                      <button onClick={() => quickProduct(p, { stockDelta: 10 })} className="h-7 px-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-[10px] font-bold">+10</button>
                    </div>
                  )}
                  {p.type === "JASA" && <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> {p.durationMin} mnt · {p.slotCapacity} pelanggan/slot</p>}
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <button onClick={() => quickProduct(p, { isActive: !p.isActive })} className={`relative w-10 h-6 rounded-full transition-colors ${p.isActive ? "bg-emerald-600" : "bg-neutral-300 dark:bg-neutral-700"}`} aria-label={p.isActive ? "Nonaktifkan" : "Aktifkan"}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${p.isActive ? "left-[18px]" : "left-0.5"}`} />
                  </button>
                  <button onClick={() => setEditing(p)} className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1"><Pencil className="w-3 h-3" /> Ubah</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {view === "jadwal" && <BookingCalendar orders={orders} onOpen={setOpenOrder} />}

      {view === "pengaturan" && (
        <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] p-4">
          <ShopForm userId={userId} shop={shop} onSaved={(s) => onShopChange(s)} />
        </div>
      )}

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Tambah produk / jasa" : "Ubah produk"}>
        <div className="p-4">
          {editing && (
            <ProductForm
              userId={userId}
              product={editing === "new" ? null : editing}
              onSaved={(p) => {
                setProducts((l) => (l.some((x) => x.id === p.id) ? l.map((x) => (x.id === p.id ? p : x)) : [p, ...l]));
                setEditing(null);
                loadDash();
              }}
            />
          )}
        </div>
      </Sheet>

      <OrderDetail order={current} open={!!current} onClose={() => { setOpenOrder(null); reloadOrders(); }} role="seller" onAct={onAct} />
    </div>
  );
}

export function OrderRow({ order: o, seller, onOpen }: { order: Order; seller?: boolean; onOpen: () => void }) {
  return (
    <li>
      <button onClick={onOpen} className={`w-full text-left rounded-2xl border bg-white dark:bg-[#131F17] p-3 flex items-center gap-3 hover:border-emerald-500/50 ${o.status === "MENUNGGU" && seller ? "border-amber-400" : "border-neutral-200/80 dark:border-neutral-800/80"}`}>
        <div className="w-11 h-11 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-xl shrink-0">{o.type === "JASA" ? "🗓️" : "🛍️"}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-xs font-extrabold truncate">{seller ? `${o.buyerName}${o.buyerBlock ? ` · ${o.buyerBlock}` : ""}` : o.shop?.name}</p>
            <OrderStatusPill order={o} />
          </div>
          <p className="text-[11px] text-slate-500 truncate">{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</p>
          <p className="text-[10px] text-slate-400">
            {o.orderNumber} · {o.scheduledAt ? `📅 ${new Date(o.scheduledAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}` : new Date(o.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-black">{rupiah(o.total)}</p>
          <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black ${PAYMENT_STATUS_META[o.paymentStatus].tone}`}>{PAYMENT_STATUS_META[o.paymentStatus].label}</span>
        </div>
      </button>
    </li>
  );
}

function RevenueChart({ data }: { data: { date: string; total: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  const total = data.reduce((n, d) => n + d.total, 0);
  return (
    <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-extrabold flex items-center gap-1.5"><Wallet className="w-4 h-4 text-emerald-600" /> Omzet 14 hari</p>
        <p className="text-xs font-black">{rupiah(total)}</p>
      </div>
      <div className="flex items-end gap-1 h-28">
        {data.map((d) => (
          <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full gap-1" title={`${d.date}: ${rupiah(d.total)}`}>
            <div className={`w-full rounded-t-md ${d.total ? "bg-emerald-500" : "bg-neutral-100 dark:bg-neutral-800"}`} style={{ height: `${Math.max(4, (d.total / max) * 100)}%` }} />
            <span className="text-[8px] text-slate-400">{Number(d.date.slice(8))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BookingCalendar({ orders, onOpen }: { orders: Order[]; onOpen: (id: string) => void }) {
  const today = dayKey(new Date().toISOString());
  const [month, setMonth] = React.useState(today.slice(0, 7));
  const [selected, setSelected] = React.useState(today);
  const scheduled = orders.filter((o) => o.scheduledAt && !["DITOLAK", "DIBATALKAN"].includes(o.status));
  const byDay = new Map<string, Order[]>();
  scheduled.forEach((o) => {
    const k = dayKey(o.scheduledAt!);
    byDay.set(k, [...(byDay.get(k) ?? []), o]);
  });
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = first.getUTCDay();
  const cells = Array.from({ length: lead + daysInMonth }, (_, i) => (i < lead ? null : `${month}-${String(i - lead + 1).padStart(2, "0")}`));
  const shift = (delta: number) => {
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  };
  const agenda = (byDay.get(selected) ?? []).sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
      <div className="lg:col-span-3 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] p-3">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => shift(-1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Bulan sebelumnya"><ChevronLeft className="w-4 h-4" /></button>
          <p className="text-sm font-extrabold">{first.toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" })}</p>
          <button onClick={() => shift(1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Bulan berikutnya"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => <span key={d} className="text-[10px] font-bold text-slate-400 py-1">{d}</span>)}
          {cells.map((c, i) => {
            if (!c) return <span key={`e${i}`} />;
            const n = byDay.get(c)?.length ?? 0;
            const active = c === selected;
            return (
              <button key={c} onClick={() => setSelected(c)} className={`aspect-square rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-colors ${active ? "bg-emerald-600 text-white" : c === today ? "ring-2 ring-emerald-500/40" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}>
                {Number(c.slice(8))}
                {n > 0 && <span className={`min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center ${active ? "bg-white/25" : "bg-sky-600 text-white"}`}>{n}</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="lg:col-span-2 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] p-3 space-y-2">
        <p className="text-xs font-extrabold">{new Date(`${selected}T12:00:00+07:00`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jakarta" })}</p>
        {agenda.length === 0 ? <p className="text-xs text-slate-500 py-6 text-center">Tidak ada jadwal.</p> : agenda.map((o) => (
          <button key={o.id} onClick={() => onOpen(o.id)} className="w-full text-left flex gap-3 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-emerald-500/50">
            <div className="text-center shrink-0 w-12">
              <p className="text-sm font-black">{new Date(o.scheduledAt!).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}</p>
              {o.scheduledEnd && <p className="text-[9px] text-slate-400">s/d {new Date(o.scheduledEnd).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}</p>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate">{o.items[0]?.name}</p>
              <p className="text-[11px] text-slate-500 truncate">{o.buyerName} · {o.buyerBlock ?? "-"} · {o.fulfillment === "KE_RUMAH" ? "ke rumah" : o.fulfillment === "DI_TEMPAT" ? "datang" : o.fulfillment === "ANTAR" ? "antar" : "ambil"}</p>
              <span className={`inline-block mt-0.5 px-1.5 rounded-full text-[9px] font-black ${ORDER_STATUS_META[o.status].tone}`}>{ORDER_STATUS_META[o.status].label}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
