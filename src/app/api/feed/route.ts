import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notify } from "@/lib/notifications/server";
import { PENGURUS_ROLES } from "@/lib/notifications/registry";
import { FEED_FILTERS, FeedFilterKey, USER_POST_TYPES } from "@/lib/feed/types";

const PAGE_SIZE = 15;
const MAX_IMAGES = 4;

async function loadActor(userId?: string | null) {
  if (!userId) return null;
  const { data } = await supabaseAdmin.from("users").select("id, fullName, role, communityId, houseBlock").eq("id", userId).maybeSingle();
  return data;
}

// GET ?communityId&userId&filter&before -> { pinned, posts, nextCursor }
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const communityId = searchParams.get("communityId");
    const userId = searchParams.get("userId");
    const filter = (searchParams.get("filter") ?? "ALL") as FeedFilterKey;
    const before = searchParams.get("before");
    if (!communityId) return NextResponse.json({ error: "communityId wajib disertakan." }, { status: 400 });

    const actor = await loadActor(userId);
    const isPengurus = !!actor && PENGURUS_ROLES.includes(actor.role);
    const types = FEED_FILTERS[filter]?.types ?? null;
    const now = new Date().toISOString();

    // Deep link (/feed?post=ID): return just that post.
    const single = searchParams.get("postId");
    if (single) {
      const { data: p } = await supabaseAdmin.from("feed_posts").select("*").eq("id", single).eq("communityId", communityId).maybeSingle();
      const visible = p && p.status === "PUBLISHED" && (isPengurus || p.visibility === "PUBLIC");
      let likedByMe = false;
      if (visible && userId) {
        const { data: r } = await supabaseAdmin.from("feed_reactions").select("postId").eq("postId", single).eq("userId", userId).maybeSingle();
        likedByMe = !!r;
      }
      return NextResponse.json({ ready: true, pinned: [], posts: visible ? [{ ...p, likedByMe }] : [], nextCursor: null });
    }

    const base = () => {
      let q = supabaseAdmin.from("feed_posts").select("*").eq("communityId", communityId).eq("status", "PUBLISHED");
      if (!isPengurus) q = q.eq("visibility", "PUBLIC");
      if (types) q = q.in("type", types as string[]);
      return q;
    };

    const [pinnedRes, postsRes] = await Promise.all([
      before ? Promise.resolve({ data: [] as any[] }) : base().gt("pinnedUntil", now).order("pinnedUntil", { ascending: false }).limit(5),
      (before ? base().lt("createdAt", before) : base()).order("createdAt", { ascending: false }).limit(PAGE_SIZE + 1),
    ]);
    if ((postsRes as any).error) return NextResponse.json({ error: (postsRes as any).error.message }, { status: 500 });

    const pinned = pinnedRes.data ?? [];
    const pinnedIds = new Set(pinned.map((p: any) => p.id));
    const page = (postsRes.data ?? []).filter((p: any) => !pinnedIds.has(p.id));
    const hasMore = page.length > PAGE_SIZE;
    const posts = page.slice(0, PAGE_SIZE);

    const all = [...pinned, ...posts];
    let liked = new Set<string>();
    if (userId && all.length) {
      const { data: reactions } = await supabaseAdmin.from("feed_reactions").select("postId").eq("userId", userId).in("postId", all.map((p: any) => p.id));
      liked = new Set((reactions ?? []).map((r) => r.postId));
    }
    const withMe = (p: any) => ({ ...p, likedByMe: liked.has(p.id) });

    return NextResponse.json({
      ready: true,
      pinned: pinned.map(withMe),
      posts: posts.map(withMe),
      nextCursor: hasMore ? posts[posts.length - 1]?.createdAt : null,
    });
  } catch (err: any) {
    console.error("API /api/feed GET error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// POST { userId, type, title?, content, images?, payload?, pinDays? } -> create a warga/pengurus post
export async function POST(req: Request) {
  try {
    const { userId, type = "GENERAL", title, content, images = [], payload = {}, pinDays } = await req.json();
    const actor = await loadActor(userId);
    if (!actor) return NextResponse.json({ error: "Silakan login untuk membuat post." }, { status: 401 });
    if (!USER_POST_TYPES.includes(type)) return NextResponse.json({ error: "Jenis post tidak dikenal." }, { status: 400 });
    const isPengurus = PENGURUS_ROLES.includes(actor.role);
    if (type === "ANNOUNCEMENT" && !isPengurus) {
      return NextResponse.json({ error: "Hanya pengurus RT yang bisa membuat pengumuman." }, { status: 403 });
    }
    if (!String(content ?? "").trim() && !(images?.length)) {
      return NextResponse.json({ error: "Isi post tidak boleh kosong." }, { status: 400 });
    }

    const now = new Date();
    const pinnedUntil = type === "ANNOUNCEMENT" && isPengurus && Number(pinDays) > 0 ? new Date(now.getTime() + Number(pinDays) * 86_400_000).toISOString() : null;
    const cleanPayload: Record<string, unknown> = {};
    if (type === "COMMERCE") {
      if (payload.price != null) cleanPayload.price = Number(payload.price) || 0;
      if (payload.contactPhone) cleanPayload.contactPhone = String(payload.contactPhone).slice(0, 20);
      if (payload.itemCategory) cleanPayload.itemCategory = String(payload.itemCategory).slice(0, 40);
    }
    if (type === "REPORT") cleanPayload.reportStatus = "OPEN";

    const row = {
      id: `post_${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      communityId: actor.communityId,
      module: "FEED",
      type,
      authorId: actor.id,
      authorName: actor.fullName,
      authorRole: actor.role,
      authorBlock: actor.houseBlock,
      title: title?.trim() || null,
      content: String(content ?? "").trim(),
      images: (images as string[]).slice(0, MAX_IMAGES),
      payload: cleanPayload,
      visibility: "PUBLIC",
      status: "PUBLISHED",
      isPinned: !!pinnedUntil,
      pinnedUntil,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    const { data, error } = await supabaseAdmin.from("feed_posts").insert(row).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (type === "ANNOUNCEMENT") {
      await notify({
        communityId: actor.communityId, type: "FEED_ANNOUNCEMENT", entity: { type: "FEED_POST", id: data.id },
        title: `📢 ${row.title ?? "Pengumuman RT"}`,
        body: row.content.slice(0, 160),
        link: `/feed?post=${data.id}`,
        target: { all: true },
        excludeUserIds: [actor.id],
        actorName: actor.fullName,
      });
    } else if (type === "REPORT") {
      await notify({
        communityId: actor.communityId, type: "FEED_REPORT", entity: { type: "FEED_POST", id: data.id },
        title: `📣 Aduan warga: ${row.title ?? row.content.slice(0, 50)}`,
        body: `${actor.fullName}${actor.houseBlock ? ` (${actor.houseBlock})` : ""}: ${row.content.slice(0, 140)}`,
        link: `/feed?post=${data.id}`,
        target: { roles: PENGURUS_ROLES },
        excludeUserIds: [actor.id],
        actorName: actor.fullName,
      });
    }

    return NextResponse.json({ success: true, post: { ...data, likedByMe: false } });
  } catch (err: any) {
    console.error("API /api/feed POST error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// PATCH { postId, userId, action: LIKE | UNLIKE | PIN | UNPIN | HIDE | RESOLVE }
export async function PATCH(req: Request) {
  try {
    const { postId, userId, action, pinDays = 3 } = await req.json();
    const [actor, { data: post }] = await Promise.all([
      loadActor(userId),
      supabaseAdmin.from("feed_posts").select("*").eq("id", postId).maybeSingle(),
    ]);
    if (!actor) return NextResponse.json({ error: "Silakan login." }, { status: 401 });
    if (!post || post.communityId !== actor.communityId) return NextResponse.json({ error: "Post tidak ditemukan." }, { status: 404 });
    const isPengurus = PENGURUS_ROLES.includes(actor.role);
    const isAuthor = post.authorId === actor.id;

    if (action === "LIKE") {
      const { error } = await supabaseAdmin
        .from("feed_reactions")
        .upsert({ postId, userId: actor.id, communityId: post.communityId, type: "LIKE" }, { onConflict: "postId,userId", ignoreDuplicates: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (post.authorId && !isAuthor) {
        await notify({
          communityId: post.communityId, type: "FEED_LIKE", entity: { type: "FEED_POST", id: postId },
          title: `❤️ ${actor.fullName} menyukai post Anda`,
          body: (post.title ?? post.content ?? "").slice(0, 100),
          link: `/feed?post=${postId}`,
          target: { userIds: [post.authorId] },
          actorName: actor.fullName,
          dedupeKey: `like:${postId}:${actor.id}`,
        });
      }
    } else if (action === "UNLIKE") {
      await supabaseAdmin.from("feed_reactions").delete().eq("postId", postId).eq("userId", actor.id);
    } else if (action === "PIN" || action === "UNPIN") {
      if (!isPengurus) return NextResponse.json({ error: "Hanya pengurus yang bisa menyematkan post." }, { status: 403 });
      const pinnedUntil = action === "PIN" ? new Date(Date.now() + Number(pinDays) * 86_400_000).toISOString() : null;
      await supabaseAdmin.from("feed_posts").update({ pinnedUntil, isPinned: !!pinnedUntil, updatedAt: new Date().toISOString() }).eq("id", postId);
    } else if (action === "HIDE") {
      if (!isAuthor && !isPengurus) return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
      await supabaseAdmin.from("feed_posts").update({ status: "HIDDEN", updatedAt: new Date().toISOString() }).eq("id", postId);
    } else if (action === "RESOLVE") {
      if (!isPengurus || post.type !== "REPORT") return NextResponse.json({ error: "Tidak diizinkan." }, { status: 403 });
      await supabaseAdmin
        .from("feed_posts")
        .update({ payload: { ...(post.payload ?? {}), reportStatus: "RESOLVED" }, updatedAt: new Date().toISOString() })
        .eq("id", postId);
    } else {
      return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
    }

    const { data: fresh } = await supabaseAdmin.from("feed_posts").select("*").eq("id", postId).single();
    const { data: mine } = await supabaseAdmin.from("feed_reactions").select("postId").eq("postId", postId).eq("userId", actor.id).maybeSingle();
    return NextResponse.json({ success: true, post: { ...fresh, likedByMe: !!mine } });
  } catch (err: any) {
    console.error("API /api/feed PATCH error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
