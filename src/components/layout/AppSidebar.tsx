"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rss,
  FileText,
  Wallet,
  Users,
  ShoppingBag,
  AlertTriangle,
  Settings,
  LogOut,
  X,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  Home,
  Bell,
  Menu
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SessionTenant } from "@/lib/types/auth";
import { clearClientSession } from "@/lib/auth-session";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export interface AppSidebarProps {
  session: SessionTenant | null;
  isMobileDrawerOpen: boolean;
  onCloseMobileDrawer: () => void;
  activeFilter?: string;
  onSelectFilter?: (filter: string) => void;
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  isFilter?: boolean;
  filterValue?: string;
}

export function AppSidebar({
  session,
  isMobileDrawerOpen,
  onCloseMobileDrawer,
  activeFilter,
  onSelectFilter,
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const activeCommunityName = session?.communityName || "RT 04 / RW 09 Kemang Utama";
  const userFullName = session?.fullName || "Pak Bambang Kurniawan";
  const userRole = session?.role || "Ketua RT / Admin";
  const isTenantActive = session?.isTenantActive ?? false;

  const handleLogout = () => {
    clearClientSession();
    toast.success("Berhasil keluar dari akun.");
    router.push("/login");
  };

  const navItems: NavItem[] = [
    {
      id: "feed",
      label: "Beranda Feed Warga",
      href: "/feed",
      icon: Rss,
      isFilter: true,
      filterValue: "ALL",
    },
    {
      id: "announcements",
      label: "Pengumuman RT",
      href: "/feed?filter=ANNOUNCEMENT",
      icon: Rss,
      badge: "1 Baru",
      badgeVariant: "secondary",
      isFilter: true,
      filterValue: "ANNOUNCEMENT",
    },
    {
      id: "surat",
      label: "Layanan Surat RT",
      href: "/surat",
      icon: FileText,
      badge: "3 Baru",
      badgeVariant: "outline",
    },
    {
      id: "kas",
      label: "Kas & Financial RT",
      href: "/kas",
      icon: Wallet,
      badge: "85%",
    },
    {
      id: "warga",
      label: "Data Kependudukan & GIS",
      href: "/kependudukan",
      icon: Users,
      badge: "GIS",
      badgeVariant: "secondary",
    },
    {
      id: "commerce",
      label: "Warga Commerce (Pasar)",
      href: "/feed?filter=COMMERCE",
      icon: ShoppingBag,
      isFilter: true,
      filterValue: "COMMERCE",
    },
    {
      id: "sos",
      label: "Tombol SOS / Darurat",
      href: "/dashboard",
      icon: AlertTriangle,
      badge: "SIAGA",
      badgeVariant: "destructive",
    },
  ];

  const renderNavContent = () => (
    <div className="flex flex-col justify-between h-full space-y-6">
      <div className="space-y-5">
        {/* User & Community Profile Card */}
        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#131F17] border border-neutral-200/80 dark:border-neutral-800/80 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden ring-2 ring-emerald-500/40 shrink-0">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                alt="User Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate flex items-center gap-1">
                {userFullName}
                <ShieldCheck className="w-4 h-4 text-emerald-500 fill-emerald-500/20 shrink-0" />
              </h3>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                {userRole}
              </p>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block mt-0.5">
                {activeCommunityName}
              </span>
            </div>
          </div>

          {/* Tenant Status Pill */}
          <div className="pt-2 border-t border-neutral-200/80 dark:border-neutral-800/80 flex items-center justify-between text-xs">
            <span className="text-[11px] font-medium text-slate-500">Status Komunitas</span>
            {isTenantActive ? (
              <Badge className="bg-emerald-600 text-white text-[9px]">AKTIF • RT STANDARD</Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[9px]">
                PENDING PAYMENT
              </Badge>
            )}
          </div>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1">
          <p className="text-[10px] font-extrabold tracking-wider uppercase text-slate-400 px-3 mb-2">
            Main Navigation Menu
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isFilterActive = item.isFilter && onSelectFilter && activeFilter === item.filterValue;
            const isRouteActive = !item.isFilter && pathname === item.href;
            const isActive = isFilterActive || isRouteActive;

            const handleClick = (e: React.MouseEvent) => {
              if (item.isFilter && onSelectFilter && item.filterValue) {
                if (pathname !== "/feed") {
                  router.push(`/feed?filter=${item.filterValue}`);
                } else {
                  onSelectFilter(item.filterValue);
                }
              }
              onCloseMobileDrawer();
            };

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={handleClick}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                    : "text-slate-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-emerald-600 dark:text-emerald-400"}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <Badge
                    variant={item.badgeVariant || "default"}
                    className={`text-[9px] px-1.5 py-0.5 ${
                      isActive ? "bg-white/20 text-white border-transparent" : ""
                    }`}
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Theme Toggle & Logout Button */}
      <div className="pt-4 border-t border-neutral-200/80 dark:border-neutral-800/80 space-y-2">
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 text-xs">
          <span className="font-semibold text-slate-600 dark:text-slate-300">Mode Tampilan</span>
          <ThemeToggle />
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-rose-500 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar Sesi (Logout)</span>
        </button>

        <p className="text-[10px] text-center text-slate-400">
          WargaIn Sarana Digital © 2026
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. DESKTOP PERMANENT SIDEBAR (>= md / lg) */}
      <aside className="hidden md:block md:w-72 shrink-0 sticky top-20 h-[calc(100vh-90px)] overflow-y-auto pr-2">
        {renderNavContent()}
      </aside>

      {/* 2. MOBILE DRAWER OVERLAY (< md) */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobileDrawer}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs md:hidden"
            />

            {/* Slide-over Drawer */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-white dark:bg-[#0B130E] border-r border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col p-5 overflow-y-auto md:hidden"
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <Image
                    src="/images/logo.png"
                    alt="WargaIn Logo"
                    width={28}
                    height={28}
                    className="w-7 h-7 object-contain"
                  />
                  <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                    WargaIn Main Menu
                  </span>
                </div>
                <button
                  onClick={onCloseMobileDrawer}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {renderNavContent()}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
