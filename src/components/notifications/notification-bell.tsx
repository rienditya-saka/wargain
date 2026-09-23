"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck, X, Settings2, ChevronLeft, Siren } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "@/lib/supabase-client";
import { MODULES, ModuleKey, NotificationPriority, PRIORITY_STYLE, typeMeta } from "@/lib/notifications/registry";
import { PushPrompt, PushToggle } from "./push-toggle";

interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  module?: string;
  priority?: NotificationPriority;
  actorName?: string | null;
  readAt?: string | null;
  createdAt: string;
}

type View = "list" | "settings";
type Tab = "ALL" | "UNREAD" | "IMPORTANT";

function timeAgo(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} mnt`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} jam`;
  return `${Math.floor(h / 24)} hr`;
}

function dayGroup(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Hari ini";
  if (d.toDateString() === yest.toDateString()) return "Kemarin";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long" });
}

const moduleOf = (n: AppNotification) => (n.module && n.module in MODULES ? (n.module as ModuleKey) : typeMeta(n.type).module);
const priorityOf = (n: AppNotification) => (n.priority as NotificationPriority) ?? typeMeta(n.type).priority;

function playSiren() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    gain.gain.value = 0.07;
    osc.connect(gain).connect(ctx.destination);
    const t = ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      osc.frequency.setValueAtTime(880, t + i * 0.5);
      osc.frequency.linearRampToValueAtTime(1320, t + i * 0.5 + 0.25);
      osc.frequency.linearRampToValueAtTime(880, t + i * 0.5 + 0.5);
    }
    osc.start(t);
    osc.stop(t + 2);
    osc.onended = () => ctx.close();
  } catch {
    // audio needs a prior user gesture on some browsers
  }
}

export function NotificationBell({ userId, className }: { userId?: string | null; className?: string }) {
  const router = useRouter();
  const [items, setItems] = React.useState<AppNotification[]>([]);
  const [unread, setUnread] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState<View>("list");
  const [tab, setTab] = React.useState<Tab>("ALL");
  const [urgent, setUrgent] = React.useState<AppNotification | null>(null);
  const [ring, setRing] = React.useState(0);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`);
      const json = await res.json();
      if (!res.ok) return;
      setItems(json.notifications ?? []);
      setUnread(json.unread ?? 0);
    } catch {
      // offline: keep previous list
    }
  }, [userId]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (!userId) return;
    const channel = supabaseClient
      .channel(`notif:${userId}`)
      .on("postgres_changes" as any, { event: "INSERT", schema: "public", table: "notifications", filter: `userId=eq.${userId}` }, (payload: any) => {
        const n = payload.new as AppNotification;
        setItems((list) => (list.some((x) => x.id === n.id) ? list : [n, ...list].slice(0, 50)));
        setUnread((u) => u + 1);
        setRing((r) => r + 1);
        if (priorityOf(n) === "URGENT") {
          setUrgent(n);
          playSiren();
          navigator.vibrate?.([400, 150, 400, 150, 400]);
        } else {
          toast(n.title, {
            description: n.body,
            icon: MODULES[moduleOf(n)]?.emoji,
            action: n.link ? { label: "Lihat", onClick: () => router.push(n.link!) } : undefined,
          });
        }
      })
      .subscribe();
    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [userId, router]);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const markRead = async (ids?: string[]) => {
    if (!userId) return;
    const now = new Date().toISOString();
    const newlyRead = ids ? items.filter((n) => ids.includes(n.id) && !n.readAt).length : unread;
    setItems((list) => list.map((n) => (!ids || ids.includes(n.id) ? { ...n, readAt: n.readAt ?? now } : n)));
    setUnread((u) => Math.max(0, u - newlyRead));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids ? { userId, ids } : { userId, all: true }),
    }).catch(() => {});
  };

  const openItem = (n: AppNotification) => {
    if (!n.readAt) markRead([n.id]);
    setOpen(false);
    setUrgent(null);
    if (n.link) router.push(n.link);
  };

  if (!userId) return null;

  const shown = items.filter((n) => (tab === "UNREAD" ? !n.readAt : tab === "IMPORTANT" ? ["HIGH", "URGENT"].includes(priorityOf(n)) : true));
  const groups: { label: string; items: AppNotification[] }[] = [];
  shown.forEach((n) => {
    const g = dayGroup(n.createdAt);
    const last = groups[groups.length - 1];
    if (last?.label === g) last.items.push(n);
    else groups.push({ label: g, items: [n] });
  });

  return (
    <>
      <div ref={panelRef} className={`relative ${className ?? ""}`}>
        <motion.button
          key={ring}
          animate={ring ? { rotate: [0, -18, 16, -10, 8, 0] } : undefined}
          transition={{ duration: 0.6 }}
          onClick={() => {
            setOpen((v) => !v);
            setView("list");
            if (!open) load();
          }}
          className="relative w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#131F17] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors"
          aria-label={unread ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"}
          aria-expanded={open}
        >
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-[#FBFBF9] dark:ring-[#0B130E]">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </motion.button>

        {!open && <PushPrompt userId={userId} />}

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-16 sm:top-11 sm:right-0 sm:w-[400px] z-[60] rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0F1A13] shadow-2xl overflow-hidden"
              role="dialog"
              aria-label="Notifikasi"
            >
              {view === "settings" ? (
                <Preferences userId={userId} onBack={() => setView("list")} />
              ) : (
                <>
                  <div className="flex items-center justify-between px-4 pt-3 pb-2">
                    <p className="text-sm font-extrabold">Notifikasi</p>
                    <div className="flex items-center gap-0.5">
                      {unread > 0 && (
                        <button onClick={() => markRead()} className="h-8 px-2 rounded-lg text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-1">
                          <CheckCheck className="w-3.5 h-3.5" /> Baca semua
                        </button>
                      )}
                      <button onClick={() => setView("settings")} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Pengaturan notifikasi">
                        <Settings2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 sm:hidden" aria-label="Tutup">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-1 px-4 pb-2">
                    {([["ALL", "Semua"], ["UNREAD", `Belum dibaca${unread ? ` (${unread})` : ""}`], ["IMPORTANT", "Penting"]] as [Tab, string][]).map(([k, label]) => (
                      <button key={k} onClick={() => setTab(k)} className={`h-7 px-2.5 rounded-full text-[11px] font-bold ${tab === k ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-neutral-100 dark:bg-neutral-800 text-slate-500"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="max-h-[65vh] sm:max-h-[440px] overflow-y-auto border-t border-neutral-100 dark:border-neutral-800">
                    {shown.length === 0 && (
                      <div className="px-4 py-12 text-center space-y-1.5">
                        <p className="text-3xl">🔔</p>
                        <p className="text-xs text-slate-500">{tab === "UNREAD" ? "Semua sudah dibaca." : "Belum ada notifikasi."}</p>
                      </div>
                    )}
                    {groups.map((g) => (
                      <div key={g.label}>
                        <p className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">{g.label}</p>
                        <ul>
                          {g.items.map((n) => {
                            const pr = priorityOf(n);
                            const mod = MODULES[moduleOf(n)];
                            return (
                              <li key={n.id}>
                                <button
                                  onClick={() => openItem(n)}
                                  className={`w-full text-left px-4 py-2.5 flex gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors ${n.readAt ? "" : "bg-emerald-500/[0.05]"} ${
                                    pr === "URGENT" && !n.readAt ? "bg-red-500/[0.07]" : ""
                                  }`}
                                >
                                  <span className={`relative w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-lg shrink-0 ${PRIORITY_STYLE[pr].ring}`}>
                                    {mod?.emoji ?? "🔔"}
                                    {!n.readAt && <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-[#0F1A13] ${PRIORITY_STYLE[pr].dot}`} />}
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-bold text-slate-400 truncate">{mod?.label}</span>
                                      {(pr === "URGENT" || pr === "HIGH") && (
                                        <span className={`px-1.5 rounded text-[9px] font-black ${pr === "URGENT" ? "bg-red-600 text-white" : "bg-amber-400 text-slate-900"}`}>{PRIORITY_STYLE[pr].label.toUpperCase()}</span>
                                      )}
                                      <span className="ml-auto text-[10px] text-slate-400 shrink-0">{timeAgo(n.createdAt)}</span>
                                    </span>
                                    <span className={`block text-xs leading-snug mt-0.5 ${n.readAt ? "font-semibold text-slate-600 dark:text-slate-300" : "font-extrabold text-slate-900 dark:text-white"}`}>
                                      {n.title}
                                    </span>
                                    {n.body && <span className="block text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.body}</span>}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {urgent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-red-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" role="alertdialog" aria-label="Notifikasi darurat">
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }} className="w-full max-w-md rounded-3xl bg-red-600 text-white p-5 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <span className="relative w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                  <span className="absolute inset-0 rounded-2xl bg-white/20 animate-ping" />
                  <Siren className="w-7 h-7 relative" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-black tracking-widest opacity-90">DARURAT · {MODULES[moduleOf(urgent)]?.label.toUpperCase()}</p>
                  <p className="text-base font-black leading-snug">{urgent.title}</p>
                </div>
              </div>
              {urgent.body && <p className="text-sm opacity-95">{urgent.body}</p>}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { markRead([urgent.id]); setUrgent(null); }} className="min-h-[46px] rounded-xl bg-white/15 hover:bg-white/25 text-sm font-bold">Tutup</button>
                <button onClick={() => openItem(urgent)} className="min-h-[46px] rounded-xl bg-white text-red-700 text-sm font-black">Lihat sekarang</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Preferences({ userId, onBack }: { userId: string; onBack: () => void }) {
  const [muted, setMuted] = React.useState<string[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    fetch(`/api/notifications/preferences?userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((j) => setMuted(j.mutedModules ?? []))
      .finally(() => setLoaded(true));
  }, [userId]);

  const toggle = async (m: string) => {
    const next = muted.includes(m) ? muted.filter((x) => x !== m) : [...muted, m];
    setMuted(next);
    await fetch("/api/notifications/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, mutedModules: next }),
    }).catch(() => toast.error("Gagal menyimpan pengaturan."));
  };

  return (
    <div>
      <div className="flex items-center gap-2 px-3 py-3 border-b border-neutral-100 dark:border-neutral-800">
        <button onClick={onBack} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label="Kembali">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-extrabold">Pengaturan Notifikasi</p>
      </div>
      <div className="pt-3">
        <PushToggle userId={userId} />
      </div>
      <ul className="p-2">
        {(Object.keys(MODULES) as ModuleKey[]).filter((m) => m !== "SISTEM").map((m) => {
          const on = !muted.includes(m);
          return (
            <li key={m}>
              <button onClick={() => toggle(m)} disabled={!loaded} className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                <span className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-lg">{MODULES[m].emoji}</span>
                <span className="flex-1 text-left text-xs font-bold">{MODULES[m].label}</span>
                <span className={`relative w-10 h-6 rounded-full transition-colors ${on ? "bg-emerald-600" : "bg-neutral-300 dark:bg-neutral-700"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="px-4 pb-4 text-[11px] text-slate-500">Notifikasi darurat (panic, siaga bencana, anak/lansia hilang) selalu dikirim walaupun modulnya dimatikan.</p>
    </div>
  );
}
