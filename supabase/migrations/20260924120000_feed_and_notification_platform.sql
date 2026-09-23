-- ========================================================
-- WARGAIN SUPABASE DATABASE MIGRATION: PLATFORM FEED & NOTIFIKASI
-- Shared by every module: modules publish feed posts and send notifications through
-- src/lib/feed/server.ts and src/lib/notifications/server.ts (service role).
-- Clients get SELECT only (Realtime); writes go through the API.
-- ========================================================

-- 1. NOTIFICATIONS: generic module/entity/priority (eventId kept for existing rows)
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS module TEXT NOT NULL DEFAULT 'SISTEM';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS "entityType" TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS "entityId" TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'NORMAL'; -- 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS "actorName" TEXT;
UPDATE public.notifications SET module = 'SOSIAL', "entityType" = 'SOCIAL_EVENT', "entityId" = "eventId"
    WHERE module = 'SISTEM' AND type LIKE 'SOCIAL_%';
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON public.notifications("entityType", "entityId");

-- 2. NOTIFICATION PREFERENCES (URGENT notifications ignore mutes)
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    "userId" TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    "mutedModules" TEXT[] NOT NULL DEFAULT '{}',
    "mutedTypes" TEXT[] NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. FEED POSTS (user posts + posts published by modules)
CREATE TABLE IF NOT EXISTS public.feed_posts (
    id TEXT PRIMARY KEY DEFAULT ('post_' || gen_random_uuid()::text),
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    module TEXT NOT NULL DEFAULT 'FEED', -- 'FEED' | 'SOSIAL' | 'KEAMANAN' | 'KAS' | 'SURAT' | ...
    type TEXT NOT NULL DEFAULT 'GENERAL', -- renderer key, e.g. GENERAL | ANNOUNCEMENT | COMMERCE | REPORT | SOCIAL_EVENT | SECURITY_ALERT | LOST_FOUND | KAS_INFO
    "authorId" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    "authorName" TEXT NOT NULL,
    "authorRole" TEXT,
    "authorBlock" TEXT,
    title TEXT,
    content TEXT NOT NULL DEFAULT '',
    images TEXT[] NOT NULL DEFAULT '{}',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb, -- module-specific data for the renderer
    "entityType" TEXT,
    "entityId" TEXT,
    visibility TEXT NOT NULL DEFAULT 'PUBLIC', -- 'PUBLIC' | 'PENGURUS'
    status TEXT NOT NULL DEFAULT 'PUBLISHED', -- 'PUBLISHED' | 'HIDDEN'
    "isPinned" BOOLEAN NOT NULL DEFAULT FALSE,
    "pinnedUntil" TIMESTAMP WITH TIME ZONE,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
-- One post per module entity, so modules can upsert (e.g. update a cancelled event's post).
CREATE UNIQUE INDEX IF NOT EXISTS uq_feed_posts_entity
    ON public.feed_posts("communityId", module, "entityType", "entityId") WHERE "entityId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feed_posts_timeline ON public.feed_posts("communityId", status, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_type ON public.feed_posts("communityId", type);

-- 4. REACTIONS & COMMENTS
CREATE TABLE IF NOT EXISTS public.feed_reactions (
    "postId" TEXT NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
    "userId" TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'LIKE',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("postId", "userId")
);

CREATE TABLE IF NOT EXISTS public.feed_comments (
    id TEXT PRIMARY KEY DEFAULT ('cmt_' || gen_random_uuid()::text),
    "postId" TEXT NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
    "communityId" TEXT NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    "userId" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    "authorName" TEXT NOT NULL,
    "authorBlock" TEXT,
    content TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_feed_comments_post ON public.feed_comments("postId", "createdAt");

-- 5. Keep likeCount / commentCount in sync
CREATE OR REPLACE FUNCTION public.feed_sync_counts() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    pid TEXT := COALESCE(NEW."postId", OLD."postId");
BEGIN
    IF TG_TABLE_NAME = 'feed_reactions' THEN
        UPDATE public.feed_posts SET "likeCount" = (SELECT COUNT(*) FROM public.feed_reactions WHERE "postId" = pid) WHERE id = pid;
    ELSE
        UPDATE public.feed_posts SET "commentCount" = (SELECT COUNT(*) FROM public.feed_comments WHERE "postId" = pid) WHERE id = pid;
    END IF;
    RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_feed_reactions_count ON public.feed_reactions;
CREATE TRIGGER trg_feed_reactions_count AFTER INSERT OR DELETE ON public.feed_reactions
    FOR EACH ROW EXECUTE FUNCTION public.feed_sync_counts();
DROP TRIGGER IF EXISTS trg_feed_comments_count ON public.feed_comments;
CREATE TRIGGER trg_feed_comments_count AFTER INSERT OR DELETE ON public.feed_comments
    FOR EACH ROW EXECUTE FUNCTION public.feed_sync_counts();

-- 6. RLS (read-only for clients) + REALTIME
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY['feed_posts', 'feed_reactions', 'feed_comments', 'notification_preferences'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow read access to %s" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Allow read access to %s" ON public.%I FOR SELECT TO authenticated, anon USING (true)', t, t);
    END LOOP;
    FOREACH t IN ARRAY ARRAY['feed_posts', 'feed_comments'] LOOP
        IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
           AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;
