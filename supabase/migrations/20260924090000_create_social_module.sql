-- ========================================================
-- WARGAIN SUPABASE DATABASE MIGRATION: MODUL SOSIAL & NOTIFIKASI
-- Kegiatan sosial (posyandu balita/lansia, kerja bakti, pengajian, dll), pendaftaran
-- peserta (mandiri / otomatis / petugas), hasil ukur posyandu, dan notifikasi per akun.
-- Writes go through Next.js API routes (service role). Clients only get SELECT for Realtime.
-- ========================================================

-- 0. Link login accounts to their resident record & house
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "citizenId" TEXT REFERENCES public.citizens(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "houseBlock" TEXT;
CREATE INDEX IF NOT EXISTS idx_users_citizen ON public.users("citizenId");
CREATE INDEX IF NOT EXISTS idx_users_house_block ON public.users("communityId", "houseBlock");

-- 1. KEGIATAN SOSIAL
CREATE TABLE IF NOT EXISTS public.social_events (
    id TEXT PRIMARY KEY DEFAULT ('evt_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    "seriesId" TEXT, -- events generated together as a recurring series share this id
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'LAINNYA', -- 'POSYANDU_BALITA' | 'POSYANDU_LANSIA' | 'KERJA_BAKTI' | 'PENGAJIAN' | 'SENAM' | 'DONOR_DARAH' | 'VAKSINASI' | 'BAKTI_SOSIAL' | 'RAPAT_WARGA' | 'LOMBA' | 'LAINNYA'
    description TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    "startAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "endAt" TIMESTAMP WITH TIME ZONE,
    audience TEXT NOT NULL DEFAULT 'SEMUA', -- 'SEMUA' | 'BALITA' | 'LANSIA' | 'ANAK' | 'REMAJA' | 'KEPALA_KELUARGA' | 'IBU'
    "autoEnroll" BOOLEAN NOT NULL DEFAULT FALSE,
    "registrationOpen" BOOLEAN NOT NULL DEFAULT TRUE,
    capacity INTEGER, -- NULL = tidak dibatasi
    services TEXT[] NOT NULL DEFAULT '{}', -- mis. 'Timbang', 'Imunisasi', 'Cek Tensi'
    "organizerName" TEXT NOT NULL,
    "contactPhone" TEXT,
    "coverUrl" TEXT,
    status TEXT NOT NULL DEFAULT 'TERJADWAL', -- 'TERJADWAL' | 'SELESAI' | 'DIBATALKAN'
    "cancelReason" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. PESERTA KEGIATAN
CREATE TABLE IF NOT EXISTS public.social_event_registrations (
    id TEXT PRIMARY KEY DEFAULT ('reg_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    "eventId" TEXT NOT NULL REFERENCES public.social_events(id) ON DELETE CASCADE,
    "citizenId" TEXT REFERENCES public.citizens(id) ON DELETE SET NULL,
    "participantName" TEXT NOT NULL,
    "houseBlock" TEXT,
    age INTEGER,
    gender TEXT,
    "registeredBy" TEXT, -- users.id of whoever registered (NULL for auto-enroll)
    source TEXT NOT NULL DEFAULT 'MANDIRI', -- 'MANDIRI' | 'OTOMATIS' | 'PETUGAS'
    status TEXT NOT NULL DEFAULT 'TERDAFTAR', -- 'TERDAFTAR' | 'HADIR' | 'TIDAK_HADIR' | 'BATAL'
    "checkInAt" TIMESTAMP WITH TIME ZONE,
    measurements JSONB NOT NULL DEFAULT '{}'::jsonb, -- posyandu: beratKg, tinggiCm, lingkarKepalaCm, tensi, gulaDarah, ...
    notes TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
-- One registration per resident per event (manual guests without citizenId are not constrained).
CREATE UNIQUE INDEX IF NOT EXISTS uq_social_registration_citizen
    ON public.social_event_registrations("eventId", "citizenId") WHERE "citizenId" IS NOT NULL;

-- 3. NOTIFIKASI PER AKUN
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY DEFAULT ('notif_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'SOCIAL_NEW_EVENT' | 'SOCIAL_AUTO_ENROLLED' | 'SOCIAL_REGISTERED' | 'SOCIAL_REMINDER' | 'SOCIAL_CANCELLED' | 'SOCIAL_UPDATED' | 'SOCIAL_RESULT'
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    link TEXT,
    "eventId" TEXT REFERENCES public.social_events(id) ON DELETE CASCADE,
    "readAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_social_events_community_start ON public.social_events("communityId", "startAt");
CREATE INDEX IF NOT EXISTS idx_social_events_series ON public.social_events("seriesId");
CREATE INDEX IF NOT EXISTS idx_social_reg_event ON public.social_event_registrations("eventId");
CREATE INDEX IF NOT EXISTS idx_social_reg_citizen ON public.social_event_registrations("citizenId");
CREATE INDEX IF NOT EXISTS idx_social_reg_house ON public.social_event_registrations("communityId", "houseBlock");
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications("userId") WHERE "readAt" IS NULL;

-- 5. RLS (read-only for clients) + REALTIME
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY['social_events', 'social_event_registrations', 'notifications'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow read access to %s" ON public.%I', t, t);
        EXECUTE format(
            'CREATE POLICY "Allow read access to %s" ON public.%I FOR SELECT TO authenticated, anon USING (true)',
            t, t
        );
        IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
           AND NOT EXISTS (
               SELECT 1 FROM pg_publication_tables
               WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
           ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;
