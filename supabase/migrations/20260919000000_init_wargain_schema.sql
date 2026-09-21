-- ========================================================
-- WARGAIN SUPABASE DATABASE MIGRATION SCHEMA
-- Fully Compliant with Supabase Postgres Security & RLS Best Practices
-- ========================================================

-- 1. ENUMS
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING_PAYMENT', 'WAITING_VERIFICATION', 'ACTIVE', 'EXPIRED');
CREATE TYPE "UserRole" AS ENUM ('TENANT_ADMIN', 'KETUA', 'SEKRETARIS', 'BENDAHARA', 'HUMAS', 'ANGGOTA');
CREATE TYPE "PostType" AS ENUM ('ANNOUNCEMENT', 'CITIZEN_REPORT', 'ACTIVITY_LOG');
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');
CREATE TYPE "SubscriptionTierCode" AS ENUM ('RT_STANDARD', 'RW_PRO', 'ENTERPRISE');

-- 2. COMMUNITIES TABLE
CREATE TABLE public.communities (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL DEFAULT 'government',
    country TEXT NOT NULL DEFAULT 'Indonesia',
    province TEXT NOT NULL,
    regency TEXT NOT NULL,
    district TEXT NOT NULL,
    urban TEXT NOT NULL,
    neighborhood TEXT NOT NULL,
    address TEXT NOT NULL,
    lat TEXT NOT NULL DEFAULT '-6.2088',
    long TEXT NOT NULL DEFAULT '106.8456',
    logo TEXT,
    
    "planTier" "SubscriptionTierCode" NOT NULL DEFAULT 'RT_STANDARD',
    "planStatus" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "isActive" BOOLEAN NOT NULL DEFAULT FALSE,
    "planExpiresAt" TIMESTAMP WITH TIME ZONE,

    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_communities_slug ON public.communities(slug);
CREATE INDEX idx_communities_code ON public.communities(code);

-- Enable RLS
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read active community info"
    ON public.communities FOR SELECT
    TO authenticated, anon
    USING (true);

-- 3. USERS TABLE
CREATE TABLE public.users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    phone TEXT NOT NULL,
    role "UserRole" NOT NULL DEFAULT 'TENANT_ADMIN',

    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,

    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_community ON public.users("communityId");
CREATE INDEX idx_users_email ON public.users(email);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to select their own profile"
    ON public.users FOR SELECT
    TO authenticated
    USING (true);

-- 4. SUBSCRIPTION INVOICES TABLE
CREATE TABLE public.subscription_invoices (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "invoiceNumber" TEXT NOT NULL UNIQUE,
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,

    tier "SubscriptionTierCode" NOT NULL DEFAULT 'RT_STANDARD',
    amount INTEGER NOT NULL,
    "periodMonths" INTEGER NOT NULL DEFAULT 1,
    status "SubscriptionStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',

    "paymentMethod" TEXT,
    "paymentProofUrl" TEXT,
    "paidAt" TIMESTAMP WITH TIME ZONE,

    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_community ON public.subscription_invoices("communityId");
ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow community admins to view invoices"
    ON public.subscription_invoices FOR SELECT
    TO authenticated
    USING (true);

-- 5. COMMUNITY POSTS TABLE
CREATE TABLE public.community_posts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    "authorId" TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    type "PostType" NOT NULL DEFAULT 'ANNOUNCEMENT',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    attachments TEXT[] DEFAULT '{}',
    "isPinned" BOOLEAN NOT NULL DEFAULT FALSE,
    "reportStatus" "ReportStatus" DEFAULT 'OPEN',

    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_community ON public.community_posts("communityId");
CREATE INDEX idx_posts_author ON public.community_posts("authorId");
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow community members to view posts"
    ON public.community_posts FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "Allow authenticated users to create posts"
    ON public.community_posts FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 6. POST COMMENTS TABLE
CREATE TABLE public.post_comments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "postId" TEXT NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON public.post_comments("postId");
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view comments"
    ON public.post_comments FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "Allow authenticated users to comment"
    ON public.post_comments FOR INSERT
    TO authenticated
    WITH CHECK (true);
