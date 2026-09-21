"use client";

import * as React from "react";
import Link from "next/link";
import { Clock, MessageSquare, ArrowUpRight } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Footer() {
  const [localTime, setLocalTime] = React.useState<string>("");

  React.useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const wib = now.toLocaleTimeString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setLocalTime(`${wib} WIB`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="bg-neutral-950 text-neutral-300 border-t border-neutral-800 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 4-Column Responsive Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-14">
          {/* Column 1: Brand Info (Spans 2 on lg) */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center">
                <img
                  src="/images/logo.png"
                  alt="WargaIn Logo"
                  className="w-full h-full object-contain filter drop-shadow-md"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xl tracking-tight text-white leading-tight">
                  Warga<span className="text-emerald-400">In</span>
                </span>
                <span className="text-[10px] text-neutral-400 font-medium tracking-wider uppercase -mt-0.5">
                  Sistem Informasi RT / RW Digital
                </span>
              </div>
            </Link>

            <p className="text-sm text-neutral-400 leading-relaxed max-w-sm">
              Membangun peradaban rukun, transparan, dan berdaya dari tingkat tetangga. Solusi manajemen kas, satpam, dan bazar lokal.
            </p>

            {/* System Status Operational Indicator */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="w-2 h-2 rounded-full bg-emerald-400 -ml-4" />
              <span>All systems operational 🟢</span>
            </div>
          </div>

          {/* Column 2: Modul Produk */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Modul Produk</h4>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li>
                <a href="#features" className="hover:text-emerald-400 transition-colors">
                  Kas Warga & QRIS
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-emerald-400 transition-colors">
                  E-Surat RT / RW Digital
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-emerald-400 transition-colors">
                  QR Pass Gatekeeper Satpam
                </a>
              </li>
              <li>
                <a href="#commerce" className="hover:text-emerald-400 transition-colors">
                  Warga Commerce (Bazar)
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-emerald-400 transition-colors">
                  Panic Button SOS
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Ekosistem */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Ekosistem</h4>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li>
                <a href="#pulse" className="hover:text-emerald-400 transition-colors">
                  Warga Pulse News
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-emerald-400 transition-colors">
                  Pedoman RT/RW Digital
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-emerald-400 transition-colors">
                  Komparasi vs Excel/WA
                </a>
              </li>
            </ul>

            {/* App Badges */}
            <div className="pt-2 flex flex-col gap-2">
              <span className="text-[11px] text-neutral-500 font-semibold">Mobile App Android & iOS</span>
              <div className="flex gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-[10px] font-mono text-neutral-300">
                  Google Play
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-[10px] font-mono text-neutral-300">
                  App Store
                </span>
              </div>
            </div>
          </div>

          {/* Column 4: Legal & Kontak */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Legal & Bantuan</h4>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li>
                <a href="#" className="hover:text-emerald-400 transition-colors">
                  Kebijakan Privasi (UU PDP)
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-emerald-400 transition-colors">
                  Syarat & Ketentuan Layanan
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/628123456789"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1.5 text-emerald-400 font-semibold"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Support WhatsApp 24/7
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-1.5">
            <span>© 2026 WargaIn Inc. Seluruh hak cipta dilindungi undang-undang.</span>
          </div>

          {/* Time & Theme Controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 font-mono text-neutral-400 bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{localTime || "16:26 WIB"}</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
