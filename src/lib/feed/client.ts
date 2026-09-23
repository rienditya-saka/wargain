"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseClient } from "@/lib/supabase-client";
import { FEED_FILTERS, FeedComment, FeedFilterKey, FeedPost } from "./types";

async function api<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Permintaan gagal");
  return json as T;
}

function matchesFilter(p: FeedPost, filter: FeedFilterKey) {
  const types = FEED_FILTERS[filter]?.types;
  return !types || (types as string[]).includes(p.type);
}

const isPinnedNow = (p: FeedPost) => !!p.pinnedUntil && new Date(p.pinnedUntil).getTime() > Date.now();

// Timeline with cursor pagination + Realtime. New posts from others wait in `incoming`
// (shown as a "N post baru" pill) so the list doesn't jump while reading.
export function useFeed({
  communityId,
  userId,
  filter,
  isPengurus,
}: {
  communityId?: string;
  userId?: string;
  filter: FeedFilterKey;
  isPengurus: boolean;
}) {
  const [pinned, setPinned] = useState<FeedPost[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [incoming, setIncoming] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const knownIds = useRef<Set<string>>(new Set());
  // Latest lists for the realtime handler (it is subscribed once per filter).
  const pinnedRef = useRef(pinned);
  const postsRef = useRef(posts);
  pinnedRef.current = pinned;
  postsRef.current = posts;

  const query = useCallback(
    (extra: Record<string, string> = {}) => {
      const p = new URLSearchParams({ communityId: communityId ?? "", filter, ...extra });
      if (userId) p.set("userId", userId);
      return `/api/feed?${p}`;
    },
    [communityId, userId, filter]
  );

  const load = useCallback(async () => {
    if (!communityId) return;
    setLoading(true);
    try {
      const res = await api<{ pinned: FeedPost[]; posts: FeedPost[]; nextCursor: string | null }>(query());
      setPinned(res.pinned);
      setPosts(res.posts);
      setCursor(res.nextCursor);
      setIncoming([]);
      knownIds.current = new Set([...res.pinned, ...res.posts].map((p) => p.id));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [communityId, query]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api<{ posts: FeedPost[]; nextCursor: string | null }>(query({ before: cursor }));
      const fresh = res.posts.filter((p) => !knownIds.current.has(p.id));
      fresh.forEach((p) => knownIds.current.add(p.id));
      setPosts((list) => [...list, ...fresh]);
      setCursor(res.nextCursor);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, query]);

  // Realtime: inserts go to `incoming`, updates patch in place (counts, pin, hide).
  useEffect(() => {
    if (!communityId) return;
    const visible = (p: FeedPost) => p.status === "PUBLISHED" && (isPengurus || p.visibility === "PUBLIC") && matchesFilter(p, filter);
    const patch = (list: FeedPost[], p: FeedPost) => list.map((x) => (x.id === p.id ? { ...x, ...p, likedByMe: x.likedByMe } : x));
    const channel = supabaseClient
      .channel(`feed:${communityId}:${filter}`)
      .on("postgres_changes" as any, { event: "INSERT", schema: "public", table: "feed_posts", filter: `communityId=eq.${communityId}` }, (payload: any) => {
        const p = payload.new as FeedPost;
        if (!visible(p) || knownIds.current.has(p.id)) return;
        knownIds.current.add(p.id);
        if (p.authorId && p.authorId === userId) setPosts((list) => [{ ...p, likedByMe: false }, ...list]);
        else setIncoming((list) => [{ ...p, likedByMe: false }, ...list]);
      })
      .on("postgres_changes" as any, { event: "UPDATE", schema: "public", table: "feed_posts", filter: `communityId=eq.${communityId}` }, (payload: any) => {
        const p = payload.new as FeedPost;
        if (!visible(p)) {
          setPosts((l) => l.filter((x) => x.id !== p.id));
          setPinned((l) => l.filter((x) => x.id !== p.id));
          return;
        }
        if (!knownIds.current.has(p.id)) {
          // A re-published module post (e.g. watchlist sighting) resurfacing at the top.
          knownIds.current.add(p.id);
          setIncoming((list) => [{ ...p, likedByMe: false }, ...list]);
          return;
        }
        if (isPinnedNow(p)) {
          const liked = postsRef.current.find((x) => x.id === p.id)?.likedByMe;
          setPinned((l) => (l.some((x) => x.id === p.id) ? patch(l, p) : [{ ...p, likedByMe: liked }, ...l]));
          setPosts((l) => l.filter((x) => x.id !== p.id));
        } else {
          const wasPinned = pinnedRef.current.find((x) => x.id === p.id);
          if (wasPinned) {
            setPinned((l) => l.filter((x) => x.id !== p.id));
            setPosts((l) => [{ ...wasPinned, ...p }, ...l]);
          } else {
            setPosts((l) => patch(l, p));
          }
        }
        setIncoming((l) => patch(l, p));
      })
      .subscribe();
    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [communityId, filter, isPengurus, userId]);

  const showIncoming = useCallback(() => {
    setPosts((list) => [...incoming, ...list]);
    setIncoming([]);
  }, [incoming]);

  const replace = useCallback((p: FeedPost) => {
    const apply = (l: FeedPost[]) => l.map((x) => (x.id === p.id ? p : x));
    setPosts(apply);
    setPinned(apply);
  }, []);

  const remove = useCallback((id: string) => {
    setPosts((l) => l.filter((x) => x.id !== id));
    setPinned((l) => l.filter((x) => x.id !== id));
  }, []);

  const toggleLike = useCallback(
    async (p: FeedPost) => {
      if (!userId) throw new Error("Silakan login untuk menyukai post.");
      const liked = !p.likedByMe;
      replace({ ...p, likedByMe: liked, likeCount: Math.max(0, p.likeCount + (liked ? 1 : -1)) });
      try {
        const res = await api<{ post: FeedPost }>("/api/feed", "PATCH", { postId: p.id, userId, action: liked ? "LIKE" : "UNLIKE" });
        replace(res.post);
      } catch (e) {
        replace(p);
        throw e;
      }
    },
    [userId, replace]
  );

  const action = useCallback(
    async (p: FeedPost, act: "PIN" | "UNPIN" | "HIDE" | "RESOLVE") => {
      const res = await api<{ post: FeedPost }>("/api/feed", "PATCH", { postId: p.id, userId, action: act });
      if (act === "HIDE") remove(p.id);
      else load();
      return res.post;
    },
    [userId, remove, load]
  );

  const create = useCallback(
    async (input: { type: string; title?: string; content: string; images?: string[]; payload?: Record<string, unknown>; pinDays?: number }) => {
      const res = await api<{ post: FeedPost }>("/api/feed", "POST", { userId, ...input });
      if (!knownIds.current.has(res.post.id)) {
        knownIds.current.add(res.post.id);
        if (res.post.pinnedUntil) setPinned((l) => [res.post, ...l]);
        else setPosts((l) => [res.post, ...l]);
      }
      return res.post;
    },
    [userId]
  );

  return { pinned, posts, incoming, hasMore: !!cursor, loading, loadingMore, error, loadMore, reload: load, showIncoming, toggleLike, action, create };
}

export async function fetchSinglePost(communityId: string, postId: string, userId?: string) {
  const p = new URLSearchParams({ communityId, postId });
  if (userId) p.set("userId", userId);
  const res = await api<{ posts: FeedPost[] }>(`/api/feed?${p}`);
  return res.posts[0] ?? null;
}

export function useComments(postId: string | null, userId?: string) {
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!postId) return;
    let alive = true;
    setLoading(true);
    api<{ comments: FeedComment[] }>(`/api/feed/comments?postId=${encodeURIComponent(postId)}`)
      .then((r) => alive && setComments(r.comments))
      .finally(() => alive && setLoading(false));
    const channel = supabaseClient
      .channel(`comments:${postId}`)
      .on("postgres_changes" as any, { event: "INSERT", schema: "public", table: "feed_comments", filter: `postId=eq.${postId}` }, (payload: any) => {
        const c = payload.new as FeedComment;
        setComments((l) => (l.some((x) => x.id === c.id) ? l : [...l, c]));
      })
      .subscribe();
    return () => {
      alive = false;
      supabaseClient.removeChannel(channel);
    };
  }, [postId]);

  const add = useCallback(
    async (content: string) => {
      if (!postId) return;
      const res = await api<{ comment: FeedComment }>("/api/feed/comments", "POST", { postId, userId, content });
      setComments((l) => (l.some((x) => x.id === res.comment.id) ? l : [...l, res.comment]));
    },
    [postId, userId]
  );

  return { comments, loading, add };
}
