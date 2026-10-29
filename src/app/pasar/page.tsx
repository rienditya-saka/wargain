"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Menu, Building, ShoppingBag, Search, ShoppingCart, Store, Receipt, Map as MapIcon, LayoutGrid, Clock, Star, MessageCircle } from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { getClientSession } from "@/lib/auth-session";
import type { SessionTenant } from "@/lib/types/auth";
import { useCart, useCatalog, useOrders, type ShopWithLoc } from "@/lib/pasar/client";
import type { Order, Product, Shop, ShopCategory } from "@/lib/pasar/types";
import { SHOP_CATEGORY_META, rupiah } from "@/lib/pasar/types";
import { isOpenNow } from "@/lib/pasar/slots";
import { ProductCard } from "@/components/pasar/product-card";
import { ProductSheet } from "@/components/pasar/product-sheet";
import { CheckoutSheet, type BookingDraft } from "@/components/pasar/checkout-sheet";
import { OrderDetail } from "@/components/pasar/order-detail";
import { SellerPanel, OrderRow } from "@/components/pasar/seller-panel";
import { ShopForm } from "@/components/pasar/shop-form";
import { Sheet, Stars } from "@/components/pasar/sheet";
import { waLink } from "@/components/keamanan/ui";

const SecurityLeafletMap = dynamic(() => import("@/components/keamanan/security-leaflet-map").then((m) => m.SecurityLeafletMap), {
  ssr: false,
  loading: () => <div className="h-[380px] rounded-2xl bg-neutral-100 dark:bg-neutral-900 animate-pulse" />,
});

type TabId = "jelajah" | "pesanan" | "lapak";
type TypeFilter = "SEMUA" | "PRODUK" | "JASA";
const DEFAULT_COMMUNITY_ID = "comm_1789889738300";

export default function PasarPage() {
  return (
    <Suspense fallback={null}>
      <PasarContent />
    </Suspense>
  );
}

function PasarContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [session, setSession] = useState<SessionTenant | null>(null);
  const [ready, setReady] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("SEMUA");
  const [category, setCategory] = useState<ShopCategory | "SEMUA">("SEMUA");
  const [openOnly, setOpenOnly] = useState(false);
  const [mapView, setMapView] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [booking, setBooking] = useState<BookingDraft | null>(null);
  const [myShop, setMyShop] = useState<Shop | null>(null);
  const [myShopLoaded, setMyShopLoaded] = useState(false);

  useEffect(() => {
    setSession(getClientSession());
    setReady(true);
  }, []);

  const communityId = session?.communityId || DEFAULT_COMMUNITY_ID;
  const userId = session?.userId;
  const catalog = useCatalog(ready ? communityId : undefined, userId);
  const cartApi = useCart(userId);
  const buyerOrders = useOrders(userId, "buyer", ready && !!userId);

  const tabParam = params.get("tab") as TabId | null;
  const tab: TabId = tabParam === "pesanan" || tabParam === "lapak" ? tabParam : "jelajah";
  const productParam = params.get("product");
  const shopParam = params.get("shop");
  const orderParam = params.get("order");

  const setParam = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([k, v]) => (v === null ? p.delete(k) : p.set(k, v)));
    router.replace(`/pasar${p.toString() ? `?${p}` : ""}`, { scroll: false });
  };

  useEffect(() => {
    if (!userId) {
      setMyShopLoaded(true);
      return;
    }
    fetch(`/api/pasar/shops?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((j) => setMyShop(j.shop ?? null))
      .finally(() => setMyShopLoaded(true));
  }, [userId, catalog.myShopId]);

  const shopById = useMemo(() => new Map(catalog.shops.map((s) => [s.id, s])), [catalog.shops]);
  const productById = useMemo(() => new Map(catalog.products.map((p) => [p.id, p])), [catalog.products]);

  const needle = q.trim().toLowerCase();
  const visibleShops = catalog.shops.filter((s) =>
    (category === "SEMUA" || s.category === category) &&
    (!openOnly || (s.isOpen && isOpenNow(s.weeklyHours, s.closedDates))) &&
    (!needle || s.name.toLowerCase().includes(needle) || (s.tagline ?? "").toLowerCase().includes(needle))
  );
  const visibleProducts = catalog.products.filter((p) => {
    const s = shopById.get(p.shopId);
    if (!s) return false;
    if (typeFilter !== "SEMUA" && p.type !== typeFilter) return false;
    if (category !== "SEMUA" && s.category !== category) return false;
    if (openOnly && !(s.isOpen && isOpenNow(s.weeklyHours, s.closedDates))) return false;
    return !needle || p.name.toLowerCase().includes(needle) || p.description.toLowerCase().includes(needle) || s.name.toLowerCase().includes(needle);
  });
  const usedCategories = Array.from(new Set(catalog.shops.map((s) => s.category)));

  const openProduct = productParam ? productById.get(productParam) ?? null : null;
  const openShop = shopParam ? shopById.get(shopParam) ?? null : null;
  const cartShop = cartApi.cart.shopId ? shopById.get(cartApi.cart.shopId) : undefined;
  const checkoutShop = booking ? shopById.get(booking.product.shopId) : cartShop;
  const buyerOrder = orderParam && tab === "pesanan" ? buyerOrders.orders.find((o) => o.id === orderParam) ?? null : null;
  const cartTotal = cartApi.cart.lines.reduce((n, l) => {
    const p = productById.get(l.productId);
    const v = p?.variants.find((x) => x.name === l.variant);
    return n + (p ? (p.price + (v?.priceDelta ?? 0)) * l.qty : 0);
  }, 0);
  const activeOrders = buyerOrders.orders.filter((o) => !["SELESAI", "DITOLAK", "DIBATALKAN"].includes(o.status)).length;

  const addToCart = (p: Product, qty: number, variant: string | null) => {
    if (!userId) {
      router.push("/login");
      return;
    }
    const r = cartApi.add(p.shopId, { productId: p.id, qty, variant });
    if (r === "replaced") toast("Keranjang diganti ke lapak baru (satu keranjang per lapak).");
  };

  const onPlaced = (order: Order, fromCart: boolean) => {
    if (fromCart) cartApi.clear();
    setBooking(null);
    setCartOpen(false);
    buyerOrders.reload();
    catalog.reload();
    toast.success(order.type === "JASA" ? "Booking terkirim! Tunggu konfirmasi penjual." : "Pesanan terkirim ke penjual!");
    setParam({ tab: "pesanan", order: order.id, product: null, shop: null });
  };

  const shopMarkers = useMemo(
    () =>
      visibleShops
        .filter((s) => s.lat != null && s.lng != null)
        .map((s) => ({
          id: s.id,
          lat: s.lat!,
          lng: s.lng!,
          size: 38,
          html: `<div class="w-[38px] h-[38px] rounded-2xl border-2 ${s.isOpen && isOpenNow(s.weeklyHours, s.closedDates) ? "border-emerald-500" : "border-slate-400"} bg-white shadow-lg overflow-hidden flex items-center justify-center text-lg">${s.logoUrl ? `<img src="${s.logoUrl}" class="w-full h-full object-cover"/>` : SHOP_CATEGORY_META[s.category]?.emoji ?? "🛍️"}</div>`,
          tooltip: `${s.name.replace(/</g, "&lt;")} · ${s.houseBlock ?? ""}`,
        })),
    [visibleShops]
  );

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-[#FBFBF9] dark:bg-[#0B130E] text-slate-900 dark:text-slate-100 pb-28 md:pb-12 font-sans overflow-x-hidden">
      <header className="sticky top-0 z-40 bg-[#FBFBF9]/90 dark:bg-[#0B130E]/90 backdrop-blur-xl border-b border-neutral-200/80 dark:border-neutral-800/80 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button onClick={() => setDrawer(true)} className="md:hidden w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-center shrink-0" aria-label="Buka menu utama"><Menu className="w-5 h-5" /></button>
            <Link href="/feed" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-emerald-600/30">W</div>
              <span className="font-extrabold text-base tracking-tight hidden sm:inline">Warga<span className="text-emerald-600">In</span></span>
            </Link>
            <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700 mx-1 hidden sm:block" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium min-w-0">
              <Building className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate max-w-[120px] sm:max-w-xs">{session?.communityName || "Komunitas WargaIn"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setCartOpen(true)} className="relative w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#131F17] flex items-center justify-center" aria-label="Keranjang">
              <ShoppingCart className="w-4 h-4" />
              {cartApi.count > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">{cartApi.count}</span>}
            </button>
            <NotificationBell userId={userId} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 md:py-6">
        <div className="flex flex-col md:flex-row lg:gap-6 items-start">
          <AppSidebar session={session} isMobileDrawerOpen={drawer} onCloseMobileDrawer={() => setDrawer(false)} />

          <section className="flex-1 w-full min-w-0 space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-emerald-700 via-teal-700 to-sky-800 p-4 sm:p-6 text-white relative overflow-hidden">
              <span className="absolute -right-6 -bottom-10 text-[140px] opacity-10 select-none" aria-hidden>🛍️</span>
              <p className="text-[11px] font-bold opacity-90 flex items-center gap-1.5"><ShoppingBag className="w-3.5 h-3.5" /> Pasar Warga</p>
              <h1 className="text-xl sm:text-3xl font-black tracking-tight mt-0.5">Belanja & booking jasa dari tetangga</h1>
              <p className="text-[11px] sm:text-sm opacity-90">Makanan rumahan, kebutuhan harian, servis AC, laundry, les privat — semua dari warga sekitar.</p>
              <div className="relative mt-3 max-w-xl">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    if (tab !== "jelajah") setParam({ tab: null });
                  }}
                  placeholder="Cari nasi uduk, servis AC, kue..."
                  className="w-full min-h-[46px] pl-10 pr-4 rounded-2xl bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-white/30"
                />
              </div>
            </div>

            <nav className="sticky top-[57px] z-30 -mx-3 sm:mx-0 px-3 sm:px-0 py-1.5 bg-[#FBFBF9]/95 dark:bg-[#0B130E]/95 backdrop-blur">
              <div className="flex gap-1 p-1 rounded-2xl bg-white dark:bg-[#131F17] border border-neutral-200/80 dark:border-neutral-800/80">
                {([
                  ["jelajah", "Jelajah", LayoutGrid, 0],
                  ["pesanan", "Pesanan Saya", Receipt, activeOrders],
                  ["lapak", myShop ? "Lapak Saya" : "Buka Lapak", Store, 0],
                ] as [TabId, string, React.ElementType, number][]).map(([id, label, Icon, badge]) => (
                  <button key={id} onClick={() => setParam({ tab: id === "jelajah" ? null : id, order: null })} className={`flex-1 min-h-[40px] px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${tab === id ? "bg-emerald-600 text-white shadow" : "text-slate-500"}`}>
                    <Icon className="w-4 h-4" /> <span className="truncate">{label}</span>
                    {badge > 0 && <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center ${tab === id ? "bg-white/25" : "bg-emerald-600 text-white"}`}>{badge}</span>}
                  </button>
                ))}
              </div>
            </nav>

            {tab === "jelajah" && (
              <div className="space-y-4">
                <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                  {(["SEMUA", "PRODUK", "JASA"] as TypeFilter[]).map((t) => (
                    <Chip key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>{t === "SEMUA" ? "Semua" : t === "PRODUK" ? "📦 Produk" : "🔧 Jasa"}</Chip>
                  ))}
                  <Chip active={openOnly} onClick={() => setOpenOnly((v) => !v)}><Clock className="w-3.5 h-3.5" /> Buka sekarang</Chip>
                  <Chip active={mapView} onClick={() => setMapView((v) => !v)}><MapIcon className="w-3.5 h-3.5" /> Peta lapak</Chip>
                  <span className="w-px bg-neutral-200 dark:bg-neutral-800 mx-1 shrink-0" />
                  <Chip active={category === "SEMUA"} onClick={() => setCategory("SEMUA")}>Semua kategori</Chip>
                  {usedCategories.map((c) => <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{SHOP_CATEGORY_META[c].emoji} {SHOP_CATEGORY_META[c].label}</Chip>)}
                </div>

                {mapView && (
                  <SecurityLeafletMap extraMarkers={shopMarkers} onSelectMarker={(id) => setParam({ shop: id })} showPosts={false} showLegend={false} focus={shopMarkers[0] ? { lat: shopMarkers[0].lat, lng: shopMarkers[0].lng, zoom: 17, key: "pasar" } : null} className="h-[340px] md:h-[420px]" />
                )}

                {visibleShops.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 px-1">Lapak warga ({visibleShops.length})</p>
                    <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1">
                      {visibleShops.map((s) => <ShopChip key={s.id} shop={s} onOpen={() => setParam({ shop: s.id })} />)}
                    </div>
                  </div>
                )}

                {catalog.loading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">{Array.from({ length: 8 }, (_, i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-neutral-100 dark:bg-neutral-900 animate-pulse" />)}</div>
                ) : visibleProducts.length === 0 ? (
                  <div className="text-center py-14 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-2">
                    <p className="text-4xl">🧺</p>
                    <p className="text-sm font-bold">{catalog.products.length ? "Tidak ada yang cocok dengan filter" : "Belum ada produk di Pasar Warga"}</p>
                    {!myShop && <button onClick={() => setParam({ tab: "lapak" })} className="min-h-[42px] px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold">Jadi penjual pertama</button>}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                    {visibleProducts.map((p) => <ProductCard key={p.id} product={p} shop={shopById.get(p.shopId)} onOpen={() => setParam({ product: p.id })} />)}
                  </div>
                )}
              </div>
            )}

            {tab === "pesanan" && (
              !userId ? <p className="text-center text-sm py-10">Silakan <Link href="/login" className="font-bold text-emerald-600">login</Link> untuk melihat pesanan.</p> :
              buyerOrders.orders.length === 0 ? (
                <div className="text-center py-14 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-2">
                  <p className="text-4xl">🧾</p>
                  <p className="text-sm font-bold">Belum ada pesanan</p>
                  <button onClick={() => setParam({ tab: null })} className="min-h-[42px] px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold">Mulai belanja</button>
                </div>
              ) : (
                <ul className="space-y-2">{buyerOrders.orders.map((o) => <OrderRow key={o.id} order={o} onOpen={() => setParam({ order: o.id })} />)}</ul>
              )
            )}

            {tab === "lapak" && userId && myShopLoaded && (
              myShop ? (
                <SellerPanel userId={userId} shop={myShop} onShopChange={(s) => { setMyShop(s); catalog.reload(); }} initialOrderId={orderParam} initialView={params.get("view")} />
              ) : (
                <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] p-4 sm:p-5 space-y-4">
                  <div>
                    <p className="text-lg font-black">Buka lapak di Pasar Warga 🏪</p>
                    <p className="text-xs text-slate-500">Gratis. Jual masakan, kue, sembako, atau tawarkan jasa (servis, laundry, les). Pesanan & booking masuk langsung ke HP Anda.</p>
                  </div>
                  <ShopForm userId={userId} shop={null} onSaved={(s) => { setMyShop(s); catalog.reload(); }} />
                </div>
              )
            )}
            {tab === "lapak" && !userId && <p className="text-center text-sm py-10">Silakan <Link href="/login" className="font-bold text-emerald-600">login</Link> untuk membuka lapak.</p>}
          </section>
        </div>
      </main>

      {cartApi.count > 0 && tab === "jelajah" && (
        <button onClick={() => setCartOpen(true)} className="md:hidden fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 min-h-[54px] rounded-2xl bg-emerald-600 text-white shadow-xl shadow-emerald-600/40 px-4 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-black"><ShoppingCart className="w-5 h-5" /> {cartApi.count} item · {cartShop?.name}</span>
          <span className="text-sm font-black">{rupiah(cartTotal)}</span>
        </button>
      )}

      <ProductSheet
        product={openProduct}
        shop={openProduct ? shopById.get(openProduct.shopId) : undefined}
        open={!!openProduct}
        onClose={() => setParam({ product: null })}
        isOwner={!!openProduct && shopById.get(openProduct.shopId)?.ownerId === userId}
        onAddToCart={addToCart}
        onBook={(p, slot) => {
          if (!userId) {
            router.push("/login");
            return;
          }
          setBooking({ product: p, slot });
          setParam({ product: null });
        }}
        onOpenShop={(id) => setParam({ product: null, shop: id })}
      />

      <ShopSheet shop={openShop} products={catalog.products.filter((p) => p.shopId === openShop?.id)} onClose={() => setParam({ shop: null })} onOpenProduct={(id) => setParam({ shop: null, product: id })} />

      <CheckoutSheet
        open={cartOpen || !!booking}
        onClose={() => { setCartOpen(false); setBooking(null); }}
        userId={userId}
        shop={checkoutShop}
        cart={cartApi.cart}
        products={productById}
        booking={booking}
        onQty={cartApi.setQty}
        onPlaced={onPlaced}
      />

      <OrderDetail order={buyerOrder} open={!!buyerOrder} onClose={() => setParam({ order: null })} role="buyer" onAct={async (id, action, payload) => { await buyerOrders.act(id, action, payload); if (action === "CANCEL") catalog.reload(); }} />
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={active} className={`shrink-0 min-h-[36px] px-3 rounded-full text-[11px] font-bold border flex items-center gap-1.5 transition-colors ${active ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white" : "bg-white dark:bg-[#131F17] border-neutral-200 dark:border-neutral-800 text-slate-600 dark:text-slate-300"}`}>
      {children}
    </button>
  );
}

function ShopChip({ shop: s, onOpen }: { shop: ShopWithLoc; onOpen: () => void }) {
  const open = s.isOpen && isOpenNow(s.weeklyHours, s.closedDates);
  return (
    <button onClick={onOpen} className="shrink-0 w-44 text-left rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] overflow-hidden hover:shadow-md">
      <div className="h-16 bg-gradient-to-br from-emerald-500 to-teal-600 relative">{s.bannerUrl && <img src={s.bannerUrl} alt="" className="w-full h-full object-cover" />}</div>
      <div className="px-3 pb-3 -mt-6">
        <div className="w-12 h-12 rounded-xl border-2 border-white dark:border-[#131F17] bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex items-center justify-center text-xl">{s.logoUrl ? <img src={s.logoUrl} alt="" className="w-full h-full object-cover" /> : SHOP_CATEGORY_META[s.category].emoji}</div>
        <p className="text-xs font-extrabold truncate mt-1">{s.name}</p>
        <p className="text-[10px] text-slate-500 truncate">{SHOP_CATEGORY_META[s.category].label} · {s.houseBlock ?? "-"}</p>
        <p className="text-[10px] mt-0.5 flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${open ? "bg-emerald-500" : "bg-slate-400"}`} /> {open ? "Buka" : "Tutup"}
          {s.ratingCount > 0 && <span className="text-slate-500 flex items-center gap-0.5"> · <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {Number(s.ratingAvg).toFixed(1)}</span>}
        </p>
      </div>
    </button>
  );
}

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function ShopSheet({ shop, products, onClose, onOpenProduct }: { shop: ShopWithLoc | null; products: Product[]; onClose: () => void; onOpenProduct: (id: string) => void }) {
  const open = !!shop && shop.isOpen && isOpenNow(shop.weeklyHours, shop.closedDates);
  return (
    <Sheet open={!!shop} onClose={onClose} title={shop?.name} wide>
      {shop && (
        <div>
          <div className="relative h-28 bg-gradient-to-br from-emerald-600 to-teal-700">{shop.bannerUrl && <img src={shop.bannerUrl} alt="" className="w-full h-full object-cover" />}</div>
          <div className="px-4 -mt-8 flex items-end gap-3">
            <div className="w-16 h-16 rounded-2xl border-4 border-white dark:border-[#0F1A13] bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex items-center justify-center text-3xl shrink-0">{shop.logoUrl ? <img src={shop.logoUrl} alt="" className="w-full h-full object-cover" /> : SHOP_CATEGORY_META[shop.category].emoji}</div>
            <div className="pb-1 min-w-0">
              <p className="text-base font-black truncate">{shop.name}</p>
              <p className="text-[11px] text-slate-500">{SHOP_CATEGORY_META[shop.category].label} · {shop.houseBlock ?? "-"} · {open ? "🟢 Buka" : "⚪ Tutup"}</p>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {shop.tagline && <p className="text-sm font-semibold">{shop.tagline}</p>}
            {shop.description && <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line">{shop.description}</p>}
            <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
              {shop.ratingCount > 0 && <span className="px-2 py-1 rounded-full bg-amber-400/15 flex items-center gap-1"><Stars value={Number(shop.ratingAvg)} size="w-3 h-3" /> {Number(shop.ratingAvg).toFixed(1)} ({shop.ratingCount})</span>}
              {shop.deliveryEnabled && <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">🛵 Antar {shop.deliveryFee ? rupiah(shop.deliveryFee) : "gratis"}</span>}
              {shop.pickupEnabled && <span className="px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800">🏠 Ambil sendiri</span>}
              {shop.minOrder > 0 && <span className="px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800">Min. {rupiah(shop.minOrder)}</span>}
              {shop.paymentMethods.qris && <span className="px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800">QRIS</span>}
              {shop.paymentMethods.transfer && <span className="px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800">Transfer</span>}
            </div>
            <p className="text-[11px] text-slate-500">
              <Clock className="w-3 h-3 inline -mt-0.5" /> {shop.weeklyHours.length ? shop.weeklyHours.map((h) => `${DAY_NAMES[h.day]} ${h.start}–${h.end}`).join(" · ") : "Jam buka belum diatur"}
            </p>
            {shop.phone && (
              <a href={waLink(`Halo ${shop.name}, saya lihat lapak Anda di Pasar WargaIn.`, shop.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <MessageCircle className="w-4 h-4" /> Chat WhatsApp
              </a>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {products.map((p) => <ProductCard key={p.id} product={p} shop={shop} onOpen={() => onOpenProduct(p.id)} />)}
            </div>
            {products.length === 0 && <p className="text-xs text-slate-500 text-center py-6">Lapak ini belum punya produk aktif.</p>}
          </div>
        </div>
      )}
    </Sheet>
  );
}
