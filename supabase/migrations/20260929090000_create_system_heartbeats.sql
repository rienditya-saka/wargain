-- ========================================================
-- WARGAIN: keep-alive heartbeat
-- Free Supabase projects are paused after ~7 days without activity. scripts/supabase-keepalive.mjs
-- (PM2, every 12 h) and .github/workflows/supabase-keepalive.yml ping the API and record it here.
-- ========================================================

CREATE TABLE IF NOT EXISTS public.system_heartbeats (
    id TEXT PRIMARY KEY, -- ping source, e.g. 'pm2-keepalive'
    "lastPingAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "pingCount" BIGINT NOT NULL DEFAULT 0,
    host TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- service role only (no client policies)
ALTER TABLE public.system_heartbeats ENABLE ROW LEVEL SECURITY;

-- atomic "upsert + increment" used by the keep-alive script
CREATE OR REPLACE FUNCTION public.wargain_heartbeat(p_source TEXT, p_host TEXT DEFAULT NULL)
RETURNS public.system_heartbeats
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    INSERT INTO public.system_heartbeats (id, "lastPingAt", "pingCount", host)
    VALUES (p_source, NOW(), 1, p_host)
    ON CONFLICT (id) DO UPDATE
        SET "lastPingAt" = NOW(), "pingCount" = public.system_heartbeats."pingCount" + 1, host = COALESCE(EXCLUDED.host, public.system_heartbeats.host)
    RETURNING *;
$$;

REVOKE ALL ON FUNCTION public.wargain_heartbeat(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wargain_heartbeat(TEXT, TEXT) TO service_role;
