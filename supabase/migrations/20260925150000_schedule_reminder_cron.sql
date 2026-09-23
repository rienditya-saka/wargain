-- ========================================================
-- WARGAIN SUPABASE DATABASE MIGRATION: JADWAL PENGINGAT (pg_cron + pg_net)
-- pg_cron calls the app's /api/cron/reminders over HTTP (pg_net), so reminders keep going
-- through the notification platform (in-app bell + Web Push).
--
-- The app URL and the shared secret live in Supabase Vault, never in this file.
-- Set them with:  select public.wargain_set_cron_config('https://your-app.example', '<CRON_SECRET>');
-- (scratch/set-cron-config.mjs does this from .env.local)
-- ========================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 1. Store / update the app URL + secret in Vault (service_role only).
CREATE OR REPLACE FUNCTION public.wargain_set_cron_config(app_url TEXT, cron_secret TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
    existing UUID;
BEGIN
    IF app_url IS NOT NULL THEN
        IF app_url !~ '^https?://' THEN
            RAISE EXCEPTION 'app_url harus diawali http:// atau https://';
        END IF;
        SELECT id INTO existing FROM vault.secrets WHERE name = 'wargain_app_url';
        IF existing IS NULL THEN
            PERFORM vault.create_secret(rtrim(app_url, '/'), 'wargain_app_url', 'Base URL aplikasi WargaIn untuk pg_cron');
        ELSE
            PERFORM vault.update_secret(existing, rtrim(app_url, '/'), 'wargain_app_url');
        END IF;
    END IF;
    IF cron_secret IS NOT NULL THEN
        SELECT id INTO existing FROM vault.secrets WHERE name = 'wargain_cron_secret';
        IF existing IS NULL THEN
            PERFORM vault.create_secret(cron_secret, 'wargain_cron_secret', 'Bearer secret untuk /api/cron/reminders');
        ELSE
            PERFORM vault.update_secret(existing, cron_secret, 'wargain_cron_secret');
        END IF;
    END IF;
END $$;

-- 2. The job body: POST to the app with the secret. Returns the pg_net request id.
CREATE OR REPLACE FUNCTION public.wargain_call_cron(job TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
    base_url TEXT;
    secret TEXT;
    request_id BIGINT;
BEGIN
    SELECT decrypted_secret INTO base_url FROM vault.decrypted_secrets WHERE name = 'wargain_app_url';
    SELECT decrypted_secret INTO secret FROM vault.decrypted_secrets WHERE name = 'wargain_cron_secret';
    IF base_url IS NULL OR secret IS NULL THEN
        RAISE NOTICE 'wargain cron %: app url / secret belum diset di Vault, dilewati', job;
        RETURN NULL;
    END IF;
    SELECT net.http_post(
        url := base_url || '/api/cron/reminders?job=' || job,
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secret),
        body := jsonb_build_object('job', job, 'triggeredAt', NOW()),
        timeout_milliseconds := 55000
    ) INTO request_id;
    RETURN request_id;
END $$;

-- 3. Status for admins / debugging: jobs, last runs and last HTTP responses.
CREATE OR REPLACE FUNCTION public.wargain_cron_status()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, cron, net, vault
AS $$
    SELECT jsonb_build_object(
        'configured', jsonb_build_object(
            'appUrl', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'wargain_app_url'),
            'secret', EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'wargain_cron_secret')
        ),
        'jobs', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', jobname, 'schedule', schedule, 'active', active) ORDER BY jobname)
                          FROM cron.job WHERE jobname LIKE 'wargain-%'), '[]'::jsonb),
        'lastRuns', COALESCE((SELECT jsonb_agg(r ORDER BY (r->>'start') DESC) FROM (
                          SELECT jsonb_build_object('job', j.jobname, 'status', d.status, 'message', left(d.return_message, 200), 'start', d.start_time) AS r
                          FROM cron.job_run_details d JOIN cron.job j ON j.jobid = d.jobid
                          WHERE j.jobname LIKE 'wargain-%' ORDER BY d.start_time DESC LIMIT 10) x), '[]'::jsonb),
        'lastResponses', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'status', status_code, 'body', left(content::text, 300), 'error', error_msg, 'at', created) ORDER BY created DESC)
                          FROM (SELECT * FROM net._http_response ORDER BY created DESC LIMIT 5) h), '[]'::jsonb)
    );
$$;

REVOKE ALL ON FUNCTION public.wargain_set_cron_config(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wargain_call_cron(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wargain_cron_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wargain_set_cron_config(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.wargain_call_cron(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.wargain_cron_status() TO service_role;

-- 4. Schedules (pg_cron runs in UTC; WIB = UTC+7).
DO $$
BEGIN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('wargain-event-reminders', 'wargain-immunization-reminders');
END $$;

-- Every hour at :05. The app skips 21:00–06:00 WIB, so night-time reminders go out at 06:05.
SELECT cron.schedule('wargain-event-reminders', '5 * * * *', $$SELECT public.wargain_call_cron('events')$$);
-- Daily 07:00 WIB (00:00 UTC).
SELECT cron.schedule('wargain-immunization-reminders', '0 0 * * *', $$SELECT public.wargain_call_cron('immunization')$$);
