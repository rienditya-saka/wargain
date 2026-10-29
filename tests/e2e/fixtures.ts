import { test as base, expect, type APIRequestContext, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// Demo accounts of RT 02/03 Cluster Madrid (override with env for another tenant).
export const ACCOUNTS = {
  warga: { email: process.env.E2E_WARGA_EMAIL ?? "warga@demo.wargain.id", password: process.env.E2E_WARGA_PASSWORD ?? "MadridMGC2026!" },
  ketua: { email: process.env.E2E_PENGURUS_EMAIL ?? "ketua.rt@demo.wargain.id", password: process.env.E2E_PENGURUS_PASSWORD ?? "MadridMGC2026!" },
};
export type Role = keyof typeof ACCOUNTS;

export interface Session {
  userId: string;
  fullName: string;
  communityId: string;
  role: string;
  [k: string]: unknown;
}

const SESSION_KEY = "wargain_tenant_session";
const cache = new Map<Role, Session>();

export async function apiLogin(request: APIRequestContext, role: Role): Promise<Session> {
  if (cache.has(role)) return cache.get(role)!;
  const res = await request.post("/api/auth/login", { data: ACCOUNTS[role] });
  expect(res.status(), `login ${role}`).toBe(200);
  const { session } = await res.json();
  cache.set(role, session);
  return session;
}

// Put the session in localStorage before any page script runs (same as a real login).
export async function loginAs(page: Page, role: Role) {
  const session = await apiLogin(page.request, role);
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [SESSION_KEY, JSON.stringify(session)] as const);
  return session;
}

// Service-role access for test setup/cleanup only (reads .env.local, never printed).
export function serviceEnv() {
  const file = path.resolve(__dirname, "../../.env.local");
  const env: Record<string, string> = {};
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return { url: process.env.SUPABASE_URL ?? env.SUPABASE_URL, key: process.env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SECRET_KEY, cronSecret: process.env.CRON_SECRET ?? env.CRON_SECRET };
}

// Every test fails on uncaught page errors (runtime crashes in the browser).
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await use(errors);
      expect(errors, "uncaught browser errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1000) < 768;
