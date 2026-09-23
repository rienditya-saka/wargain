-- wargain_set_cron_config: an empty app_url ('') now removes the stored URL, which pauses the
-- reminder jobs (wargain_call_cron skips when no URL is configured).
CREATE OR REPLACE FUNCTION public.wargain_set_cron_config(app_url TEXT, cron_secret TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
    existing UUID;
BEGIN
    IF app_url = '' THEN
        DELETE FROM vault.secrets WHERE name = 'wargain_app_url';
    ELSIF app_url IS NOT NULL THEN
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

REVOKE ALL ON FUNCTION public.wargain_set_cron_config(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wargain_set_cron_config(TEXT, TEXT) TO service_role;
