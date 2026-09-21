"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ShoppingBag, MapPin, Store, MessageCircle, Utensils, Wrench, Sprout, Shirt, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { LeafletSellerProduct } from "@/components/ui/leaflet-radar-map";

// Dynamically import LeafletRadarMap with SSR disabled
const LeafletRadarMap = dynamic(
  () => import("@/components/ui/leaflet-radar-map").then((mod) => mod.LeafletRadarMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[360px] bg-neutral-950 rounded-3xl border border-neutral-800 animate-pulse flex items-center justify-center text-neutral-500 text-xs">
        Memuat Interactive Leaflet.js Map...
      </div>
    ),
  }
);

interface Product extends LeafletSellerProduct {
  image: string;
  description: string;
  category: "Kuliner Rumahan" | "Jasa Servis AC" | "Kebun Organik Warga" | "Laundry";
  status: "Tersedia Hari Ini" | "Pre-Order Weekend";
}

const PRODUCTS: Product[] = [
  {
    id: "p1",
    title: "Nasi Uduk Betawi Komplit & Sambal Kacang",
    category: "Kuliner Rumahan",
    price: "Rp 15.000",
    sellerName: "Ibu Rina",
    houseBlock: "Blok C3/12",
    status: "Tersedia Hari Ini",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
    sellerAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
    latOffsetKm: 2.5,
    lngOffsetKm: -3.1,
    description: "Nasi uduk harum gurih rempah pilihan dengan empal suwir, telur balado, dan kerupuk renyah. Siap antar gratis antar-blok!",
  },
  {
    id: "p2",
    title: "Cuci AC & Isi Freon Garansi 30 Hari",
    category: "Jasa Servis AC",
    price: "Rp 75.000 / unit",
    sellerName: "Pak Masrum",
    houseBlock: "Blok A1/05",
    status: "Tersedia Hari Ini",
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80",
    sellerAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80",
    latOffsetKm: -4.2,
    lngOffsetKm: 5.8,
    description: "Teknisi AC bersertifikat tetangga sendiri. Jujur, bersihkan water tray, cek kebocoran freon gratis.",
  },
  {
    id: "p3",
    title: "Sayur Bayam & Tomat Organik Hidroponik",
    category: "Kebun Organik Warga",
    price: "Rp 12.000 / pack",
    sellerName: "Mbak Ratna",
    houseBlock: "Blok B2/18",
    status: "Tersedia Hari Ini",
    image: "https://images.unsplash.com/photo-1592417817098-8f3d6eb23659?auto=format&fit=crop&w=600&q=80",
    sellerAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80",
    latOffsetKm: 6.1,
    lngOffsetKm: 2.3,
    description: "Bebas pestisida kimia, dipetik langsung dari greenhouse atap rumah Blok B2. Segar dan crunchy!",
  },
  {
    id: "p4",
    title: "Lapis Legit Premium & Bolu Karamel",
    category: "Kuliner Rumahan",
    price: "Rp 85.000",
    sellerName: "Tante Henny",
    houseBlock: "Blok D4/08",
    status: "Pre-Order Weekend",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80",
    sellerAvatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80",
    latOffsetKm: -8.5,
    lngOffsetKm: -7.2,
    description: "Menggunakan mentega Wijsman asli. Dibuat fresh Sabtu pagi untuk menemani teh hangat keluarga.",
  },
  {
    id: "p5",
    title: "Express Laundry Antar-Jemput Sepatu & Bedcover",
    category: "Laundry",
    price: "Rp 8.000 / kg",
    sellerName: "Keluarga Mas Aris",
    houseBlock: "Blok C1/02",
    status: "Tersedia Hari Ini",
    image: "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=600&q=80",
    sellerAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
    latOffsetKm: 12.3,
    lngOffsetKm: -11.0,
    description: "Cuci bersih wangi tahan 7 hari. Antar jemput gratis untuk area klaster kita.",
  },
];

const CATEGORIES = [
  { id: "Semua", label: "Semua Produk", icon: Store },
  { id: "Kuliner Rumahan", label: "Kuliner Rumahan", icon: Utensils },
  { id: "Jasa Servis AC", label: "Servis AC", icon: Wrench },
  { id: "Kebun Organik Warga", label: "Kebun Organik", icon: Sprout },
  { id: "Laundry", label: "Laundry", icon: Shirt },
];

export function WargaCommerceSection() {
  const [selectedCategory, setSelectedCategory] = React.useState<string>("Semua");
  const [orderModalProduct, setOrderModalProduct] = React.useState<Product | null>(null);

  const filteredProducts = PRODUCTS.filter(
    (p) => selectedCategory === "Semua" || p.category === selectedCategory
  );

  const handleOrder = (product: Product) => {
    toast.success(`Pesanan untuk "${product.title}" berhasil disimulasikan!`, {
      description: `Notifikasi WhatsApp dikirim ke ${product.sellerName} (${product.houseBlock}).`,
    });
    setOrderModalProduct(null);
  };

  const handleSelectFromMap = (leafletProd: LeafletSellerProduct) => {
    const fullProd = PRODUCTS.find((p) => p.id === leafletProd.id);
    if (fullProd) {
      setOrderModalProduct(fullProd);
    }
  };

  return (
    <section id="commerce" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
        <div>
          <Badge variant="amber" className="mb-3">
            <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
            Warga Commerce (Pasar Hyperlocal)
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground">
            Bazar Digital Antar-Tetangga
          </h2>
        </div>
        <p className="text-sm md:text-base text-muted-foreground max-w-md">
          Dukung usaha mikro tetangga sebelah. Bebas ongkir mahal, diantar langsung dalam hitungan menit.
        </p>
      </div>

      {/* LeafletJS Real Interactive Map Section */}
      <div className="mb-10">
        <LeafletRadarMap products={PRODUCTS} onSelectProduct={handleSelectFromMap} />
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer min-h-[40px] border ${
                isActive
                  ? "bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-md shadow-amber-500/20"
                  : "bg-muted/60 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((prod, idx) => (
          <motion.div
            key={prod.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: idx * 0.08 }}
          >
            <Card variant="interactive" padding="none" className="h-full flex flex-col group">
              {/* Product Cover Image */}
              <div className="relative h-48 w-full overflow-hidden">
                <img
                  src={prod.image}
                  alt={prod.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3">
                  <Badge variant={prod.status === "Tersedia Hari Ini" ? "emerald" : "amber"}>
                    {prod.status}
                  </Badge>
                </div>
                <div className="absolute bottom-3 right-3 bg-neutral-950/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-extrabold text-white border border-neutral-800">
                  {prod.price}
                </div>
              </div>

              {/* Card Body */}
              <CardContent className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  {/* Seller Header */}
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <img
                      src={prod.sellerAvatar}
                      alt={prod.sellerName}
                      className="w-7 h-7 rounded-full object-cover border border-amber-500/40"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-foreground">{prod.sellerName}</span>
                      <span className="text-muted-foreground ml-1 font-mono">({prod.houseBlock})</span>
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-foreground leading-snug group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {prod.title}
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {prod.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-500" /> Antar Gratis Antar-Blok
                  </span>
                  <Button
                    variant="amber"
                    size="sm"
                    onClick={() => setOrderModalProduct(prod)}
                    className="gap-1.5 font-bold text-slate-950"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Pesan</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Order Simulation Modal */}
      <Dialog open={!!orderModalProduct} onOpenChange={() => setOrderModalProduct(null)}>
        <DialogContent className="max-w-md">
          {orderModalProduct && (
            <>
              <DialogHeader>
                <Badge variant="amber" className="w-fit mb-2">
                  Format Pesanan Warga Commerce
                </Badge>
                <DialogTitle className="text-lg font-bold">
                  {orderModalProduct.title}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Penjual: {orderModalProduct.sellerName} • {orderModalProduct.houseBlock}
                </DialogDescription>
              </DialogHeader>

              <div className="py-3 space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-muted/60 border border-border space-y-1.5">
                  <div className="flex justify-between font-medium">
                    <span>Harga Produk:</span>
                    <span className="font-bold text-foreground">{orderModalProduct.price}</span>
                  </div>
                  <div className="flex justify-between font-medium text-emerald-600 dark:text-emerald-400">
                    <span>Ongkos Kirim Tetangga:</span>
                    <span className="font-bold">GRATIS</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Catatan / Alamat Blok Anda:</label>
                  <input
                    type="text"
                    defaultValue="Blok C2/09 - Tolong titip di pos satpam jika tidak ada orang"
                    className="w-full px-3 py-2 rounded-lg border border-input text-xs bg-background focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setOrderModalProduct(null)}>
                  Batal
                </Button>
                <Button
                  variant="amber"
                  size="sm"
                  onClick={() => handleOrder(orderModalProduct)}
                  className="gap-1.5 font-bold text-slate-950"
                >
                  <Check className="w-4 h-4" />
                  Kirim Pesanan WhatsApp
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
