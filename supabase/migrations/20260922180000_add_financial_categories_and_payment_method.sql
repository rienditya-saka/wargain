-- MIGRATION: Add financial_categories table and paymentMethod column to financial_records

-- 1. Add paymentMethod column to financial_records
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT DEFAULT 'TUNAI';

-- 2. Backfill paymentMethod from linked generated_bills
UPDATE public.financial_records fr
SET "paymentMethod" = gb."paymentMethod"
FROM public.generated_bills gb
WHERE fr."billId" = gb.id AND (fr."paymentMethod" IS NULL OR fr."paymentMethod" = 'TUNAI');

-- 3. Create financial_categories table for customizable income/expense posts
CREATE TABLE IF NOT EXISTS public.financial_categories (
    id TEXT PRIMARY KEY DEFAULT ('fincat_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'EXPENSE', -- 'INCOME' | 'EXPENSE'
    description TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cat_community_code UNIQUE ("communityId", code)
);

CREATE INDEX IF NOT EXISTS idx_financial_categories_community ON public.financial_categories("communityId");
CREATE INDEX IF NOT EXISTS idx_financial_categories_type ON public.financial_categories(type);

ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to financial_categories" ON public.financial_categories;
CREATE POLICY "Allow all access to financial_categories"
    ON public.financial_categories FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);
