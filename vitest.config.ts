import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    // dummy Supabase env: modules importing the admin client load, but unit tests never hit the network
    env: { TZ: "Asia/Jakarta", SUPABASE_URL: "http://127.0.0.1:1", SUPABASE_SECRET_KEY: "unit-test", SUPABASE_SERVICE_ROLE_KEY: "unit-test" },
  },
});
