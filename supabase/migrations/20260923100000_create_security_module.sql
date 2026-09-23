-- ========================================================
-- WARGAIN SUPABASE DATABASE MIGRATION: MODUL KEAMANAN LINGKUNGAN
-- Panic/SOS, ronda & patroli, gerbang & buku tamu, ANPR kendaraan, kartu pekerja,
-- daftar waspada, hilang & ditemukan, serah terima shift, denda ronda, CCTV, posko bencana.
--
-- Writes go through Next.js API routes with the service role key (bypasses RLS).
-- anon/authenticated only get SELECT so the browser can subscribe to Supabase Realtime.
-- ========================================================

-- 1. PENGATURAN KEAMANAN PER KOMUNITAS
CREATE TABLE IF NOT EXISTS public.security_settings (
    id TEXT PRIMARY KEY DEFAULT ('secset_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL UNIQUE REFERENCES public.communities(id) ON DELETE CASCADE,
    "kawasanType" TEXT NOT NULL DEFAULT 'CLUSTER', -- 'CLUSTER' | 'KAVLING' | 'KAMPUNG'
    "rondaFineEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
    "rondaFineAmount" INTEGER NOT NULL DEFAULT 20000,
    "disasterActive" BOOLEAN NOT NULL DEFAULT FALSE,
    "disasterTitle" TEXT,
    "disasterStartedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. SINYAL PANIC / SOS
CREATE TABLE IF NOT EXISTS public.security_panic_alerts (
    id TEXT PRIMARY KEY DEFAULT ('sos_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    "senderName" TEXT NOT NULL,
    "houseBlock" TEXT NOT NULL,
    phone TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'LAINNYA', -- 'MEDIS' | 'KEBAKARAN' | 'PENCURIAN' | 'KDRT' | 'BENCANA' | 'LAINNYA'
    note TEXT,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    status TEXT NOT NULL DEFAULT 'BARU', -- 'BARU' | 'DIRESPON' | 'SELESAI' | 'DIBATALKAN'
    responder TEXT,
    "respondedAt" TIMESTAMP WITH TIME ZONE,
    "resolvedAt" TIMESTAMP WITH TIME ZONE,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. JADWAL RONDA (anggota & absensi disimpan sebagai JSONB)
CREATE TABLE IF NOT EXISTS public.security_ronda_shifts (
    id TEXT PRIMARY KEY DEFAULT ('shift_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    "startTime" TEXT NOT NULL DEFAULT '22:00',
    "endTime" TEXT NOT NULL DEFAULT '04:00',
    post TEXT NOT NULL,
    members JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{name, houseBlock, status: BELUM|HADIR|IZIN|ALPA, checkInAt}]
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. CHECKPOINT PATROLI (QR / NFC)
CREATE TABLE IF NOT EXISTS public.security_patrol_checkpoints (
    id TEXT PRIMARY KEY DEFAULT ('cp_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    "lastScanAt" TIMESTAMP WITH TIME ZONE,
    "lastScanBy" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. DENDA RONDA (terhubung ke generated_bills modul Kas)
CREATE TABLE IF NOT EXISTS public.security_ronda_fines (
    id TEXT PRIMARY KEY DEFAULT ('fine_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    "shiftId" TEXT NOT NULL,
    "shiftDate" DATE NOT NULL,
    "memberName" TEXT NOT NULL,
    "houseBlock" TEXT NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'TERBIT', -- 'TERBIT' | 'LUNAS' | 'DIBATALKAN'
    "billId" TEXT REFERENCES public.generated_bills(id) ON DELETE SET NULL,
    "billNumber" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ronda_fine_member UNIQUE ("shiftId", "memberName")
);

-- 6. LOG GERBANG / BUKU TAMU
CREATE TABLE IF NOT EXISTS public.security_gate_logs (
    id TEXT PRIMARY KEY DEFAULT ('gate_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'TAMU', -- 'TAMU' | 'KURIR' | 'PEKERJA' | 'OJOL'
    name TEXT NOT NULL,
    plate TEXT,
    "destinationBlock" TEXT NOT NULL,
    purpose TEXT NOT NULL,
    "inAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "outAt" TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'MENUNGGU_KONFIRMASI', -- 'MENUNGGU_KONFIRMASI' | 'DIIZINKAN' | 'DITOLAK' | 'KELUAR'
    "inviteCode" TEXT,
    officer TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 7. UNDANGAN TAMU (PRE-REGISTRASI)
CREATE TABLE IF NOT EXISTS public.security_guest_invites (
    id TEXT PRIMARY KEY DEFAULT ('inv_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    plate TEXT,
    "hostName" TEXT NOT NULL,
    "hostBlock" TEXT NOT NULL,
    "visitDate" DATE NOT NULL,
    note TEXT,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_guest_invite_code UNIQUE ("communityId", code)
);

-- 8. LAPORAN KEJADIAN (dengan koordinat untuk peta sebaran)
CREATE TABLE IF NOT EXISTS public.security_incident_reports (
    id TEXT PRIMARY KEY DEFAULT ('inc_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    category TEXT NOT NULL DEFAULT 'LAINNYA',
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    reporter TEXT NOT NULL,
    anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'DILAPORKAN', -- 'DILAPORKAN' | 'DITINDAKLANJUTI' | 'SELESAI'
    "followUp" TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 9. TITIP RUMAH
CREATE TABLE IF NOT EXISTS public.security_house_watches (
    id TEXT PRIMARY KEY DEFAULT ('hw_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    "houseBlock" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    contact TEXT NOT NULL,
    "from" DATE NOT NULL,
    "to" DATE NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    checks JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{at, by, note}]
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 10. DAFTAR WASPADA (ORANG / KENDARAAN)
CREATE TABLE IF NOT EXISTS public.security_watchlist (
    id TEXT PRIMARY KEY DEFAULT ('watch_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'ORANG', -- 'ORANG' | 'KENDARAAN'
    label TEXT NOT NULL,
    plate TEXT,
    description TEXT NOT NULL,
    "photoUrl" TEXT,
    level TEXT NOT NULL DEFAULT 'WASPADA', -- 'WASPADA' | 'BAHAYA'
    "lastSeenAt" TIMESTAMP WITH TIME ZONE,
    "lastSeenLocation" TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    "reportedBy" TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 11. HILANG & DITEMUKAN
CREATE TABLE IF NOT EXISTS public.security_lost_found (
    id TEXT PRIMARY KEY DEFAULT ('lf_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'HILANG', -- 'HILANG' | 'DITEMUKAN'
    category TEXT NOT NULL DEFAULT 'BARANG', -- 'ANAK' | 'LANSIA' | 'HEWAN' | 'KENDARAAN' | 'BARANG' | 'DOKUMEN'
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    "photoUrl" TEXT,
    "lastSeenLocation" TEXT NOT NULL,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "houseBlock" TEXT,
    reward INTEGER,
    status TEXT NOT NULL DEFAULT 'AKTIF', -- 'AKTIF' | 'SELESAI'
    "resolvedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 12. SERAH TERIMA SHIFT SATPAM
CREATE TABLE IF NOT EXISTS public.security_shift_handovers (
    id TEXT PRIMARY KEY DEFAULT ('ho_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    "shiftLabel" TEXT NOT NULL,
    "fromOfficer" TEXT NOT NULL,
    "toOfficer" TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    checklist JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{item, ok, note}]
    "packagesHeld" INTEGER NOT NULL DEFAULT 0,
    "keysHeld" TEXT NOT NULL DEFAULT '',
    "acknowledgedAt" TIMESTAMP WITH TIME ZONE,
    "acknowledgedBy" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 13. KENDARAAN WARGA (STIKER / RFID)
CREATE TABLE IF NOT EXISTS public.security_resident_vehicles (
    id TEXT PRIMARY KEY DEFAULT ('veh_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    plate TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'MOBIL', -- 'MOBIL' | 'MOTOR'
    "brandColor" TEXT NOT NULL DEFAULT '',
    "ownerName" TEXT NOT NULL,
    "houseBlock" TEXT NOT NULL,
    "stickerCode" TEXT,
    "rfidTag" TEXT,
    status TEXT NOT NULL DEFAULT 'MENUNGGU_VERIFIKASI', -- 'MENUNGGU_VERIFIKASI' | 'AKTIF' | 'NONAKTIF'
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_resident_vehicle_plate UNIQUE ("communityId", plate)
);

-- 14. LOG AKSES KENDARAAN (ANPR / RFID / MANUAL)
CREATE TABLE IF NOT EXISTS public.security_vehicle_access_logs (
    id TEXT PRIMARY KEY DEFAULT ('vlog_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    plate TEXT NOT NULL,
    direction TEXT NOT NULL DEFAULT 'MASUK', -- 'MASUK' | 'KELUAR'
    method TEXT NOT NULL DEFAULT 'MANUAL', -- 'ANPR' | 'RFID' | 'MANUAL'
    result TEXT NOT NULL, -- 'WARGA' | 'TAMU_UNDANGAN' | 'PEKERJA' | 'WASPADA' | 'TIDAK_DIKENAL'
    "matchedLabel" TEXT,
    "gateOpened" BOOLEAN NOT NULL DEFAULT FALSE,
    confidence DOUBLE PRECISION,
    officer TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 15. KARTU PEKERJA (ART, SOPIR, TUKANG, DLL)
CREATE TABLE IF NOT EXISTS public.security_worker_passes (
    id TEXT PRIMARY KEY DEFAULT ('wp_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'LAINNYA', -- 'ART' | 'SOPIR' | 'TUKANG' | 'TUKANG_KEBUN' | 'PENGASUH' | 'LAINNYA'
    phone TEXT NOT NULL,
    nik TEXT,
    "photoUrl" TEXT,
    plate TEXT,
    "employerName" TEXT NOT NULL,
    "houseBlock" TEXT NOT NULL,
    "validFrom" DATE NOT NULL,
    "validUntil" DATE NOT NULL,
    "allowedDays" INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5,6}', -- 0=Minggu..6=Sabtu
    "allowedStart" TEXT NOT NULL DEFAULT '07:00',
    "allowedEnd" TEXT NOT NULL DEFAULT '17:00',
    "liveIn" BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'AKTIF', -- 'AKTIF' | 'DICABUT'
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_worker_pass_code UNIQUE ("communityId", code)
);

-- 16. KAMERA CCTV
CREATE TABLE IF NOT EXISTS public.security_cctv_cameras (
    id TEXT PRIMARY KEY DEFAULT ('cctv_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    "streamType" TEXT NOT NULL DEFAULT 'BELUM_DIATUR', -- 'HLS' | 'MJPEG' | 'SNAPSHOT' | 'EMBED' | 'BELUM_DIATUR'
    "streamUrl" TEXT,
    "ownerType" TEXT NOT NULL DEFAULT 'RT', -- 'RT' | 'WARGA'
    "ownerName" TEXT NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT TRUE,
    status TEXT NOT NULL DEFAULT 'ONLINE', -- 'ONLINE' | 'OFFLINE'
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 17. POSKO BENCANA & TITIK KUMPUL
CREATE TABLE IF NOT EXISTS public.security_disaster_posts (
    id TEXT PRIMARY KEY DEFAULT ('posko_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'POSKO', -- 'POSKO' | 'TITIK_KUMPUL' | 'DAPUR_UMUM' | 'POSKO_KESEHATAN'
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 0,
    occupants INTEGER NOT NULL DEFAULT 0,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    needs TEXT[] NOT NULL DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 18. CEK KESELAMATAN WARGA SAAT BENCANA
CREATE TABLE IF NOT EXISTS public.security_safety_checkins (
    id TEXT PRIMARY KEY DEFAULT ('safe_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    "houseBlock" TEXT NOT NULL,
    phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'AMAN', -- 'AMAN' | 'BUTUH_BANTUAN'
    note TEXT,
    "peopleCount" INTEGER NOT NULL DEFAULT 1,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 19. INDEXES
CREATE INDEX IF NOT EXISTS idx_sec_panic_community_status ON public.security_panic_alerts("communityId", status);
CREATE INDEX IF NOT EXISTS idx_sec_panic_created ON public.security_panic_alerts("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_sec_shifts_community_date ON public.security_ronda_shifts("communityId", date);
CREATE INDEX IF NOT EXISTS idx_sec_checkpoints_community ON public.security_patrol_checkpoints("communityId");
CREATE INDEX IF NOT EXISTS idx_sec_fines_community ON public.security_ronda_fines("communityId");
CREATE INDEX IF NOT EXISTS idx_sec_gate_community_in ON public.security_gate_logs("communityId", "inAt" DESC);
CREATE INDEX IF NOT EXISTS idx_sec_gate_destination ON public.security_gate_logs("communityId", "destinationBlock");
CREATE INDEX IF NOT EXISTS idx_sec_invites_community ON public.security_guest_invites("communityId");
CREATE INDEX IF NOT EXISTS idx_sec_incidents_community ON public.security_incident_reports("communityId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_sec_house_watches_community ON public.security_house_watches("communityId", "to");
CREATE INDEX IF NOT EXISTS idx_sec_watchlist_community ON public.security_watchlist("communityId", active);
CREATE INDEX IF NOT EXISTS idx_sec_watchlist_plate ON public.security_watchlist("communityId", plate);
CREATE INDEX IF NOT EXISTS idx_sec_lost_found_community ON public.security_lost_found("communityId", status);
CREATE INDEX IF NOT EXISTS idx_sec_handovers_community ON public.security_shift_handovers("communityId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_sec_vehicles_community ON public.security_resident_vehicles("communityId");
CREATE INDEX IF NOT EXISTS idx_sec_vehicle_logs_community ON public.security_vehicle_access_logs("communityId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_sec_workers_community ON public.security_worker_passes("communityId", status);
CREATE INDEX IF NOT EXISTS idx_sec_cctv_community ON public.security_cctv_cameras("communityId");
CREATE INDEX IF NOT EXISTS idx_sec_disaster_posts_community ON public.security_disaster_posts("communityId");
CREATE INDEX IF NOT EXISTS idx_sec_safety_checkins_community ON public.security_safety_checkins("communityId", "createdAt" DESC);

-- 20. ROW LEVEL SECURITY: read-only for clients (needed by Realtime), writes via service role only
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'security_settings', 'security_panic_alerts', 'security_ronda_shifts', 'security_patrol_checkpoints',
        'security_ronda_fines', 'security_gate_logs', 'security_guest_invites', 'security_incident_reports',
        'security_house_watches', 'security_watchlist', 'security_lost_found', 'security_shift_handovers',
        'security_resident_vehicles', 'security_vehicle_access_logs', 'security_worker_passes',
        'security_cctv_cameras', 'security_disaster_posts', 'security_safety_checkins'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow read access to %s" ON public.%I', t, t);
        EXECUTE format(
            'CREATE POLICY "Allow read access to %s" ON public.%I FOR SELECT TO authenticated, anon USING (true)',
            t, t
        );

        -- 21. REALTIME: broadcast row changes to subscribed clients
        IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
           AND NOT EXISTS (
               SELECT 1 FROM pg_publication_tables
               WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
           ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;
