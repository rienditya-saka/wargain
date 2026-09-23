"use client";

import * as React from "react";
import { toast } from "sonner";
import { Smartphone, Share, PlusSquare, Loader2, BellRing, X } from "lucide-react";
import { currentSubscription, disablePush, enablePush, pushSupport, PushSupport, sendTestPush, syncSubscription } from "@/lib/push/client";

function usePushState(userId?: string | null) {
  const [support, setSupport] = React.useState<PushSupport>("unsupported");
  const [enabled, setEnabled] = React.useState(false);
  const [permission, setPermission] = React.useState<NotificationPermission | "n/a">("n/a");
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const s = pushSupport();
    setSupport(s);
    if (s !== "supported") {
      setReady(true);
      return;
    }
    setPermission(Notification.permission);
    currentSubscription()
      .then((sub) => setEnabled(!!sub && Notification.permission === "granted"))
      .finally(() => setReady(true));
    if (userId) syncSubscription(userId);
    const onMsg = (e: MessageEvent) => e.data?.type === "PUSH_SUBSCRIPTION_CHANGED" && userId && enablePush(userId).catch(() => {});
    navigator.serviceWorker?.addEventListener("message", onMsg);
    return () => navigator.serviceWorker?.removeEventListener("message", onMsg);
  }, [userId]);

  return { support, enabled, setEnabled, permission, setPermission, ready };
}

function IosInstallHint() {
  return (
    <div className="rounded-xl bg-sky-500/10 border border-sky-500/30 p-3 text-[11px] text-sky-800 dark:text-sky-200 space-y-1.5">
      <p className="font-extrabold">iPhone: pasang WargaIn di Layar Utama dulu</p>
      <ol className="space-y-1 list-decimal pl-4">
        <li className="flex items-center gap-1">Buka di Safari, ketuk <Share className="w-3.5 h-3.5 inline" /> Bagikan</li>
        <li className="flex items-center gap-1">Pilih <PlusSquare className="w-3.5 h-3.5 inline" /> "Tambah ke Layar Utama"</li>
        <li>Buka WargaIn dari ikon di Layar Utama, lalu aktifkan notifikasi di sini</li>
      </ol>
    </div>
  );
}

// Settings row inside the notification panel.
export function PushToggle({ userId }: { userId: string }) {
  const { support, enabled, setEnabled, permission, setPermission, ready } = usePushState(userId);
  const [busy, setBusy] = React.useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      if (enabled) {
        await disablePush(userId);
        setEnabled(false);
        toast.success("Notifikasi di perangkat ini dimatikan.");
      } else {
        const r = await enablePush(userId);
        setEnabled(true);
        setPermission("granted");
        toast.success(`Notifikasi aktif di perangkat ini${r.devices > 1 ? ` (${r.devices} perangkat)` : ""}.`);
      }
    } catch (e: any) {
      if (typeof Notification !== "undefined") setPermission(Notification.permission);
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    try {
      await sendTestPush(userId);
      toast.success("Tes terkirim, cek notifikasi HP Anda.");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (!ready) return null;
  if (support === "ios-needs-install") return <div className="px-3 pb-3"><IosInstallHint /></div>;
  if (support === "unsupported") return <p className="px-4 pb-3 text-[11px] text-slate-500">Browser ini belum mendukung notifikasi push. Coba Chrome / Edge / Safari terbaru.</p>;

  return (
    <div className="mx-3 mb-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center"><Smartphone className="w-4 h-4" /></span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-extrabold">Notifikasi di HP ini</p>
          <p className="text-[10px] text-slate-500">{enabled ? "Aktif, tetap muncul walau aplikasi ditutup" : permission === "denied" ? "Diblokir di pengaturan browser" : "Muncul walau aplikasi ditutup"}</p>
        </div>
        <button onClick={toggle} disabled={busy || permission === "denied"} className={`relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 ${enabled ? "bg-emerald-600" : "bg-neutral-300 dark:bg-neutral-700"}`} aria-pressed={enabled} aria-label="Aktifkan notifikasi push">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white absolute top-[5px] left-[15px]" /> : <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${enabled ? "left-[22px]" : "left-0.5"}`} />}
        </button>
      </div>
      {permission === "denied" && <p className="text-[10px] text-red-600">Buka pengaturan situs di browser → Notifikasi → Izinkan, lalu muat ulang halaman.</p>}
      {enabled && <button onClick={test} className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">Kirim notifikasi tes →</button>}
    </div>
  );
}

// One-time nudge shown under the bell for people who haven't decided yet.
export function PushPrompt({ userId }: { userId: string }) {
  const { support, enabled, setEnabled, permission, ready } = usePushState(userId);
  const [hidden, setHidden] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const KEY = "wargain_push_prompt_dismissed";

  React.useEffect(() => {
    if (!ready) return;
    let dismissed = false;
    try {
      dismissed = !!localStorage.getItem(KEY);
    } catch {
      // storage blocked: just show it
    }
    const undecided = support === "ios-needs-install" || (support === "supported" && !enabled && permission === "default");
    setHidden(dismissed || !undecided);
  }, [ready, support, enabled, permission]);

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // ignore
    }
  };

  const enable = async () => {
    setBusy(true);
    try {
      await enablePush(userId);
      setEnabled(true);
      toast.success("Notifikasi aktif! Pengumuman & darurat akan muncul di HP ini.");
      dismiss();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (hidden) return null;
  return (
    <div className="fixed sm:absolute z-[55] inset-x-3 sm:inset-x-auto top-16 sm:top-11 sm:right-0 sm:w-80 rounded-2xl border border-emerald-500/40 bg-white dark:bg-[#0F1A13] shadow-2xl p-4 space-y-3">
      <button onClick={dismiss} className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400" aria-label="Nanti saja"><X className="w-4 h-4" /></button>
      <div className="flex gap-3 pr-6">
        <span className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0"><BellRing className="w-5 h-5" /></span>
        <div>
          <p className="text-sm font-extrabold">Jangan ketinggalan kabar RT</p>
          <p className="text-[11px] text-slate-500">Pengumuman, pengingat posyandu, tamu di gerbang & sinyal darurat langsung muncul di HP.</p>
        </div>
      </div>
      {support === "ios-needs-install" ? (
        <IosInstallHint />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={dismiss} className="min-h-[40px] rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold">Nanti</button>
          <button onClick={enable} disabled={busy} className="min-h-[40px] rounded-xl bg-emerald-600 text-white text-xs font-black disabled:opacity-50">{busy ? "..." : "Aktifkan"}</button>
        </div>
      )}
    </div>
  );
}
