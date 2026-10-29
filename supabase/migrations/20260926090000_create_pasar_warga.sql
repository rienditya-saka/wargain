-- ========================================================
-- WARGAIN SUPABASE DATABASE MIGRATION: PASAR WARGA (WARGA COMMERCE)
-- Lapak warga, produk & jasa, pesanan / booking, pembayaran (tunai, transfer, QRIS) dan ulasan.
-- Writes go through Next.js API routes (service role). Clients get SELECT for catalog + Realtime.
-- ========================================================

-- 1. LAPAK
CREATE TABLE IF NOT EXISTS public.shops (
    id TEXT PRIMARY KEY DEFAULT ('shop_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    "ownerId" TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    tagline TEXT,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'LAINNYA', -- KULINER | KUE | SAYUR | FASHION | KEBUTUHAN | JASA_RUMAH | JASA_SERVIS | LES | KECANTIKAN | LAUNDRY | LAINNYA
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "houseBlock" TEXT,
    phone TEXT,
    "isOpen" BOOLEAN NOT NULL DEFAULT TRUE, -- manual "tutup sementara" switch
    -- weekly hours for products + booking availability for services: [{ day: 0-6, start: "08:00", end: "17:00" }]
    "weeklyHours" JSONB NOT NULL DEFAULT '[{"day":1,"start":"08:00","end":"17:00"},{"day":2,"start":"08:00","end":"17:00"},{"day":3,"start":"08:00","end":"17:00"},{"day":4,"start":"08:00","end":"17:00"},{"day":5,"start":"08:00","end":"17:00"},{"day":6,"start":"08:00","end":"14:00"}]'::jsonb,
    "closedDates" DATE[] NOT NULL DEFAULT '{}',
    "pickupEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
    "deliveryEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
    "deliveryFee" INTEGER NOT NULL DEFAULT 0,
    "minOrder" INTEGER NOT NULL DEFAULT 0,
    -- { cash: true, transfer: { bank, accountNo, accountName } | null, qris: { imageUrl } | null }
    "paymentMethods" JSONB NOT NULL DEFAULT '{"cash": true, "transfer": null, "qris": null}'::jsonb,
    "ratingAvg" NUMERIC(3,2) NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'AKTIF', -- AKTIF | DINONAKTIFKAN (by pengurus)
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_shop_owner UNIQUE ("communityId", "ownerId")
);

-- 2. PRODUK & JASA
CREATE TABLE IF NOT EXISTS public.shop_products (
    id TEXT PRIMARY KEY DEFAULT ('prd_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    "shopId" TEXT NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'PRODUK', -- PRODUK | JASA
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'LAINNYA',
    price INTEGER NOT NULL CHECK (price >= 0),
    "comparePrice" INTEGER, -- harga coret
    unit TEXT NOT NULL DEFAULT 'pcs',
    images TEXT[] NOT NULL DEFAULT '{}',
    "trackStock" BOOLEAN NOT NULL DEFAULT TRUE,
    stock INTEGER CHECK (stock IS NULL OR stock >= 0),
    "lowStockAt" INTEGER NOT NULL DEFAULT 3,
    variants JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ name: "Pedas", priceDelta: 2000 }]
    "preorderDays" INTEGER NOT NULL DEFAULT 0, -- 0 = ready stock
    "maxPerOrder" INTEGER,
    -- JASA only
    "durationMin" INTEGER,
    "slotCapacity" INTEGER NOT NULL DEFAULT 1,
    "serviceLocation" TEXT, -- DI_TEMPAT (buyer comes) | KE_RUMAH (seller visits)
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "ratingAvg" NUMERIC(3,2) NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. PESANAN & BOOKING
CREATE TABLE IF NOT EXISTS public.shop_orders (
    id TEXT PRIMARY KEY DEFAULT ('ord_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    "shopId" TEXT NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    "orderNumber" TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL DEFAULT 'PRODUK', -- PRODUK | JASA
    "buyerId" TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    "buyerName" TEXT NOT NULL,
    "buyerBlock" TEXT,
    "buyerPhone" TEXT,
    items JSONB NOT NULL, -- [{ productId, name, variant, price, qty, subtotal, unit }]
    subtotal INTEGER NOT NULL,
    "deliveryFee" INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL,
    fulfillment TEXT NOT NULL DEFAULT 'AMBIL', -- AMBIL | ANTAR | DI_TEMPAT | KE_RUMAH
    "scheduledAt" TIMESTAMP WITH TIME ZONE, -- booking start / pre-order ready time
    "scheduledEnd" TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'MENUNGGU', -- MENUNGGU | DIKONFIRMASI | DIPROSES | SIAP | DIANTAR | SELESAI | DITOLAK | DIBATALKAN
    "statusHistory" JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ status, at, by, note }]
    "paymentMethod" TEXT NOT NULL DEFAULT 'TUNAI', -- TUNAI | TRANSFER | QRIS
    "paymentStatus" TEXT NOT NULL DEFAULT 'BELUM_BAYAR', -- BELUM_BAYAR | MENUNGGU_VERIFIKASI | LUNAS | DITOLAK | DIKEMBALIKAN
    "paymentProofUrl" TEXT,
    "paidAt" TIMESTAMP WITH TIME ZONE,
    "stockReserved" BOOLEAN NOT NULL DEFAULT FALSE,
    "cancelReason" TEXT,
    rating INTEGER CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
    review TEXT,
    "reviewedAt" TIMESTAMP WITH TIME ZONE,
    "sellerReply" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_shops_community ON public.shops("communityId", status);
CREATE INDEX IF NOT EXISTS idx_products_shop ON public.shop_products("shopId", "isActive");
CREATE INDEX IF NOT EXISTS idx_products_community ON public.shop_products("communityId", "isActive", type);
CREATE INDEX IF NOT EXISTS idx_orders_shop ON public.shop_orders("shopId", status, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON public.shop_orders("buyerId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_orders_schedule ON public.shop_orders("shopId", "scheduledAt") WHERE "scheduledAt" IS NOT NULL;

-- 5. ATOMIC STOCK: reserve (direction -1) or release (+1) every item in one transaction.
-- Raises STOK_HABIS:<product name> when any tracked item is short, so nothing is taken partially.
CREATE OR REPLACE FUNCTION public.shop_adjust_stock(p_items JSONB, p_direction INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    it JSONB;
    prod RECORD;
    qty INTEGER;
BEGIN
    IF p_direction NOT IN (-1, 1) THEN
        RAISE EXCEPTION 'direction harus -1 atau 1';
    END IF;
    FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        qty := (it->>'qty')::INTEGER;
        SELECT id, name, "trackStock", stock INTO prod FROM public.shop_products WHERE id = it->>'productId' FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'PRODUK_TIDAK_ADA:%', it->>'productId';
        END IF;
        IF prod."trackStock" AND prod.stock IS NOT NULL THEN
            IF p_direction = -1 AND prod.stock < qty THEN
                RAISE EXCEPTION 'STOK_HABIS:%', prod.name;
            END IF;
            UPDATE public.shop_products SET stock = stock + (p_direction * qty), "updatedAt" = NOW() WHERE id = prod.id;
        END IF;
    END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.shop_adjust_stock(JSONB, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shop_adjust_stock(JSONB, INTEGER) TO service_role;

-- 6. RLS (read-only catalog for clients) + REALTIME. Orders contain buyer data: no client policy.
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to shops" ON public.shops;
CREATE POLICY "Allow read access to shops" ON public.shops FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Allow read access to shop_products" ON public.shop_products;
CREATE POLICY "Allow read access to shop_products" ON public.shop_products FOR SELECT TO authenticated, anon USING (true);

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['shops', 'shop_products'] LOOP
        IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
           AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;
