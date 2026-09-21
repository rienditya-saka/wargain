"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SubscriptionPaywallModal from "@/components/auth/SubscriptionPaywallModal";
import { getClientSession, setClientSession, clearClientSession } from "@/lib/auth-session";
import { SessionTenant } from "@/lib/types/auth";
import { ShieldAlert, LogOut, Menu, Bell, Search, ShieldCheck } from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Image from "next/image";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [session, setSession] = useState<SessionTenant | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const refreshSession = () => {
    const current = getClientSession();
    setSession(current);
  };

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

    const handleSessionUpdate = () => {
      refreshSession();
    };

    window.addEventListener("wargain_session_updated", handleSessionUpdate);
    return () => {
      window.removeEventListener("wargain_session_updated", handleSessionUpdate);
    };
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#FBFBF9] dark:bg-[#0B130E] flex items-center justify-center">
        <div className="text-sm font-bold text-emerald-600 animate-pulse">
          Memuat sesi WargaIn...
        </div>
      </div>
    );
  }

  // Fallback demo session
  const activeSession: SessionTenant = session || {
    userId: "usr_demo",
    email: "admin@wargain.id",
    fullName: "Bpk. H. Bambang Kurniawan",
    communityId: "comm_demo",
    communityName: "RT 04 / RW 09 Kel. Mekar",
    communitySlug: "rt04-rw09",
    role: "TENANT_ADMIN",
    isTenantActive: false, // Default locked paywall unless paid
    planTier: "RT_STANDARD",
    planStatus: "PENDING_PAYMENT",
  };

  const isActive = activeSession.isTenantActive;

  const handleLogout = () => {
    clearClientSession();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#FBFBF9] dark:bg-[#0B130E] text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* 1. Header Top Navbar */}
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

            <Link href="/feed" className="flex items-center gap-2 group">
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
                  {activeSession.communityName}
                </span>
              </div>
            </Link>
          </div>

          {/* Center Status Badge */}
          <div className="flex items-center gap-2 text-xs font-bold">
            {isActive ? (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                AKTIF ({activeSession.planTier})
              </span>
            ) : (
              <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> PENDING PAYMENT
              </span>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-rose-600 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-rose-500/40 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Content Wrapper */}
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-6 w-full flex-1">
        <div className="flex flex-col md:flex-row lg:gap-6 items-start w-full">
          
          {/* Global Main Menu Sidebar */}
          <AppSidebar
            session={activeSession}
            isMobileDrawerOpen={isMobileDrawerOpen}
            onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
          />

          {/* Page Content Container with Paywall Overlay if locked */}
          <main className="flex-1 w-full min-w-0 relative">
            <div
              className={`transition-all duration-300 ${
                !isActive
                  ? "filter blur-md grayscale-[40%] pointer-events-none select-none max-h-screen overflow-hidden"
                  : ""
              }`}
              aria-hidden={!isActive}
            >
              {children}
            </div>

            {/* Paywall Overlay Modal */}
            {!isActive && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto pt-16">
                <SubscriptionPaywallModal
                  communityId={activeSession.communityId}
                  communityName={activeSession.communityName}
                  currentTier={activeSession.planTier}
                />
              </div>
            )}
          </main>

        </div>
      </div>
    </div>
  );
}
