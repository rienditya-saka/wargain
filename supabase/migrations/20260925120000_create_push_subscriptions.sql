-- ========================================================
-- WARGAIN SUPABASE DATABASE MIGRATION: WEB PUSH SUBSCRIPTIONS
-- One row per browser/device that allowed notifications. Server-only (service role);
-- no client policies because endpoints + keys must not be readable by other users.
-- ========================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id TEXT PRIMARY KEY DEFAULT ('push_' || gen_random_uuid()::text),
    "userId" TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    "userAgent" TEXT,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "lastSuccessAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions("userId");

-- RLS on with no policies: only the service role can read/write.
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
