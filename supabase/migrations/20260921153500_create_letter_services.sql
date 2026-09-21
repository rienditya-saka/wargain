-- ========================================================
-- WARGAIN SUPABASE DATABASE MIGRATION: LAYANAN SURAT RT & TEMPLATES
-- Fully Compliant with Supabase Postgres Security & RLS Best Practices
-- ========================================================

-- 1. LETTER TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.letter_templates (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'UMUM', -- 'KEPENDUDUKAN', 'HUKUM', 'USAHA', 'SOSIAL', 'UMUM'
    "requiredDocs" TEXT[] DEFAULT '{}',
    components JSONB NOT NULL DEFAULT '[]'::jsonb,
    "approvalWorkflow" JSONB NOT NULL DEFAULT '{"requireSecretary": false, "requireRT": true}'::jsonb,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. LETTER REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.letter_requests (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    "templateId" TEXT REFERENCES public.letter_templates(id) ON DELETE SET NULL,
    
    "requestNumber" TEXT NOT NULL, -- e.g. REQ-202609-001
    "issuedNumber" TEXT,           -- e.g. 470/04/09/IX/2026
    
    "applicantName" TEXT NOT NULL,
    "applicantNik" TEXT NOT NULL,
    "applicantPhone" TEXT NOT NULL,
    "applicantAddress" TEXT NOT NULL,
    purpose TEXT NOT NULL,
    
    "extraData" JSONB DEFAULT '{}'::jsonb,
    attachments TEXT[] DEFAULT '{}',
    
    status TEXT NOT NULL DEFAULT 'WAITING_SIGNATURE', -- 'PENDING_REVIEW', 'WAITING_SIGNATURE', 'APPROVED', 'REJECTED'
    
    -- PandaDoc-style Signature & Approvals
    "applicantSignature" TEXT, -- Base64 data URL
    "applicantSignedAt" TIMESTAMP WITH TIME ZONE,
    
    "secretaryReview" JSONB,   -- {"reviewerName": "...", "status": "APPROVED", "notes": "...", "reviewedAt": "..."}
    "rtSignature" TEXT,        -- Base64 data URL
    "rtSignedBy" TEXT,
    "rtSignedAt" TIMESTAMP WITH TIME ZONE,
    
    "rejectionReason" TEXT,
    "issuedAt" TIMESTAMP WITH TIME ZONE,

    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. INDEXES FOR HIGH PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_letter_templates_community ON public.letter_templates("communityId");
CREATE INDEX IF NOT EXISTS idx_letter_templates_code ON public.letter_templates(code);

CREATE INDEX IF NOT EXISTS idx_letter_requests_community ON public.letter_requests("communityId");
CREATE INDEX IF NOT EXISTS idx_letter_requests_status ON public.letter_requests(status);
CREATE INDEX IF NOT EXISTS idx_letter_requests_nik ON public.letter_requests("applicantNik");
CREATE INDEX IF NOT EXISTS idx_letter_requests_template ON public.letter_requests("templateId");

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.letter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.letter_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow access to letter_templates" ON public.letter_templates;
CREATE POLICY "Allow access to letter_templates"
    ON public.letter_templates FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow access to letter_requests" ON public.letter_requests;
CREATE POLICY "Allow access to letter_requests"
    ON public.letter_requests FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);
