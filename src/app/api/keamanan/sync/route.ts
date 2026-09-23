import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { COLLECTION_TABLES, isCollectionKey } from "@/lib/keamanan/tables";
import { loadCommunityContext, CommunityContext } from "@/lib/community/context";
import { runDisasterHook, runKeamananHooks } from "@/lib/keamanan/hooks";
import { CollectionKey } from "@/lib/keamanan/types";

const MAX_ROWS_PER_REQUEST = 500;
// Only these collections trigger notifications / feed posts.
const HOOKED: CollectionKey[] = ["alerts", "watchlist", "lostFound", "gateLogs", "incidents"];

interface SyncBody {
  communityId?: string;
  upserts?: Record<string, Record<string, unknown>[]>;
  deletes?: Record<string, string[]>;
  settings?: Record<string, unknown> | null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SyncBody;
    const { communityId, upserts = {}, deletes = {}, settings } = body;

    if (!communityId) {
      return NextResponse.json({ error: "communityId wajib disertakan." }, { status: 400 });
    }

    const totalRows = Object.values(upserts).reduce((n, rows) => n + (rows?.length ?? 0), 0);
    if (totalRows > MAX_ROWS_PER_REQUEST) {
      return NextResponse.json({ error: "Terlalu banyak data dalam satu permintaan." }, { status: 413 });
    }

    const now = new Date().toISOString();
    const errors: string[] = [];
    const hookJobs: { key: CollectionKey; row: Record<string, unknown>; prev?: Record<string, unknown> }[] = [];

    for (const [key, rows] of Object.entries(upserts)) {
      if (!isCollectionKey(key) || !Array.isArray(rows) || rows.length === 0) continue;
      const table = COLLECTION_TABLES[key];
      const incoming = rows.filter((r) => r && typeof r.id === "string");

      // Look up existing rows first: to refuse ids owned by another community,
      // and so hooks can tell new rows / status changes apart.
      const ids = incoming.map((r) => r.id as string);
      const { data: existing, error: readErr } = await supabaseAdmin.from(table).select("*").in("id", ids);
      if (readErr) {
        errors.push(`${key}: ${readErr.message}`);
        continue;
      }
      const prevById = new Map((existing ?? []).map((r) => [r.id as string, r]));
      const foreign = (existing ?? []).filter((r) => r.communityId !== communityId).map((r) => r.id);
      if (foreign.length) errors.push(`${key}: ${foreign.length} data milik komunitas lain ditolak`);

      const cleanRows = incoming
        .filter((r) => !foreign.includes(r.id))
        .map((r) => ({ ...r, id: r.id as string, communityId, updatedAt: now }));
      if (cleanRows.length === 0) continue;
      const { error } = await supabaseAdmin.from(table).upsert(cleanRows, { onConflict: "id" });
      if (error) {
        errors.push(`${key}: ${error.message}`);
        continue;
      }
      if (HOOKED.includes(key)) cleanRows.forEach((row) => hookJobs.push({ key, row, prev: prevById.get(row.id as string) }));
    }

    for (const [key, ids] of Object.entries(deletes)) {
      if (!isCollectionKey(key) || !Array.isArray(ids) || ids.length === 0) continue;
      const { error } = await supabaseAdmin
        .from(COLLECTION_TABLES[key])
        .delete()
        .eq("communityId", communityId)
        .in("id", ids);
      if (error) errors.push(`${key}: ${error.message}`);
    }

    let settingsChange: { next: Record<string, unknown>; prev: Record<string, unknown> | null } | null = null;
    if (settings) {
      const { data: prevSettings } = await supabaseAdmin.from("security_settings").select("*").eq("communityId", communityId).maybeSingle();
      const { id: _ignored, ...rest } = settings;
      const next = { ...rest, communityId, updatedAt: now };
      const { error } = await supabaseAdmin.from("security_settings").upsert(next, { onConflict: "communityId" });
      if (error) errors.push(`settings: ${error.message}`);
      else settingsChange = { next, prev: prevSettings ?? null };
    }

    // Notifications & feed posts. Loaded lazily: most syncs (patrol scans, attendance) have no hooks.
    const needsDisasterHook = settingsChange && !!settingsChange.next.disasterActive !== !!settingsChange.prev?.disasterActive;
    if (hookJobs.length || needsDisasterHook) {
      let ctx: CommunityContext | null = null;
      try {
        ctx = await loadCommunityContext(communityId);
      } catch (e) {
        console.error("keamanan hooks context:", e);
      }
      if (ctx) {
        for (const job of hookJobs) await runKeamananHooks(communityId, ctx, job.key, job.row, job.prev);
        if (needsDisasterHook && settingsChange) {
          const { data: posts } = await supabaseAdmin.from("security_disaster_posts").select("*").eq("communityId", communityId);
          await runDisasterHook(communityId, ctx, settingsChange.next as any, settingsChange.prev as any, (posts ?? []) as any);
        }
      }
    }

    if (errors.length > 0) {
      console.error("Keamanan sync errors:", errors);
      return NextResponse.json({ success: false, errors }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("API /api/keamanan/sync POST error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
