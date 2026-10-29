-- ========================================================
-- WARGAIN SUPABASE DATABASE MIGRATION: BALAI WARGA
-- Polling, musyawarah (rapat + notulen + keputusan), galang dana, pinjam inventaris RT, kontak penting.
-- "Kabar terbaru" uses feed_posts (type KABAR), so it needs no table of its own.
-- Writes go through Next.js API routes (service role).
-- ========================================================

-- 1. POLLING
CREATE TABLE IF NOT EXISTS public.polls (
    id TEXT PRIMARY KEY DEFAULT ('poll_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    options JSONB NOT NULL, -- [{ id, label }]
    "maxChoices" INTEGER NOT NULL DEFAULT 1,
    anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    "voteScope" TEXT NOT NULL DEFAULT 'USER', -- USER (1 akun 1 suara) | HOUSE (1 KK/rumah 1 suara)
    audience TEXT NOT NULL DEFAULT 'SEMUA', -- SEMUA | PENGURUS
    "closesAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'AKTIF', -- AKTIF | DITUTUP
    "meetingId" TEXT,
    "createdBy" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.poll_votes (
    id TEXT PRIMARY KEY DEFAULT ('vote_' || gen_random_uuid()::text),
    "pollId" TEXT NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    "voterKey" TEXT NOT NULL, -- userId, or the house key when voteScope = HOUSE
    "voterName" TEXT NOT NULL,
    "houseBlock" TEXT,
    "optionIds" TEXT[] NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_poll_voter UNIQUE ("pollId", "voterKey")
);

-- 2. MUSYAWARAH
CREATE TABLE IF NOT EXISTS public.meetings (
    id TEXT PRIMARY KEY DEFAULT ('mtg_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    "startAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "endAt" TIMESTAMP WITH TIME ZONE,
    location TEXT NOT NULL,
    "onlineUrl" TEXT,
    agenda JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ id, title, presenter }]
    audience TEXT NOT NULL DEFAULT 'SEMUA', -- SEMUA | KEPALA_KELUARGA | PENGURUS
    status TEXT NOT NULL DEFAULT 'TERJADWAL', -- TERJADWAL | BERLANGSUNG | SELESAI | DIBATALKAN
    minutes TEXT, -- notulen
    decisions JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ id, text, pic, dueDate, done }]
    "cancelReason" TEXT,
    "createdBy" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.meeting_attendees (
    id TEXT PRIMARY KEY DEFAULT ('att_' || gen_random_uuid()::text),
    "meetingId" TEXT NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    "houseBlock" TEXT,
    rsvp TEXT NOT NULL DEFAULT 'HADIR', -- HADIR | MUNGKIN | TIDAK
    "checkedInAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_meeting_attendee UNIQUE ("meetingId", "userId")
);

-- 3. GALANG DANA
CREATE TABLE IF NOT EXISTS public.fundraisers (
    id TEXT PRIMARY KEY DEFAULT ('fund_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    story TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'LAINNYA', -- DUKA | SAKIT | BENCANA | PEMBANGUNAN | KEGIATAN | LAINNYA
    beneficiary TEXT,
    "targetAmount" INTEGER NOT NULL DEFAULT 0,
    deadline DATE,
    "coverUrl" TEXT,
    "paymentInfo" TEXT, -- rekening / QRIS kas RT
    status TEXT NOT NULL DEFAULT 'AKTIF', -- AKTIF | SELESAI
    "createdBy" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.donations (
    id TEXT PRIMARY KEY DEFAULT ('don_' || gen_random_uuid()::text),
    "fundraiserId" TEXT NOT NULL REFERENCES public.fundraisers(id) ON DELETE CASCADE,
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    "donorId" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    "donorName" TEXT NOT NULL,
    anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    amount INTEGER NOT NULL CHECK (amount > 0),
    message TEXT,
    method TEXT NOT NULL DEFAULT 'TRANSFER', -- TRANSFER | TUNAI
    "proofUrl" TEXT,
    status TEXT NOT NULL DEFAULT 'MENUNGGU', -- MENUNGGU | DITERIMA | DITOLAK
    "verifiedBy" TEXT,
    "financialRecordId" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. INVENTARIS RT
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id TEXT PRIMARY KEY DEFAULT ('inv_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'LAINNYA', -- TENDA | KURSI_MEJA | SOUND | ALAT_KERJA | DAPUR | LAINNYA
    description TEXT NOT NULL DEFAULT '',
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    unit TEXT NOT NULL DEFAULT 'unit',
    "photoUrl" TEXT,
    "feePerDay" INTEGER NOT NULL DEFAULT 0, -- biaya sewa/kebersihan ke kas RT (0 = gratis)
    "maxDays" INTEGER NOT NULL DEFAULT 3,
    condition TEXT NOT NULL DEFAULT 'BAIK', -- BAIK | PERLU_PERBAIKAN
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_loans (
    id TEXT PRIMARY KEY DEFAULT ('loan_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    "itemId" TEXT NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    "borrowerId" TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    "borrowerName" TEXT NOT NULL,
    "houseBlock" TEXT,
    qty INTEGER NOT NULL CHECK (qty > 0),
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    purpose TEXT NOT NULL,
    fee INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'DIAJUKAN', -- DIAJUKAN | DISETUJUI | DIPINJAM | DIKEMBALIKAN | DITOLAK | DIBATALKAN
    "returnNote" TEXT,
    "decisionNote" TEXT,
    "handledBy" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_loan_dates CHECK ("endDate" >= "startDate")
);

-- 5. KONTAK PENTING
CREATE TABLE IF NOT EXISTS public.directory_contacts (
    id TEXT PRIMARY KEY DEFAULT ('ct_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'LAYANAN', -- DARURAT | KESEHATAN | PEMERINTAHAN | UTILITAS | PENGURUS | LAYANAN
    phone TEXT NOT NULL,
    address TEXT,
    notes TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_polls_community ON public.polls("communityId", status, "closesAt");
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON public.poll_votes("pollId");
CREATE INDEX IF NOT EXISTS idx_meetings_community ON public.meetings("communityId", "startAt");
CREATE INDEX IF NOT EXISTS idx_meeting_att_meeting ON public.meeting_attendees("meetingId");
CREATE INDEX IF NOT EXISTS idx_fundraisers_community ON public.fundraisers("communityId", status);
CREATE INDEX IF NOT EXISTS idx_donations_fund ON public.donations("fundraiserId", status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_community ON public.inventory_items("communityId");
CREATE INDEX IF NOT EXISTS idx_inventory_loans_item ON public.inventory_loans("itemId", "startDate", "endDate");
CREATE INDEX IF NOT EXISTS idx_directory_community ON public.directory_contacts("communityId", category, "sortOrder");

-- 7. RLS: public-ish tables readable (Realtime); vote rows / donations / loans are server-only.
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['polls', 'poll_votes', 'meetings', 'meeting_attendees', 'fundraisers', 'donations', 'inventory_items', 'inventory_loans', 'directory_contacts'] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
    FOREACH t IN ARRAY ARRAY['polls', 'meetings', 'fundraisers', 'inventory_items', 'directory_contacts'] LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow read access to %s" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Allow read access to %s" ON public.%I FOR SELECT TO authenticated, anon USING (true)', t, t);
    END LOOP;
    FOREACH t IN ARRAY ARRAY['polls', 'meetings', 'fundraisers'] LOOP
        IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
           AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;
