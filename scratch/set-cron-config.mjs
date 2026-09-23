// Stores the app URL + CRON_SECRET (from .env.local) in Supabase Vault for pg_cron, then prints the cron status.
// Usage: node --env-file=.env.local scratch/set-cron-config.mjs [https://your-app.example | --clear-url] [--status] [--run events|immunization]
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const appUrl = args.includes("--clear-url") ? "" : args.find((a) => /^https?:\/\//.test(a)) ?? null;
const runJob = args.includes("--run") ? args[args.indexOf("--run") + 1] : null;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

if (!args.includes("--status") || appUrl !== null) {
  if (!process.env.CRON_SECRET) throw new Error("CRON_SECRET belum ada di .env.local");
  const { error } = await supabase.rpc("wargain_set_cron_config", { app_url: appUrl, cron_secret: process.env.CRON_SECRET });
  if (error) throw error;
  console.log(`✓ Vault diperbarui${appUrl === "" ? " · app url dihapus (cron dijeda)" : appUrl ? ` · app url = ${appUrl}` : " · secret saja (app url belum diset)"}`);
}

if (runJob) {
  // Fire the job once right now through pg_net (same path as the schedule).
  const { data, error } = await supabase.rpc("wargain_call_cron", { job: runJob });
  if (error) throw error;
  console.log(`✓ ${runJob} dipicu via pg_net, request id ${data}. Tunggu beberapa detik lalu jalankan --status.`);
}

const { data: status, error } = await supabase.rpc("wargain_cron_status");
if (error) throw error;
console.log(JSON.stringify(status, null, 2));
