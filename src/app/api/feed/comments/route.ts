import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notify } from "@/lib/notifications/server";

const MAX_LENGTH = 1000;

// GET ?postId -> comments (oldest first)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const postId = searchParams.get("postId");
  if (!postId) return NextResponse.json({ error: "postId wajib disertakan." }, { status: 400 });
  const { data, error } = await supabaseAdmin.from("feed_comments").select("*").eq("postId", postId).order("createdAt", { ascending: true }).limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comments: data ?? [] });
}

// POST { postId, userId, content }
export async function POST(req: Request) {
  try {
    const { postId, userId, content } = await req.json();
    const text = String(content ?? "").trim().slice(0, MAX_LENGTH);
    if (!text) return NextResponse.json({ error: "Komentar tidak boleh kosong." }, { status: 400 });

    const [{ data: actor }, { data: post }] = await Promise.all([
      supabaseAdmin.from("users").select("id, fullName, communityId, houseBlock").eq("id", userId).maybeSingle(),
      supabaseAdmin.from("feed_posts").select("id, communityId, authorId, title, content").eq("id", postId).maybeSingle(),
    ]);
    if (!actor) return NextResponse.json({ error: "Silakan login untuk berkomentar." }, { status: 401 });
    if (!post || post.communityId !== actor.communityId) return NextResponse.json({ error: "Post tidak ditemukan." }, { status: 404 });

    const row = {
      id: `cmt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      postId,
      communityId: post.communityId,
      userId: actor.id,
      authorName: actor.fullName,
      authorBlock: actor.houseBlock,
      content: text,
      createdAt: new Date().toISOString(),
    };
    const { data, error } = await supabaseAdmin.from("feed_comments").insert(row).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Post author + earlier commenters (a lightweight "thread" notification).
    const { data: others } = await supabaseAdmin.from("feed_comments").select("userId").eq("postId", postId).neq("userId", actor.id).limit(50);
    const recipients = Array.from(new Set([post.authorId, ...(others ?? []).map((o) => o.userId)].filter(Boolean))) as string[];
    if (recipients.length) {
      await notify({
        communityId: post.communityId, type: "FEED_COMMENT", entity: { type: "FEED_POST", id: postId },
        title: `💬 ${actor.fullName} berkomentar${post.title ? ` di "${post.title.slice(0, 40)}"` : ""}`,
        body: text.slice(0, 140),
        link: `/feed?post=${postId}`,
        target: { userIds: recipients },
        excludeUserIds: [actor.id],
        actorName: actor.fullName,
      });
    }

    return NextResponse.json({ success: true, comment: data });
  } catch (err: any) {
    console.error("API /api/feed/comments POST error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
