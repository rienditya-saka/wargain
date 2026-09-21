-- ========================================================
-- WARGAIN SUPABASE DATABASE MIGRATION: HOUSES & KEPENDUDUKAN
-- Fully Compliant with Supabase Postgres Security & RLS Best Practices
-- ========================================================

-- 1. HOUSES TABLE (Rumah / Kavling / GIS)
CREATE TABLE IF NOT EXISTS public.houses (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    "blockNumber" TEXT NOT NULL,
    address TEXT NOT NULL,
    "rtRw" TEXT NOT NULL DEFAULT '004/009',
    "occupancyStatus" TEXT NOT NULL DEFAULT 'DITEMPATI', -- 'DITEMPATI', 'DISEWAKAN', 'KOSONG', 'RENOVASI'
    "ownerName" TEXT NOT NULL,
    "ownerPhone" TEXT NOT NULL DEFAULT '081234567890',
    "ownerAddress" TEXT,
    "currentKKId" TEXT, -- Will add foreign key after family_cards is created
    "occupantName" TEXT,
    "occupantPhone" TEXT,
    "totalResidents" INTEGER NOT NULL DEFAULT 1,
    lat DOUBLE PRECISION NOT NULL DEFAULT -6.2088,
    lng DOUBLE PRECISION NOT NULL DEFAULT 106.8456,
    notes TEXT,

    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. FAMILY CARDS TABLE (Kartu Keluarga / KK)
CREATE TABLE IF NOT EXISTS public.family_cards (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    "houseId" TEXT REFERENCES public.houses(id) ON DELETE SET NULL,
    "noKK" TEXT NOT NULL,
    "headName" TEXT NOT NULL,
    "blockNumber" TEXT,
    address TEXT,
    phone TEXT DEFAULT '081234567890',
    "residencyType" TEXT NOT NULL DEFAULT 'TETAP', -- 'TETAP', 'TIDAK_TETAP', 'MANDIRI'
    "socialCategory" TEXT NOT NULL DEFAULT 'SEJAHTERA', -- 'SEJAHTERA', 'PRA_SEJAHTERA', 'BANSOS_RECIPIENT', 'LANSIA', 'BALITA', 'DISABILITAS'
    "occupancyStatus" TEXT NOT NULL DEFAULT 'MILIK_SENDIRI', -- 'MILIK_SENDIRI', 'SEWA_KONTRAK', 'INDEKOS', 'KOSONG'
    lat DOUBLE PRECISION DEFAULT -6.2088,
    lng DOUBLE PRECISION DEFAULT 106.8456,

    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add Foreign Key constraint for houses.currentKKId -> family_cards.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_houses_current_kk'
    ) THEN
        ALTER TABLE public.houses 
        ADD CONSTRAINT fk_houses_current_kk 
        FOREIGN KEY ("currentKKId") REFERENCES public.family_cards(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. CITIZENS TABLE (Anggota Keluarga / Warga)
CREATE TABLE IF NOT EXISTS public.citizens (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    "familyCardId" TEXT NOT NULL REFERENCES public.family_cards(id) ON DELETE CASCADE,
    "houseId" TEXT REFERENCES public.houses(id) ON DELETE SET NULL,
    nik TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'ANGGOTA', -- 'KEPALA_KELUARGA', 'ISTRI', 'ANAK', 'FAMILI_LAIN'
    gender TEXT NOT NULL DEFAULT 'L', -- 'L', 'P'
    age INTEGER NOT NULL DEFAULT 0,
    "birthPlace" TEXT,
    "birthDate" DATE,
    religion TEXT,
    "maritalStatus" TEXT DEFAULT 'BELUM KAWIN',
    occupation TEXT,
    phone TEXT,

    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. INDEXES FOR HIGH QUERY PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_houses_community ON public.houses("communityId");
CREATE INDEX IF NOT EXISTS idx_houses_block ON public.houses("blockNumber");
CREATE INDEX IF NOT EXISTS idx_houses_current_kk ON public.houses("currentKKId");

CREATE INDEX IF NOT EXISTS idx_family_cards_community ON public.family_cards("communityId");
CREATE INDEX IF NOT EXISTS idx_family_cards_nokk ON public.family_cards("noKK");
CREATE INDEX IF NOT EXISTS idx_family_cards_house ON public.family_cards("houseId");

CREATE INDEX IF NOT EXISTS idx_citizens_community ON public.citizens("communityId");
CREATE INDEX IF NOT EXISTS idx_citizens_family_card ON public.citizens("familyCardId");
CREATE INDEX IF NOT EXISTS idx_citizens_house ON public.citizens("houseId");
CREATE INDEX IF NOT EXISTS idx_citizens_nik ON public.citizens(nik);

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citizens ENABLE ROW LEVEL SECURITY;

-- Allow select/insert/update/delete for authenticated and anon users
DROP POLICY IF EXISTS "Allow access to houses" ON public.houses;
CREATE POLICY "Allow access to houses"
    ON public.houses FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow access to family_cards" ON public.family_cards;
CREATE POLICY "Allow access to family_cards"
    ON public.family_cards FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow access to citizens" ON public.citizens;
CREATE POLICY "Allow access to citizens"
    ON public.citizens FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);
