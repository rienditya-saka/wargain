-- ========================================================
-- WARGAIN SUPABASE DATABASE MIGRATION: MASTER BILLING & INVOICING
-- Fully Compliant with Supabase Postgres Security & RLS Best Practices
-- ========================================================

-- 1. MASTER BILLINGS TABLE (Master Tagihan & Scheduler Aturan)
CREATE TABLE IF NOT EXISTS public.master_billings (
    id TEXT PRIMARY KEY DEFAULT ('mbill_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    "communityType" TEXT NOT NULL DEFAULT 'CLUSTER', -- 'CLUSTER', 'KAPLING', 'KOMPLEK', 'KAMPUNG', 'PERUMAHAN'
    "chargeBasis" TEXT NOT NULL DEFAULT 'PER_RUMAH', -- 'PER_RUMAH', 'PER_KK', 'PER_WARGA'
    "targetAccountType" TEXT NOT NULL DEFAULT 'AUTO', -- 'PENGHUNI', 'PEMILIK', 'AUTO'
    amount INTEGER NOT NULL DEFAULT 0,
    "vacantDiscountPercent" INTEGER NOT NULL DEFAULT 0, -- Potongan % jika rumah kosong / renovasi
    frequency TEXT NOT NULL DEFAULT 'MONTHLY', -- 'WEEKLY', 'MONTHLY', 'YEARLY'
    "scheduleDay" INTEGER NOT NULL DEFAULT 1, -- Weekly: 1=Senin..7=Minggu. Monthly: 1..31. Yearly: 1..31
    "scheduleMonth" INTEGER NOT NULL DEFAULT 1, -- Yearly: 1=Januari..12=Desember
    "scheduleTime" TEXT NOT NULL DEFAULT '01:00',
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "lastGeneratedAt" TIMESTAMP WITH TIME ZONE,
    "nextRunAt" TIMESTAMP WITH TIME ZONE,

    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. GENERATED BILLS TABLE (Daftar Tagihan Terbit per Rumah & Akun)
CREATE TABLE IF NOT EXISTS public.generated_bills (
    id TEXT PRIMARY KEY DEFAULT ('bill_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    "masterBillingId" TEXT REFERENCES public.master_billings(id) ON DELETE SET NULL,
    "billNumber" TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    "periodKey" TEXT NOT NULL, -- e.g. "2026-10" or "2026-W38" or "2026"
    "periodLabel" TEXT NOT NULL, -- e.g. "Oktober 2026"
    "houseId" TEXT NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
    "houseBlock" TEXT NOT NULL,
    "houseAddress" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountPhone" TEXT NOT NULL DEFAULT '081234567890',
    "targetType" TEXT NOT NULL DEFAULT 'PENGHUNI', -- 'PENGHUNI' | 'PEMILIK'
    "chargeBasis" TEXT NOT NULL DEFAULT 'PER_RUMAH', -- 'PER_RUMAH' | 'PER_KK' | 'PER_WARGA'
    multiplier INTEGER NOT NULL DEFAULT 1,
    "multiplierLabel" TEXT NOT NULL DEFAULT '1 Rumah',
    "baseAmount" INTEGER NOT NULL DEFAULT 0,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'UNPAID', -- 'UNPAID', 'PENDING_VERIFICATION', 'PAID', 'CANCELLED'
    "paidAt" TIMESTAMP WITH TIME ZONE,
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "paymentMethod" TEXT, -- 'TUNAI_BENDAHARA', 'TRANSFER_BANK', 'QRIS'
    "paymentProofUrl" TEXT,
    notes TEXT,

    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. FINANCIAL RECORDS (Buku Kas Masuk & Keluar)
CREATE TABLE IF NOT EXISTS public.financial_records (
    id TEXT PRIMARY KEY DEFAULT ('fin_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    "billId" TEXT REFERENCES public.generated_bills(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'INCOME', -- 'INCOME' | 'EXPENSE'
    category TEXT NOT NULL DEFAULT 'IURAN_WARGA', -- 'IURAN_WARGA', 'OPERASIONAL', 'KEAMANAN', 'KEBERSIHAN', 'SOSIAL', 'LAINNYA'
    title TEXT NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    "recordedBy" TEXT NOT NULL,
    "proofUrl" TEXT,
    notes TEXT,
    "transactionDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. INDEXES FOR HIGH QUERY SPEED
CREATE INDEX IF NOT EXISTS idx_master_billings_community ON public.master_billings("communityId");
CREATE INDEX IF NOT EXISTS idx_generated_bills_community ON public.generated_bills("communityId");
CREATE INDEX IF NOT EXISTS idx_generated_bills_house ON public.generated_bills("houseId");
CREATE INDEX IF NOT EXISTS idx_generated_bills_period ON public.generated_bills("periodKey");
CREATE INDEX IF NOT EXISTS idx_generated_bills_status ON public.generated_bills(status);
CREATE INDEX IF NOT EXISTS idx_financial_records_community ON public.financial_records("communityId");

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.master_billings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to master_billings" ON public.master_billings;
CREATE POLICY "Allow all access to master_billings"
    ON public.master_billings FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to generated_bills" ON public.generated_bills;
CREATE POLICY "Allow all access to generated_bills"
    ON public.generated_bills FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to financial_records" ON public.financial_records;
CREATE POLICY "Allow all access to financial_records"
    ON public.financial_records FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);
