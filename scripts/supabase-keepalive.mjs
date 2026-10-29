// Keeps the Supabase project from being paused for inactivity (free tier: ~7 days).
// Makes real API traffic: a heartbeat write through PostgREST (RPC) plus an Auth health check.
//
//   node --env-file=.env.local scripts/supabase-keepalive.mjs          # one ping (PM2 runs this every 12 h)
//   node --env-file=.env.local scripts/supabase-keepalive.mjs --status # show recorded heartbeats
//
// Env: SUPABASE_URL + SUPABASE_SECRET_KEY (service role). Optional KEEPALIVE_SOURCE (default "pm2-keepalive").
import os from "node:os";

const URL_ = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY;
const ANON = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SOURCE = process.env.KEEPALIVE_SOURCE ?? "pm2-keepalive";
const TIMEOUT_MS = 20_000;
const ATTEMPTS = 4;

const log = (level, msg, extra = {}) => console[level === "error" ? "error" : "log"](JSON.stringify({ at: new Date().toISOString(), level, msg, ...extra }));

if (!URL_ || !KEY) {
  log("error", "SUPABASE_URL / SUPABASE_SECRET_KEY belum di-set");
  process.exit(1);
}

async function call(path, init = {}) {
  const res = await fetch(`${URL_}${path}`, {
    ...init,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} → ${res.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

async function withRetry(label, fn) {
  let last;
  for (let i = 1; i <= ATTEMPTS; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      // a paused/restoring project answers 5xx or times out: back off and retry
      log("warn", `${label} gagal (percobaan ${i}/${ATTEMPTS})`, { error: e.message });
      if (i < ATTEMPTS) await new Promise((r) => setTimeout(r, 5_000 * 2 ** (i - 1)));
    }
  }
  throw last;
}

if (process.argv.includes("--status")) {
  const rows = await call("/rest/v1/system_heartbeats?select=*&order=lastPingAt.desc");
  for (const r of rows ?? []) {
    const hours = ((Date.now() - new Date(r.lastPingAt).getTime()) / 3_600_000).toFixed(1);
    console.log(`${r.id.padEnd(22)} terakhir ${r.lastPingAt} (${hours} jam lalu) · ${r.pingCount}× · ${r.host ?? "-"}`);
  }
  if (!rows?.length) console.log("Belum ada heartbeat.");
} else {
const started = Date.now();
try {
  const res = await withRetry("heartbeat", () => call("/rest/v1/rpc/wargain_heartbeat", { method: "POST", body: JSON.stringify({ p_source: SOURCE, p_host: os.hostname() }) }));
  const row = Array.isArray(res) ? res[0] : res;
  await withRetry("auth-health", () =>
    fetch(`${URL_}/auth/v1/health`, { headers: { apikey: ANON ?? KEY }, signal: AbortSignal.timeout(TIMEOUT_MS) }).then((r) => {
      if (!r.ok) throw new Error(`auth health ${r.status}`);
    })
  );
  log("info", "Supabase aktif ✓", { source: SOURCE, pingCount: row?.pingCount, ms: Date.now() - started });
} catch (e) {
  log("error", "Keep-alive gagal", { error: e.message, ms: Date.now() - started });
  // exitCode instead of process.exit(): exiting right after fetch trips a libuv assertion on Windows
  process.exitCode = 1;
}
}
