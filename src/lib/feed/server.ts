import { supabaseAdmin } from "@/lib/supabase-admin";
import type { ModuleKey } from "@/lib/notifications/registry";
import type { FeedPostType } from "./types";

export interface PublishInput {
  communityId: string;
  module: ModuleKey;
  type: FeedPostType;
  title?: string | null;
  content?: string;
  images?: string[];
  payload?: Record<string, unknown>;
  // With an entity the post is upserted: one post per (module, entityType, entityId).
  entity?: { type: string; id: string };
  author?: { id?: string | null; name: string; role?: string | null; block?: string | null };
  visibility?: "PUBLIC" | "PENGURUS";
  pinnedUntil?: string | null;
  status?: "PUBLISHED" | "HIDDEN";
  // Re-publishing an entity keeps its original timeline position unless bump is set.
  bump?: boolean;
}

function postId() {
  return `post_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

const SYSTEM_AUTHOR = { name: "WargaIn", role: "SISTEM" };

// Modules call this to put (or refresh) their item on the community feed. Never throws.
export async function publishFeedPost(input: PublishInput): Promise<string | null> {
  try {
    const now = new Date().toISOString();
    const author = input.author ?? SYSTEM_AUTHOR;
    const row: Record<string, unknown> = {
      communityId: input.communityId,
      module: input.module,
      type: input.type,
      authorId: (author as { id?: string | null }).id ?? null,
      authorName: author.name,
      authorRole: author.role ?? null,
      authorBlock: (author as { block?: string | null }).block ?? null,
      title: input.title ?? null,
      content: input.content ?? "",
      images: input.images ?? [],
      payload: input.payload ?? {},
      entityType: input.entity?.type ?? null,
      entityId: input.entity?.id ?? null,
      visibility: input.visibility ?? "PUBLIC",
      status: input.status ?? "PUBLISHED",
      isPinned: !!input.pinnedUntil,
      pinnedUntil: input.pinnedUntil ?? null,
      updatedAt: now,
    };

    if (input.entity) {
      const { data: existing } = await supabaseAdmin
        .from("feed_posts")
        .select("id")
        .eq("communityId", input.communityId)
        .eq("module", input.module)
        .eq("entityType", input.entity.type)
        .eq("entityId", input.entity.id)
        .maybeSingle();
      if (existing) {
        if (input.bump) row.createdAt = now;
        const { error } = await supabaseAdmin.from("feed_posts").update(row).eq("id", existing.id);
        if (error) throw error;
        return existing.id;
      }
    }

    const id = postId();
    const { error } = await supabaseAdmin.from("feed_posts").insert({ ...row, id, createdAt: now });
    if (error) throw error;
    return id;
  } catch (err: any) {
    console.error("publishFeedPost failed:", err?.message ?? err);
    return null;
  }
}

// Partial update of an entity's post (e.g. mark an event cancelled, hide a resolved alert).
export async function updateFeedPostByEntity(
  communityId: string,
  module: ModuleKey,
  entity: { type: string; id: string },
  patch: { payload?: Record<string, unknown>; status?: "PUBLISHED" | "HIDDEN"; title?: string; content?: string; pinnedUntil?: string | null }
) {
  try {
    const { data: existing } = await supabaseAdmin
      .from("feed_posts")
      .select("id, payload")
      .eq("communityId", communityId)
      .eq("module", module)
      .eq("entityType", entity.type)
      .eq("entityId", entity.id)
      .maybeSingle();
    if (!existing) return;
    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (patch.payload) update.payload = { ...(existing.payload ?? {}), ...patch.payload };
    if (patch.status) update.status = patch.status;
    if (patch.title !== undefined) update.title = patch.title;
    if (patch.content !== undefined) update.content = patch.content;
    if (patch.pinnedUntil !== undefined) {
      update.pinnedUntil = patch.pinnedUntil;
      update.isPinned = !!patch.pinnedUntil;
    }
    await supabaseAdmin.from("feed_posts").update(update).eq("id", existing.id);
  } catch (err: any) {
    console.error("updateFeedPostByEntity failed:", err?.message ?? err);
  }
}
