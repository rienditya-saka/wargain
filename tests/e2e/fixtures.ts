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

// Active poll straight in the database (no notifications), so poll tests don't depend on the age of the demo data.
// Returns a cleanup function. Also publishes the matching Feed card.
export async function seedActivePoll(opts: { tag: string; title: string; options: string[]; voteScope?: "USER" | "HOUSE"; maxChoices?: number; communityId?: string }) {
  const { url, key } = serviceEnv();
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY dibutuhkan untuk seed polling");
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" };
  const communityId = opts.communityId ?? "comm_1789889738300";
  const id = `poll_e2e_${opts.tag.replace(/\W/g, "")}_${Date.now().toString(36)}`;
  const now = new Date().toISOString();
  const options = opts.options.map((label, i) => ({ id: `o${i + 1}`, label }));
  const poll = {
    id, communityId, title: `[E2E-${opts.tag}] ${opts.title}`, description: "Data uji otomatis.", options,
    maxChoices: opts.maxChoices ?? 1, anonymous: false, voteScope: opts.voteScope ?? "USER", audience: "SEMUA",
    closesAt: new Date(Date.now() + 86_400_000).toISOString(), status: "AKTIF",
  };
  const post = {
    id: `post_${id}`, communityId, module: "BALAI", type: "POLL", authorName: "E2E", title: poll.title, content: poll.description, images: [],
    payload: { pollId: id, closesAt: poll.closesAt, voteScope: poll.voteScope, anonymous: false, options, maxChoices: poll.maxChoices },
    entityType: "POLL", entityId: id, visibility: "PUBLIC", status: "PUBLISHED", isPinned: false, createdAt: now, updatedAt: now,
  };
  for (const [table, row] of [["polls", poll], ["feed_posts", post]] as const) {
    const res = await fetch(`${url}/rest/v1/${table}`, { method: "POST", headers, body: JSON.stringify(row) });
    if (!res.ok) throw new Error(`seed ${table}: ${res.status} ${await res.text()}`);
  }
  return {
    id,
    title: poll.title,
    cleanup: async () => {
      await fetch(`${url}/rest/v1/feed_posts?id=eq.${post.id}`, { method: "DELETE", headers });
      await fetch(`${url}/rest/v1/polls?id=eq.${id}`, { method: "DELETE", headers }); // votes cascade
      await fetch(`${url}/rest/v1/notifications?entityId=eq.${id}`, { method: "DELETE", headers });
    },
  };
}
