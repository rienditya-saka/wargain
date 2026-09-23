"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Heart, MessageCircle, Share2, MoreHorizontal, Pin, EyeOff, CheckCircle2, Send, BadgeCheck } from "lucide-react";
import type { FeedPost } from "@/lib/feed/types";
import { useComments } from "@/lib/feed/client";
import { MODULES, PENGURUS_ROLES } from "@/lib/notifications/registry";
import { TYPE_BADGE, renderFeedBody } from "./registry";

const ROLE_LABEL: Record<string, string> = {
  TENANT_ADMIN: "Admin RT", KETUA: "Ketua RT", SEKRETARIS: "Sekretaris RT", BENDAHARA: "Bendahara RT", HUMAS: "Humas RT",
  ANGGOTA: "Warga", KEAMANAN: "Tim Keamanan", SISTEM: "Sistem",
};
const AVATAR_TONES = ["from-emerald-500 to-teal-600", "from-sky-500 to-indigo-600", "from-amber-500 to-orange-600", "from-pink-500 to-rose-600", "from-violet-500 to-purple-600", "from-lime-500 to-green-600"];

export function timeAgo(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} mnt`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} jam`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hr`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function Avatar({ post }: { post: FeedPost }) {
  if (post.module !== "FEED") {
    const emoji = MODULES[post.module as keyof typeof MODULES]?.emoji ?? "📌";
    return <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-lg shrink-0">{emoji}</div>;
  }
  const initials = post.authorName.replace(/^(Bpk|Ibu|H|Hj)\.?\s+/i, "").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const tone = AVATAR_TONES[[...post.authorName].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  return <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${tone} text-white text-sm font-black flex items-center justify-center shrink-0`}>{initials}</div>;
}

export function PostCard({
  post,
  viewer,
  onLike,
  onAction,
  highlight = false,
}: {
  post: FeedPost;
  viewer: { userId?: string; role?: string; fullName?: string };
  onLike: (p: FeedPost) => Promise<void>;
  onAction: (p: FeedPost, act: "PIN" | "UNPIN" | "HIDE" | "RESOLVE") => Promise<unknown>;
  highlight?: boolean;
}) {
  const [showComments, setShowComments] = React.useState(highlight);
  const [menu, setMenu] = React.useState(false);
  const [burst, setBurst] = React.useState(0);
  const isPengurus = PENGURUS_ROLES.includes(viewer.role ?? "");
  const isAuthor = !!viewer.userId && post.authorId === viewer.userId;
  const pinned = !!post.pinnedUntil && new Date(post.pinnedUntil).getTime() > Date.now();
  const badge = TYPE_BADGE[post.type];
  const ref = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (highlight) ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [highlight]);

  const like = async () => {
    if (!post.likedByMe) setBurst((b) => b + 1);
    try {
      await onLike(post);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const run = async (act: "PIN" | "UNPIN" | "HIDE" | "RESOLVE") => {
    setMenu(false);
    if (act === "HIDE" && !window.confirm("Sembunyikan post ini dari feed?")) return;
    try {
      await onAction(post, act);
      toast.success({ PIN: "Post disematkan 3 hari.", UNPIN: "Sematan dilepas.", HIDE: "Post disembunyikan.", RESOLVE: "Aduan ditandai selesai." }[act]);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/feed?post=${post.id}`;
    const text = `${post.title ?? post.content.slice(0, 80)} — WargaIn`;
    if (navigator.share) {
      navigator.share({ title: post.title ?? "WargaIn", text, url }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, "_blank", "noopener");
    }
  };

  const canManage = isPengurus || isAuthor;

  return (
    <motion.article
      ref={ref}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl bg-white dark:bg-[#131F17] border overflow-hidden transition-shadow ${
        highlight ? "border-emerald-500 ring-4 ring-emerald-500/15" : pinned ? "border-emerald-500/40" : "border-neutral-200/80 dark:border-neutral-800/80"
      }`}
    >
      <header className="flex items-start gap-2.5 px-4 pt-4">
        <Avatar post={post} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 min-w-0">
            <p className="text-sm font-bold truncate">{post.authorName}</p>
            {post.authorRole && PENGURUS_ROLES.includes(post.authorRole) && <BadgeCheck className="w-4 h-4 text-emerald-500 shrink-0" aria-label="Pengurus RT" />}
          </div>
          <p className="text-[11px] text-slate-500 truncate">
            {ROLE_LABEL[post.authorRole ?? ""] ?? post.authorRole ?? "Warga"}
            {post.authorBlock ? ` · ${post.authorBlock}` : ""} · {timeAgo(post.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {pinned && (
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black flex items-center gap-0.5"><Pin className="w-3 h-3" /> Disematkan</span>
          )}
          {badge && <span className={`hidden sm:inline px-2 py-0.5 rounded-full text-[10px] font-black ${badge.tone}`}>{badge.label}</span>}
          {canManage && (
            <div className="relative">
              <button onClick={() => setMenu((v) => !v)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Menu post">
                <MoreHorizontal className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {menu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-9 z-20 w-48 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0F1A13] shadow-xl py-1 text-xs font-semibold"
                    onMouseLeave={() => setMenu(false)}
                  >
                    {isPengurus && (
                      <button onClick={() => run(pinned ? "UNPIN" : "PIN")} className="w-full px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2">
                        <Pin className="w-3.5 h-3.5" /> {pinned ? "Lepas sematan" : "Sematkan 3 hari"}
                      </button>
                    )}
                    {isPengurus && post.type === "REPORT" && (post.payload as any).reportStatus !== "RESOLVED" && (
                      <button onClick={() => run("RESOLVE")} className="w-full px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Tandai aduan selesai
                      </button>
                    )}
                    <button onClick={() => run("HIDE")} className="w-full px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 text-red-600 flex items-center gap-2">
                      <EyeOff className="w-3.5 h-3.5" /> Sembunyikan
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </header>

      <div className="px-4 pt-3">{renderFeedBody(post)}</div>

      <footer className="px-2 pt-2 pb-1.5 mt-2 border-t border-neutral-100 dark:border-neutral-800/70 flex items-center">
        <button onClick={like} className={`relative flex-1 min-h-[40px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-colors ${post.likedByMe ? "text-rose-600" : "text-slate-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"}`} aria-pressed={!!post.likedByMe}>
          <motion.span key={burst} initial={burst ? { scale: 0.6 } : false} animate={{ scale: [1.35, 1] }} transition={{ duration: 0.35 }} className="flex">
            <Heart className={`w-4 h-4 ${post.likedByMe ? "fill-rose-600" : ""}`} />
          </motion.span>
          {post.likeCount > 0 ? post.likeCount : "Suka"}
        </button>
        <button onClick={() => setShowComments((v) => !v)} className="flex-1 min-h-[40px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/60" aria-expanded={showComments}>
          <MessageCircle className="w-4 h-4" /> {post.commentCount > 0 ? post.commentCount : "Komentar"}
        </button>
        <button onClick={share} className="flex-1 min-h-[40px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/60">
          <Share2 className="w-4 h-4" /> Bagikan
        </button>
      </footer>

      <AnimatePresence initial={false}>
        {showComments && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <Comments postId={post.id} viewer={viewer} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function Comments({ postId, viewer }: { postId: string; viewer: { userId?: string; fullName?: string } }) {
  const { comments, loading, add } = useComments(postId, viewer.userId);
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (!viewer.userId) {
      toast.error("Silakan login untuk berkomentar.");
      return;
    }
    setSending(true);
    try {
      await add(text);
      setText("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="px-4 pb-4 pt-1 space-y-2.5 bg-neutral-50/60 dark:bg-black/10">
      {loading && <p className="text-[11px] text-slate-400 py-2">Memuat komentar...</p>}
      {!loading && comments.length === 0 && <p className="text-[11px] text-slate-400 py-2">Belum ada komentar. Jadi yang pertama!</p>}
      {comments.map((c) => (
        <div key={c.id} className="flex gap-2">
          <div className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-black flex items-center justify-center shrink-0">
            {c.authorName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-white dark:bg-[#131F17] border border-neutral-200/70 dark:border-neutral-800/70 px-3 py-2">
            <p className="text-[11px] font-bold">
              {c.authorName} <span className="font-normal text-slate-400">{c.authorBlock ? `· ${c.authorBlock} ` : ""}· {timeAgo(c.createdAt)}</span>
            </p>
            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line">{c.content}</p>
          </div>
        </div>
      ))}
      <form onSubmit={submit} className="flex items-center gap-2 pt-1">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={viewer.userId ? "Tulis komentar..." : "Login untuk berkomentar"}
          disabled={!viewer.userId}
          maxLength={1000}
          className="flex-1 min-h-[40px] px-3.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0B130E] text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        />
        <button type="submit" disabled={sending || !text.trim()} className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center disabled:opacity-40" aria-label="Kirim komentar">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

export function PostSkeleton() {
  return (
    <div className="rounded-2xl bg-white dark:bg-[#131F17] border border-neutral-200/80 dark:border-neutral-800/80 p-4 space-y-3 animate-pulse">
      <div className="flex gap-2.5">
        <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800" />
        <div className="flex-1 space-y-1.5 pt-1">
          <div className="h-3 w-1/3 rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-2.5 w-1/4 rounded bg-neutral-100 dark:bg-neutral-800/70" />
        </div>
      </div>
      <div className="h-3 w-full rounded bg-neutral-100 dark:bg-neutral-800/70" />
      <div className="h-3 w-4/5 rounded bg-neutral-100 dark:bg-neutral-800/70" />
      <div className="h-40 rounded-xl bg-neutral-100 dark:bg-neutral-800/50" />
    </div>
  );
}
