"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Bell,
  Megaphone,
  ShoppingBag,
  Receipt,
  Rss,
  Search,
  ThumbsUp,
  Heart,
  MessageSquare,
  Share2,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Send,
  ShieldCheck,
  User,
  Home,
  FileText,
  Wallet,
  Users,
  LogOut,
  ChevronRight,
  Sparkles,
  MapPin,
  Calendar,
  Phone,
  ExternalLink,
  Check,
  Lock,
  Filter,
  DollarSign,
  Tag,
  AlertCircle,
  HelpCircle,
  ArrowRight
} from "lucide-react";
import { getClientSession, setClientSession, clearClientSession } from "@/lib/auth-session";
import SubscriptionPaywallModal from "@/components/auth/SubscriptionPaywallModal";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export type FeedFilter = "ALL" | "ANNOUNCEMENT" | "COMMERCE" | "BILL";

export interface CommentItem {
  id: string;
  author: string;
  avatar: string;
  text: string;
  timeAgo: string;
}

export interface FeedItem {
  id: string;
  type: "GENERAL" | "ANNOUNCEMENT" | "COMMERCE" | "BILL" | "REPORT";
  author: {
    name: string;
    role: string;
    avatar: string;
    block: string;
    isVerified?: boolean;
  };
  timeAgo: string;
  title: string;
  content: string;
  images?: string[];
  isPinned?: boolean;
  
  // Commerce properties
  price?: number;
  contactPhone?: string;
  itemCategory?: string;

  // Bill properties
  billAmount?: number;
  dueDate?: string;
  isPaid?: boolean;
  billMonth?: string;

  // Announcement properties
  eventDate?: string;
  eventLocation?: string;
  rsvpCount?: number;
  userRsvp?: boolean;

  // Report properties
  reportStatus?: "OPEN" | "IN_PROGRESS" | "RESOLVED";

  // Social interactions
  likeCount: number;
  isLiked: boolean;
  commentCount: number;
  comments: CommentItem[];
}

const INITIAL_FEED: FeedItem[] = [
  {
    id: "post-1",
    type: "ANNOUNCEMENT",
    author: {
      name: "Pak Bambang Kurniawan",
      role: "Ketua RT 04",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      block: "Pengurus RT",
      isVerified: true,
    },
    timeAgo: "1 jam yang lalu",
    isPinned: true,
    title: "📣 Pengumuman: Fogging Nyamuk DBD & Kerja Bakti Kebersihan",
    content: "Diberitahukan kepada seluruh warga RT 04 / RW 09 bahwa pada hari Minggu besok pukul 07:00 WIB akan dilaksanakan kerja bakti pembersihan saluran air disusul fogging serentak. Mohon menutup tempat penampungan air dan makanan di rumah masing-masing.",
    eventDate: "Minggu, 24 Sept 2026 • 07:00 WIB",
    eventLocation: "Pos Ronda & Selokan Gang Utama RT 04",
    rsvpCount: 28,
    userRsvp: true,
    likeCount: 19,
    isLiked: true,
    commentCount: 4,
    comments: [
      {
        id: "c-101",
        author: "Hendra Wijaya",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        text: "Siap Pak RT, cangkul & alat kebersihan Blok C siap diturunkan.",
        timeAgo: "45 menit lalu",
      },
      {
        id: "c-102",
        author: "Ibu Ratna Dewi",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
        text: "Tim konsumsi dari Dasawisma siap menyediakan teh hangat dan gorengan ya Pak.",
        timeAgo: "30 menit lalu",
      },
    ],
  },
  {
    id: "post-2",
    type: "COMMERCE",
    author: {
      name: "Ibu Siti Nurhaliza",
      role: "Warga UMKM",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
      block: "Blok B-08",
      isVerified: true,
    },
    timeAgo: "3 jam yang lalu",
    title: "🍲 Nasi Kotak Ayam Penyet Sambal Ijo Bu Siti",
    content: "Menerima pesanan makan siang & acara katering warga RT! Paket Nasi Ayam Penyet Sambal Ijo + Tahu Tempe + Lahapan segar. Siap antar gratis langsung ke rumah tetangga di Blok A-D.",
    price: 20000,
    contactPhone: "081234567890",
    itemCategory: "Kuliner & Katering",
    images: [
      "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80"
    ],
    likeCount: 14,
    isLiked: false,
    commentCount: 2,
    comments: [
      {
        id: "c-103",
        author: "Budi Santoso (Blok A-12)",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
        text: "Wah langganan nih! Pesan 3 porsi ya Bu Siti untuk jam 12 siang.",
        timeAgo: "2 jam lalu",
      }
    ],
  },
  {
    id: "post-3",
    type: "BILL",
    author: {
      name: "Bendahara RT 04 (Pak Yudi)",
      role: "Pengurus RT",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
      block: "Kas Keuangan",
      isVerified: true,
    },
    timeAgo: "5 jam yang lalu",
    title: "💳 Tagihan Iuran Bulanan Warga - September 2026",
    content: "Pengingat iuran rutin bulanan mencakup Keamanan 24 Jam, Kebersihan Sampah Lingkungan, dan Kas Pemeliharaan Fasum RT 04. Mohon dapat diselesaikan sebelum tanggal 25.",
    billAmount: 50000,
    billMonth: "September 2026",
    dueDate: "25 September 2026",
    isPaid: false,
    likeCount: 8,
    isLiked: false,
    commentCount: 1,
    comments: [
      {
        id: "c-104",
        author: "Agus Pratama",
        avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
        text: "Terima kasih Pak Yudi, langsung saya bayar via QRIS lewat WargaIn.",
        timeAgo: "4 jam lalu",
      }
    ],
  },
  {
    id: "post-4",
    type: "REPORT",
    author: {
      name: "Hendra Wijaya",
      role: "Warga RT 04",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      block: "Blok C-12",
      isVerified: true,
    },
    timeAgo: "6 jam yang lalu",
    title: "⚠️ Laporan: Lampu Jalan Gang 3 Berkedip Padam",
    content: "Lampu jalan tiang P-03 Gang 3 dekat rumah Pak Hendra padam total sejak semalam. Mohon dibantu pengecekan bohlamp atau sekering oleh seksi fasilitas umum RT.",
    reportStatus: "IN_PROGRESS",
    images: [
      "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop&q=80"
    ],
    likeCount: 6,
    isLiked: false,
    commentCount: 2,
    comments: [
      {
        id: "c-105",
        author: "Pak Bambang (Ketua RT)",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        text: "Laporan diterima Pak Hendra. Pak Yudi seksi fasum sedang meluncur beli bohlamp pengganti.",
        timeAgo: "5 jam lalu",
      }
    ],
  },
];

export default function WargainFeedPage() {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<any>(null);

  // Responsive mobile sidebar drawer toggle
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Active Filter state (Feed Umum, Pengumuman RT, Warga Commerce, Tagihan)
  const [activeFilter, setActiveFilter] = useState<FeedFilter>("ALL");

  // Feed items & composer modal state
  const [feedItems, setFeedItems] = useState<FeedItem[]>(INITIAL_FEED);
  const [showComposerModal, setShowComposerModal] = useState(false);
  const [composerType, setComposerType] = useState<"GENERAL" | "ANNOUNCEMENT" | "COMMERCE" | "REPORT">("GENERAL");

  // Form states for composer
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postPrice, setPostPrice] = useState("");
  const [postPhone, setPostPhone] = useState("");

  // Comment expand state
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({
    "post-1": true
  });
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // Payment modal state for bills
  const [payingBillPost, setPayingBillPost] = useState<FeedItem | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const initialSession = getClientSession();
    setSession(initialSession);

    // Auto-sync live status from Supabase Postgres DB to eliminate stale cache
    if (initialSession?.email || initialSession?.userId || initialSession?.communityId) {
      fetch("/api/auth/sync-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: initialSession.email,
          userId: initialSession.userId,
          communityId: initialSession.communityId,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && data?.session) {
            setClientSession(data.session);
            setSession(data.session);
          }
        })
        .catch((err) => console.error("Session sync failed:", err));
    }

    const handleUpdate = () => setSession(getClientSession());
    window.addEventListener("wargain_session_updated", handleUpdate);
    return () => window.removeEventListener("wargain_session_updated", handleUpdate);
  }, []);

  const activeCommunityName = mounted && session?.communityName
    ? session.communityName
    : "RT 04 / RW 09 Kemang Utama";

  const userFullName = mounted && session?.fullName
    ? session.fullName
    : "Pak Bambang Kurniawan";

  const userRole = mounted && session?.role
    ? session.role
    : "Ketua RT / Admin";

  // Filter feed items based on selected tab
  const filteredFeed = useMemo(() => {
    if (activeFilter === "ALL") return feedItems;
    if (activeFilter === "ANNOUNCEMENT") return feedItems.filter(item => item.type === "ANNOUNCEMENT");
    if (activeFilter === "COMMERCE") return feedItems.filter(item => item.type === "COMMERCE");
    if (activeFilter === "BILL") return feedItems.filter(item => item.type === "BILL");
    return feedItems;
  }, [feedItems, activeFilter]);

  // Handlers
  const handleLikeToggle = (id: string) => {
    setFeedItems(prev => prev.map(item => {
      if (item.id === id) {
        const nextLiked = !item.isLiked;
        return {
          ...item,
          isLiked: nextLiked,
          likeCount: nextLiked ? item.likeCount + 1 : item.likeCount - 1
        };
      }
      return item;
    }));
  };

  const handleRsvpToggle = (id: string) => {
    setFeedItems(prev => prev.map(item => {
      if (item.id === id) {
        const nextRsvp = !item.userRsvp;
        return {
          ...item,
          userRsvp: nextRsvp,
          rsvpCount: (item.rsvpCount || 0) + (nextRsvp ? 1 : -1)
        };
      }
      return item;
    }));
    toast.success("Status konfirmasi RSVP diperbarui!");
  };

  const handleAddComment = (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    const newComment: CommentItem = {
      id: `c-${Date.now()}`,
      author: userFullName,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      text: text,
      timeAgo: "Baru saja"
    };

    setFeedItems(prev => prev.map(item => {
      if (item.id === postId) {
        return {
          ...item,
          commentCount: item.commentCount + 1,
          comments: [...item.comments, newComment]
        };
      }
      return item;
    }));

    setCommentInputs(prev => ({ ...prev, [postId]: "" }));
    toast.success("Komentar terpublikasi.");
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) {
      toast.error("Judul dan isi postingan tidak boleh kosong.");
      return;
    }

    const newPost: FeedItem = {
      id: `post-${Date.now()}`,
      type: composerType === "GENERAL" ? "GENERAL" : composerType === "ANNOUNCEMENT" ? "ANNOUNCEMENT" : composerType === "COMMERCE" ? "COMMERCE" : "REPORT",
      author: {
        name: userFullName,
        role: userRole,
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        block: "Pengurus RT",
        isVerified: true
      },
      timeAgo: "Baru saja",
      title: postTitle.trim(),
      content: postContent.trim(),
      price: postPrice ? parseInt(postPrice) : undefined,
      contactPhone: postPhone || undefined,
      likeCount: 0,
      isLiked: false,
      commentCount: 0,
      comments: []
    };

    setFeedItems([newPost, ...feedItems]);
    setPostTitle("");
    setPostContent("");
    setPostPrice("");
    setPostPhone("");
    setShowComposerModal(false);
    toast.success("Postingan berhasil diterbitkan ke Feed RT!");
  };

  const handleSharePost = (post: FeedItem) => {
    const text = `*${post.title}*\n${post.content.slice(0, 100)}...\n\nLihat selengkapnya di aplikasi WargaIn RT 04: https://wargain.id/feed`;
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: text,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Tautan postingan berhasil disalin!", {
        description: "Siap dibagikan ke WhatsApp Group Warga RT."
      });
    }
  };

  const handlePayBillSuccess = () => {
    if (payingBillPost) {
      setFeedItems(prev => prev.map(item => {
        if (item.id === payingBillPost.id) {
          return { ...item, isPaid: true };
        }
        return item;
      }));
    }
    setIsPayModalOpen(false);
    toast.success("Pembayaran Iuran Berhasil!", {
      description: "Bukti pembayaran telah dicatat ke Kas RT 04 secara otomatis."
    });
  };

  return (
    <div className="min-h-screen bg-[#FBFBF9] dark:bg-[#0B130E] text-slate-900 dark:text-slate-100 pb-20 md:pb-8 selection:bg-emerald-500 selection:text-white font-sans">
      
      {/* ========================================== */}
      {/* 1. HEADER TOP BAR (RESPONSIVE SAFE-AREA) */}
      {/* ========================================== */}
      <header className="sticky top-0 z-40 bg-[#FBFBF9]/90 dark:bg-[#0B130E]/90 backdrop-blur-xl border-b border-neutral-200/80 dark:border-neutral-800/80 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          
          {/* Left: Burger Icon (Mobile) & Brand Logo */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="w-10 h-10 rounded-xl bg-white dark:bg-[#131F17] border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors shrink-0 md:hidden"
              aria-label="Open Main Menu"
            >
              <Menu className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </button>

            <Link href="/feed" className="flex items-center gap-2.5 group">
              <Image
                src="/images/logo.png"
                alt="WargaIn Logo"
                width={36}
                height={36}
                className="w-9 h-9 object-contain group-hover:scale-105 transition-transform"
              />
              <div className="hidden sm:block">
                <span className="font-black text-lg tracking-tight leading-none block">
                  Warga<span className="text-emerald-600 dark:text-emerald-400">In</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 leading-none">
                  {activeCommunityName}
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Search Bar (Desktop) */}
          <div className="hidden md:flex items-center flex-1 max-w-md relative">
            <Search className="w-4 h-4 absolute left-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari pengumuman, warga commerce, tagihan, aduan..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-full bg-white dark:bg-[#131F17] border border-neutral-200 dark:border-neutral-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition-colors shadow-xs"
            />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            <button
              onClick={() => {
                setComposerType("ANNOUNCEMENT");
                setShowComposerModal(true);
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Post</span>
            </button>

            <button
              type="button"
              className="w-10 h-10 rounded-xl bg-white dark:bg-[#131F17] border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-emerald-600 relative active:scale-95 transition-transform"
              aria-label="Notifikasi"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#0B130E]" />
            </button>

            <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-emerald-500/40 shrink-0">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                alt="Avatar User"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </header>

      {/* ========================================== */}
      {/* 2. MAIN CONTENT CONTAINER (WITH APP SIDEBAR) */}
      {/* ========================================== */}
      <main className="max-w-7xl mx-auto px-4 py-4 md:py-6">
        <div className="flex flex-col md:flex-row lg:gap-6 items-start">
          
          {/* REUSABLE GLOBAL APP SIDEBAR */}
          <AppSidebar
            session={session}
            isMobileDrawerOpen={isMobileDrawerOpen}
            onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
            activeFilter={activeFilter}
            onSelectFilter={(filter) => setActiveFilter(filter as FeedFilter)}
          />

          {/* ---------------------------------------------------- */}
          {/* CENTER FEED STREAM */}
          {/* ---------------------------------------------------- */}
          <section className="flex-1 w-full space-y-4 max-w-2xl mx-auto">
            
            {/* DESKTOP TOP FILTER TABS (hidden on mobile) */}
            <div className="hidden md:flex items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-[#131F17] border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs">
              <button
                onClick={() => setActiveFilter("ALL")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeFilter === "ALL"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                <Rss className="w-3.5 h-3.5" />
                <span>Feed Umum</span>
              </button>

              <button
                onClick={() => setActiveFilter("ANNOUNCEMENT")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeFilter === "ANNOUNCEMENT"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>Pengumuman RT</span>
              </button>

              <button
                onClick={() => setActiveFilter("COMMERCE")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeFilter === "COMMERCE"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Warga Commerce</span>
              </button>

              <button
                onClick={() => setActiveFilter("BILL")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeFilter === "BILL"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Tagihan</span>
              </button>
            </div>

            {/* STORIES / QUICK HIGHLIGHTS CAROUSEL */}
            <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1">
              {/* Add Story Button */}
              <button
                onClick={() => setShowComposerModal(true)}
                className="shrink-0 w-24 h-36 rounded-2xl bg-gradient-to-b from-emerald-500/20 to-teal-900/30 border border-emerald-500/30 p-2 flex flex-col items-center justify-between text-center relative group active:scale-95 transition-transform"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg mt-4 group-hover:scale-110 transition-transform">
                  +
                </div>
                <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                  Buat Update Warga
                </span>
              </button>

              {/* Story Item 1 */}
              <div className="shrink-0 w-24 h-36 rounded-2xl overflow-hidden relative border border-neutral-200 dark:border-neutral-800 shadow-xs cursor-pointer group active:scale-95 transition-transform">
                <img
                  src="https://images.unsplash.com/photo-1577495508048-b635879837f1?w=300&auto=format&fit=crop&q=80"
                  alt="Story Fogging"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2 flex flex-col justify-between">
                  <Badge className="bg-amber-500 text-white text-[8px] self-start px-1 py-0">📢 RT</Badge>
                  <span className="text-[10px] font-bold text-white leading-tight">
                    Fogging Minggu 07:00
                  </span>
                </div>
              </div>

              {/* Story Item 2 */}
              <div className="shrink-0 w-24 h-36 rounded-2xl overflow-hidden relative border border-neutral-200 dark:border-neutral-800 shadow-xs cursor-pointer group active:scale-95 transition-transform">
                <img
                  src="https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=300&auto=format&fit=crop&q=80"
                  alt="Story Culinary"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2 flex flex-col justify-between">
                  <Badge className="bg-emerald-600 text-white text-[8px] self-start px-1 py-0">🛒 Commerce</Badge>
                  <span className="text-[10px] font-bold text-white leading-tight">
                    Katering Bu Siti
                  </span>
                </div>
              </div>

              {/* Story Item 3 */}
              <div className="shrink-0 w-24 h-36 rounded-2xl overflow-hidden relative border border-neutral-200 dark:border-neutral-800 shadow-xs cursor-pointer group active:scale-95 transition-transform">
                <img
                  src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=300&auto=format&fit=crop&q=80"
                  alt="Story Dues"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2 flex flex-col justify-between">
                  <Badge className="bg-teal-500 text-white text-[8px] self-start px-1 py-0">💳 Tagihan</Badge>
                  <span className="text-[10px] font-bold text-white leading-tight">
                    Target Kas Sept 85%
                  </span>
                </div>
              </div>
            </div>

            {/* FACEBOOK-STYLE POST COMPOSER BOX */}
            <Card className="border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] shadow-xs">
              <CardContent className="p-3.5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 ring-2 ring-emerald-500/30">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                      alt="User Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setComposerType("GENERAL");
                      setShowComposerModal(true);
                    }}
                    className="flex-1 bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-slate-500 dark:text-slate-400 text-xs md:text-sm text-left px-4 py-2.5 rounded-full transition-colors font-medium border border-transparent focus:outline-none"
                  >
                    Apa yang ingin Anda bagikan di {activeCommunityName}?
                  </button>
                </div>

                <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-800/60 grid grid-cols-3 gap-1 text-xs">
                  <button
                    onClick={() => {
                      setComposerType("ANNOUNCEMENT");
                      setShowComposerModal(true);
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-amber-600 dark:text-amber-400 font-semibold transition-colors"
                  >
                    <Megaphone className="w-4 h-4" />
                    <span>Pengumuman</span>
                  </button>

                  <button
                    onClick={() => {
                      setComposerType("COMMERCE");
                      setShowComposerModal(true);
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-emerald-600 dark:text-emerald-400 font-semibold transition-colors"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Jual Barang</span>
                  </button>

                  <button
                    onClick={() => {
                      setComposerType("REPORT");
                      setShowComposerModal(true);
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-rose-500 font-semibold transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Lapor Aduan</span>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* FEED STREAM ITEMS */}
            <div className="space-y-4">
              {filteredFeed.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-[#131F17] rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 space-y-3">
                  <HelpCircle className="w-12 h-12 text-slate-400 mx-auto opacity-50" />
                  <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                    Belum ada postingan pada kategori ini
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Jadilah warga pertama yang membagikan informasi atau jualan produk di RT 04!
                  </p>
                  <Button
                    onClick={() => setShowComposerModal(true)}
                    className="bg-emerald-600 text-white text-xs font-bold"
                  >
                    + Buat Postingan Baru
                  </Button>
                </div>
              ) : (
                filteredFeed.map((post) => (
                  <article
                    key={post.id}
                    className="bg-white dark:bg-[#131F17] border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xs overflow-hidden space-y-3"
                  >
                    {/* Post Header */}
                    <div className="p-4 pb-0 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-emerald-500/20 shrink-0">
                          <img
                            src={post.author.avatar}
                            alt={post.author.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-bold text-xs md:text-sm text-slate-900 dark:text-slate-100">
                              {post.author.name}
                            </h3>
                            {post.author.isVerified && (
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            )}
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                              {post.author.role}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span>{post.author.block}</span>
                            <span>•</span>
                            <span>{post.timeAgo}</span>
                          </div>
                        </div>
                      </div>

                      {/* Post Type Badge */}
                      <div className="flex items-center gap-2">
                        {post.isPinned && (
                          <Badge className="bg-amber-500 text-white text-[9px] gap-1">
                            📌 Pinned
                          </Badge>
                        )}

                        {post.type === "ANNOUNCEMENT" && (
                          <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/30 text-[10px] font-bold">
                            📢 Pengumuman
                          </Badge>
                        )}
                        {post.type === "COMMERCE" && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-[10px] font-bold">
                            🛒 Warga Commerce
                          </Badge>
                        )}
                        {post.type === "BILL" && (
                          <Badge className="bg-teal-500/10 text-teal-600 border border-teal-500/30 text-[10px] font-bold">
                            💳 Tagihan
                          </Badge>
                        )}
                        {post.type === "REPORT" && (
                          <Badge className="bg-rose-500/10 text-rose-600 border border-rose-500/30 text-[10px] font-bold">
                            ⚠️ Aduan
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Post Content */}
                    <div className="px-4 space-y-2">
                      <h2 className="font-bold text-sm md:text-base text-slate-900 dark:text-slate-100 leading-snug">
                        {post.title}
                      </h2>
                      <p className="text-xs md:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                        {post.content}
                      </p>

                      {/* Special Banner / Cards based on post type */}
                      
                      {/* ANNOUNCEMENT SPECIAL CARD */}
                      {post.type === "ANNOUNCEMENT" && post.eventDate && (
                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-2.5 my-2">
                          <div className="flex items-center gap-2 text-xs font-bold">
                            <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <span>{post.eventDate}</span>
                          </div>
                          {post.eventLocation && (
                            <div className="flex items-center gap-2 text-xs">
                              <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span>{post.eventLocation}</span>
                            </div>
                          )}
                          <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between">
                            <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                              {post.rsvpCount} Warga Menyatakan Hadir
                            </span>
                            <button
                              onClick={() => handleRsvpToggle(post.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-transform active:scale-95 ${
                                post.userRsvp
                                  ? "bg-amber-600 text-white"
                                  : "bg-white dark:bg-neutral-800 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                              }`}
                            >
                              {post.userRsvp ? "✓ Akan Hadir" : "+ Konfirmasi Hadir"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* COMMERCE SPECIAL CARD */}
                      {post.type === "COMMERCE" && post.price && (
                        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 my-2">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
                              Harga Barang / Produk
                            </span>
                            <p className="text-base font-black text-emerald-700 dark:text-emerald-300">
                              Rp {post.price.toLocaleString("id-ID")}
                            </p>
                          </div>
                          {post.contactPhone && (
                            <a
                              href={`https://wa.me/${post.contactPhone}?text=Halo%20${encodeURIComponent(post.author.name)},%20saya%20tertarik%20dengan%20produk%20${encodeURIComponent(post.title)}%20di%20WargaIn`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-transform"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>Beli via WhatsApp</span>
                            </a>
                          )}
                        </div>
                      )}

                      {/* BILL SPECIAL CARD */}
                      {post.type === "BILL" && post.billAmount && (
                        <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 space-y-3 my-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-bold uppercase text-teal-600 dark:text-teal-400">
                                Periode {post.billMonth}
                              </span>
                              <p className="text-lg font-black text-teal-700 dark:text-teal-300">
                                Rp {post.billAmount.toLocaleString("id-ID")}
                              </p>
                            </div>
                            <Badge
                              className={
                                post.isPaid
                                  ? "bg-emerald-600 text-white"
                                  : "bg-amber-500 text-white"
                              }
                            >
                              {post.isPaid ? "✓ Lunas" : "Belum Dibayar"}
                            </Badge>
                          </div>

                          {!post.isPaid ? (
                            <button
                              onClick={() => {
                                setPayingBillPost(post);
                                setIsPayModalOpen(true);
                              }}
                              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-transform"
                            >
                              <Wallet className="w-4 h-4" />
                              <span>Bayar Tagihan Sekarang (QRIS / Transfer)</span>
                            </button>
                          ) : (
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Pembayaran terverifikasi otomatis oleh Sistem Kas RT.</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Post Images if any */}
                      {post.images && post.images.length > 0 && (
                        <div className="rounded-xl overflow-hidden my-2 max-h-80 border border-neutral-200 dark:border-neutral-800">
                          <img
                            src={post.images[0]}
                            alt={post.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>

                    {/* Social Action Bar */}
                    <div className="px-4 py-2.5 border-t border-neutral-200/60 dark:border-neutral-800/60 flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                      {/* Like Button */}
                      <button
                        onClick={() => handleLikeToggle(post.id)}
                        className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg font-semibold transition-colors active:scale-95 ${
                          post.isLiked
                            ? "text-rose-500 bg-rose-500/10"
                            : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${post.isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
                        <span>{post.likeCount} Suka</span>
                      </button>

                      {/* Comment Toggle Button */}
                      <button
                        onClick={() =>
                          setExpandedComments(prev => ({
                            ...prev,
                            [post.id]: !prev[post.id]
                          }))
                        }
                        className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>{post.commentCount} Komentar</span>
                      </button>

                      {/* Share Button */}
                      <button
                        onClick={() => handleSharePost(post)}
                        className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Bagikan</span>
                      </button>
                    </div>

                    {/* COLLAPSIBLE COMMENTS SECTION */}
                    {expandedComments[post.id] && (
                      <div className="px-4 py-3 bg-neutral-50/80 dark:bg-[#0B130E]/50 border-t border-neutral-200/60 dark:border-neutral-800/60 space-y-3">
                        {/* Comment Input */}
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                            <img
                              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                              alt="Me"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <input
                            type="text"
                            placeholder="Tulis komentar balasan..."
                            value={commentInputs[post.id] || ""}
                            onChange={(e) =>
                              setCommentInputs(prev => ({
                                ...prev,
                                [post.id]: e.target.value
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddComment(post.id);
                            }}
                            className="flex-1 px-3 py-1.5 text-xs rounded-full bg-white dark:bg-[#131F17] border border-neutral-200 dark:border-neutral-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 hover:bg-emerald-500 active:scale-95"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Comment List */}
                        <div className="space-y-2.5">
                          {post.comments.map((comm) => (
                            <div key={comm.id} className="flex items-start gap-2 text-xs">
                              <img
                                src={comm.avatar}
                                alt={comm.author}
                                className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                              />
                              <div className="flex-1 bg-white dark:bg-[#131F17] p-2.5 rounded-2xl border border-neutral-200/60 dark:border-neutral-800/60 space-y-0.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-900 dark:text-slate-100 text-[11px]">
                                    {comm.author}
                                  </span>
                                  <span className="text-[9px] text-slate-400">{comm.timeAgo}</span>
                                </div>
                                <p className="text-slate-600 dark:text-slate-300 text-xs">
                                  {comm.text}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>

          {/* ---------------------------------------------------- */}
          {/* DESKTOP RIGHT WIDGETS */}
          {/* ---------------------------------------------------- */}
          <aside className="hidden lg:block lg:w-72 shrink-0 space-y-4 sticky top-20">
            {/* Widget 1: Agenda RT */}
            <Card className="border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] shadow-xs">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-200/80 dark:border-neutral-800/80 pb-2">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span>Agenda & Event RT</span>
                  </h4>
                  <span className="text-[10px] text-emerald-600 font-bold">2 Minggu Ini</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 block">
                      Minggu, 24 Sept • 07:00 WIB
                    </span>
                    <h5 className="font-bold text-slate-900 dark:text-slate-100">
                      Kerja Bakti & Fogging Serentak
                    </h5>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Pos Ronda RT 04 • Kebersihan & Fogging
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 block">
                      Sabtu, 30 Sept • 19:30 WIB
                    </span>
                    <h5 className="font-bold text-slate-900 dark:text-slate-100">
                      Rapat Bulanan Pengurus RT
                    </h5>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Rumah Ketua RT • Evaluasi Laporan Kas
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Widget 2: Status Iuran Saya */}
            <Card className="border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#131F17] shadow-xs">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-200/80 dark:border-neutral-800/80 pb-2">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    <span>Tagihan Saya</span>
                  </h4>
                  <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                    September 2026
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">Iuran Keamanan & Sampah</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">Rp 50.000</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">Status Pembayaran</span>
                    <span className="font-bold text-amber-600">Belum Dibayar</span>
                  </div>

                  <button
                    onClick={() => {
                      setPayingBillPost(INITIAL_FEED[2]);
                      setIsPayModalOpen(true);
                    }}
                    className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm mt-1 transition-transform active:scale-95"
                  >
                    Bayar Iuran Sekarang
                  </button>
                </div>
              </CardContent>
            </Card>
          </aside>

        </div>
      </main>

      {/* ========================================== */}
      {/* 3. STICKY BOTTOM NAVIGATION BAR (MOBILE ONLY) */}
      {/* ========================================== */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#0B130E]/95 backdrop-blur-xl border-t border-neutral-200/80 dark:border-neutral-800/80 px-2 py-1.5 md:hidden">
        <div className="max-w-md mx-auto grid grid-cols-4 items-center justify-items-center">
          
          {/* Tab 1: Feed Umum */}
          <button
            onClick={() => setActiveFilter("ALL")}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold w-full transition-colors ${
              activeFilter === "ALL"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <Rss className="w-5 h-5" />
            <span>Feed Umum</span>
          </button>

          {/* Tab 2: Pengumuman RT */}
          <button
            onClick={() => setActiveFilter("ANNOUNCEMENT")}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold w-full transition-colors relative ${
              activeFilter === "ANNOUNCEMENT"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <Megaphone className="w-5 h-5" />
            <span>Pengumuman</span>
            <span className="absolute top-1 right-5 w-1.5 h-1.5 rounded-full bg-amber-500" />
          </button>

          {/* Tab 3: Warga Commerce */}
          <button
            onClick={() => setActiveFilter("COMMERCE")}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold w-full transition-colors ${
              activeFilter === "COMMERCE"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span>Commerce</span>
          </button>

          {/* Tab 4: Tagihan */}
          <button
            onClick={() => setActiveFilter("BILL")}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold w-full transition-colors ${
              activeFilter === "BILL"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span>Tagihan</span>
          </button>

        </div>
      </nav>

      {/* ========================================== */}
      {/* 4. POST COMPOSER MODAL */}
      {/* ========================================== */}
      <AnimatePresence>
        {showComposerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white dark:bg-[#131F17] rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span>Buat Postingan Baru</span>
                </h3>
                <button
                  onClick={() => setShowComposerModal(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleCreatePost} className="p-4 space-y-4">
                {/* Category Selection Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setComposerType("GENERAL")}
                    className={`px-3 py-1.5 rounded-full font-bold transition-colors ${
                      composerType === "GENERAL"
                        ? "bg-emerald-600 text-white"
                        : "bg-neutral-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    Post Umum
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposerType("ANNOUNCEMENT")}
                    className={`px-3 py-1.5 rounded-full font-bold transition-colors ${
                      composerType === "ANNOUNCEMENT"
                        ? "bg-amber-600 text-white"
                        : "bg-neutral-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    Pengumuman RT
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposerType("COMMERCE")}
                    className={`px-3 py-1.5 rounded-full font-bold transition-colors ${
                      composerType === "COMMERCE"
                        ? "bg-teal-600 text-white"
                        : "bg-neutral-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    Warga Commerce
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposerType("REPORT")}
                    className={`px-3 py-1.5 rounded-full font-bold transition-colors ${
                      composerType === "REPORT"
                        ? "bg-rose-600 text-white"
                        : "bg-neutral-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    Aduan Warga
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Judul Postingan
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Tuliskan judul informasi..."
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-[#0B130E] border border-neutral-200 dark:border-neutral-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Isi Pesan / Informasi
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Jelaskan detail postingan Anda secara lengkap..."
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-[#0B130E] border border-neutral-200 dark:border-neutral-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>

                  {/* Commerce additional fields */}
                  {composerType === "COMMERCE" && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Harga Produk (Rp)
                        </label>
                        <input
                          type="number"
                          placeholder="25000"
                          value={postPrice}
                          onChange={(e) => setPostPrice(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-[#0B130E] border border-neutral-200 dark:border-neutral-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Nomor WhatsApp (WA)
                        </label>
                        <input
                          type="text"
                          placeholder="081234567890"
                          value={postPhone}
                          onChange={(e) => setPostPhone(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-[#0B130E] border border-neutral-200 dark:border-neutral-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowComposerModal(false)}
                    className="text-xs font-bold"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5"
                  >
                    Terbitkan Post
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================== */}
      {/* 5. PAYMENT MODAL FOR BILLS */}
      {/* ========================================== */}
      <AnimatePresence>
        {isPayModalOpen && payingBillPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white dark:bg-[#131F17] rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                <Receipt className="w-6 h-6" />
              </div>

              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Bayar Tagihan Iuran
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {payingBillPost.title}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-[#0B130E] space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Pembayaran</span>
                <p className="text-2xl font-black text-emerald-600">
                  Rp {(payingBillPost.billAmount || 50000).toLocaleString("id-ID")}
                </p>
                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Metode: QRIS Instant</span>
                  <span className="font-bold text-emerald-600">Bebas Biaya Admin</span>
                </div>
              </div>

              {/* QRIS Dummy Visual */}
              <div className="p-3 bg-white rounded-xl border border-neutral-200 w-40 h-40 mx-auto flex items-center justify-center">
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=WargainIuranRT04"
                  alt="QRIS Code"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="space-y-2">
                <Button
                  onClick={handlePayBillSuccess}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 text-xs rounded-xl"
                >
                  ✓ Konfirmasi Pembayaran Lunas
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setIsPayModalOpen(false)}
                  className="w-full text-xs text-slate-400"
                >
                  Batal
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
