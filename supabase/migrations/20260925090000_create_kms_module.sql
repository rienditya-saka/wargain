-- ========================================================
-- WARGAIN SUPABASE DATABASE MIGRATION: KMS DIGITAL & IMUNISASI
-- Growth measurements (from posyandu or manual entry) and immunization records per child.
-- Z-scores are computed in the app (WHO Child Growth Standards, src/lib/kms), not stored,
-- so a correction to the reference data applies to all history.
-- ========================================================

CREATE TABLE IF NOT EXISTS public.growth_measurements (
    id TEXT PRIMARY KEY DEFAULT ('gm_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    "citizenId" TEXT NOT NULL REFERENCES public.citizens(id) ON DELETE CASCADE,
    "measuredAt" DATE NOT NULL,
    "weightKg" NUMERIC(5,2),
    "heightCm" NUMERIC(5,1),
    "headCm" NUMERIC(4,1),
    "armCm" NUMERIC(4,1),
    method TEXT, -- 'LENGTH' (telentang) | 'HEIGHT' (berdiri); NULL = by age
    "vitaminA" BOOLEAN NOT NULL DEFAULT FALSE,
    source TEXT NOT NULL DEFAULT 'POSYANDU', -- 'POSYANDU' | 'MANUAL' | 'PUSKESMAS'
    "registrationId" TEXT UNIQUE REFERENCES public.social_event_registrations(id) ON DELETE SET NULL,
    "recordedBy" TEXT,
    notes TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_growth_citizen_date ON public.growth_measurements("citizenId", "measuredAt");
CREATE INDEX IF NOT EXISTS idx_growth_community_date ON public.growth_measurements("communityId", "measuredAt");

CREATE TABLE IF NOT EXISTS public.immunization_records (
    id TEXT PRIMARY KEY DEFAULT ('imun_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    "citizenId" TEXT NOT NULL REFERENCES public.citizens(id) ON DELETE CASCADE,
    "vaccineCode" TEXT NOT NULL, -- see src/lib/kms/immunization.ts (HB0, BCG, DPT1, MR1, ...)
    "givenAt" DATE NOT NULL,
    place TEXT, -- mis. Posyandu Melati / Puskesmas Babelan / RS
    "registrationId" TEXT REFERENCES public.social_event_registrations(id) ON DELETE SET NULL,
    "recordedBy" TEXT,
    notes TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_immunization_dose UNIQUE ("citizenId", "vaccineCode")
);
CREATE INDEX IF NOT EXISTS idx_immunization_community ON public.immunization_records("communityId");

-- Backfill from posyandu results already stored on registrations.
INSERT INTO public.growth_measurements (id, "communityId", "citizenId", "measuredAt", "weightKg", "heightCm", "headCm", "armCm", "vitaminA", source, "registrationId", "createdAt", "updatedAt")
SELECT 'gm_' || r.id, r."communityId", r."citizenId", (COALESCE(r."checkInAt", e."startAt") AT TIME ZONE 'Asia/Jakarta')::date,
       NULLIF(r.measurements->>'beratKg', '')::numeric, NULLIF(r.measurements->>'tinggiCm', '')::numeric,
       NULLIF(r.measurements->>'lingkarKepalaCm', '')::numeric, NULLIF(r.measurements->>'lingkarLenganCm', '')::numeric,
       COALESCE((r.measurements->>'vitaminA')::boolean, FALSE), 'POSYANDU', r.id, NOW(), NOW()
FROM public.social_event_registrations r
JOIN public.social_events e ON e.id = r."eventId"
WHERE r."citizenId" IS NOT NULL
  AND e.category = 'POSYANDU_BALITA'
  AND (r.measurements ? 'beratKg' OR r.measurements ? 'tinggiCm')
ON CONFLICT DO NOTHING;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['growth_measurements', 'immunization_records'] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow read access to %s" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Allow read access to %s" ON public.%I FOR SELECT TO authenticated, anon USING (true)', t, t);
        IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
           AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;
