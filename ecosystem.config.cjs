// PM2: production WargaIn on port 4005.
//   npm run build && pm2 start ecosystem.config.cjs && pm2 save
// Env comes from .env.local (loaded by `next start`).
module.exports = {
  apps: [
    {
      name: "wargain",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 4005",
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "700M",
      env: { NODE_ENV: "production", PORT: "4005", TZ: "Asia/Jakarta" },
      time: true,
    },
    {
      // Supabase keep-alive: pings the API every 12 h so the free project is never paused for inactivity.
      // Runs once and exits ("stopped" between runs is normal); PM2 starts it again on the cron schedule.
      name: "wargain-keepalive",
      cwd: __dirname,
      script: "scripts/supabase-keepalive.mjs",
      interpreter: "node",
      node_args: "--env-file=.env.local",
      exec_mode: "fork",
      instances: 1,
      autorestart: false,
      cron_restart: "0 */12 * * *",
      env: { KEEPALIVE_SOURCE: "pm2-keepalive", TZ: "Asia/Jakarta" },
      time: true,
    },
  ],
};
