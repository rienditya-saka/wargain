"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, X } from "lucide-react";
import { usePathname } from "next/navigation";

// "Pasang WargaIn" banner: native prompt on Android/Chrome, Add-to-Home-Screen hint on iOS
// (iOS only delivers Web Push to installed apps). Dismissal is remembered for 14 days.
const KEY = "wargain:install-dismissed";
const APP_PATHS = ["/feed", "/balai", "/sosial", "/keamanan", "/pasar", "/kas", "/surat", "/kartu", "/kependudukan"];

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function dismissedRecently() {
  try {
    const t = Number(localStorage.getItem(KEY) || 0);
    return Date.now() - t < 14 * 86_400_000;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const pathname = usePathname();
  const [evt, setEvt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = React.useState(false);
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
    if (standalone || dismissedRecently()) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    setIos(isIos);
    const t = setTimeout(() => setShow(true), 6000);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      clearTimeout(t);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {}
  };

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    const choice = await evt.userChoice;
    if (choice.outcome === "accepted") setShow(false);
    else dismiss();
    setEvt(null);
  };

  const inApp = APP_PATHS.some((p) => pathname?.startsWith(p));
  const visible = show && inApp && (!!evt || ios);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", damping: 24 }}
          className="md:hidden fixed z-[60] left-3 right-3 bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+5rem))] rounded-2xl bg-slate-900 text-white shadow-2xl p-3 flex items-center gap-3 border border-white/10"
          role="dialog"
          aria-label="Pasang aplikasi WargaIn"
        >
          <img src="/icons/icon-192.png" alt="" className="w-11 h-11 rounded-xl shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black">Pasang WargaIn di HP</p>
            {ios && !evt ? (
              <p className="text-[10px] text-white/70 leading-snug">Ketuk <Share className="inline w-3 h-3 -mt-0.5" /> Bagikan → <b>Tambah ke Layar Utama</b> agar notifikasi darurat & pengingat masuk.</p>
            ) : (
              <p className="text-[10px] text-white/70 leading-snug">Buka lebih cepat seperti aplikasi & terima notifikasi.</p>
            )}
          </div>
          {evt && (
            <button onClick={install} className="min-h-[38px] px-3 rounded-xl bg-emerald-500 text-white text-[11px] font-black flex items-center gap-1 shrink-0">
              <Download className="w-3.5 h-3.5" /> Pasang
            </button>
          )}
          <button onClick={dismiss} className="w-8 h-8 rounded-lg text-white/60 flex items-center justify-center shrink-0" aria-label="Tutup"><X className="w-4 h-4" /></button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
