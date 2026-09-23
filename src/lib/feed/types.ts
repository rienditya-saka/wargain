import type { ModuleKey } from "@/lib/notifications/registry";

export type FeedPostType =
  | "GENERAL"
  | "ANNOUNCEMENT"
  | "COMMERCE"
  | "REPORT"
  | "SOCIAL_EVENT"
  | "SECURITY_ALERT"
  | "LOST_FOUND"
  | "DISASTER"
  | "KAS_INFO"
  | (string & {});

export interface FeedPost {
  id: string;
  communityId: string;
  module: ModuleKey | string;
  type: FeedPostType;
  authorId?: string | null;
  authorName: string;
  authorRole?: string | null;
  authorBlock?: string | null;
  title?: string | null;
  content: string;
  images: string[];
  payload: Record<string, any>;
  entityType?: string | null;
  entityId?: string | null;
  visibility: "PUBLIC" | "PENGURUS";
  status: "PUBLISHED" | "HIDDEN";
  isPinned: boolean;
  pinnedUntil?: string | null;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  // per viewer, computed by the API
  likedByMe?: boolean;
}

export interface FeedComment {
  id: string;
  postId: string;
  userId?: string | null;
  authorName: string;
  authorBlock?: string | null;
  content: string;
  createdAt: string;
}

// Tabs on the feed page map to post types.
export const FEED_FILTERS = {
  ALL: { label: "Semua", types: null as FeedPostType[] | null },
  ANNOUNCEMENT: { label: "Pengumuman", types: ["ANNOUNCEMENT", "DISASTER"] as FeedPostType[] },
  EVENT: { label: "Kegiatan", types: ["SOCIAL_EVENT"] as FeedPostType[] },
  SECURITY: { label: "Keamanan", types: ["SECURITY_ALERT", "LOST_FOUND", "DISASTER", "REPORT"] as FeedPostType[] },
  COMMERCE: { label: "Jual Beli", types: ["COMMERCE"] as FeedPostType[] },
} as const;

export type FeedFilterKey = keyof typeof FEED_FILTERS;

export const USER_POST_TYPES = ["GENERAL", "ANNOUNCEMENT", "COMMERCE", "REPORT"] as const;
export type UserPostType = (typeof USER_POST_TYPES)[number];
