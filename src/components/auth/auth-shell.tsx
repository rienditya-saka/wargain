"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

// Shared stage for /login and /register: animated aurora background, a live "what's inside" showcase
// on wide screens, and a compact hero + rising form card on phones.

export function Aurora() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#050b08]" />
      <motion.div
        className="absolute -top-40 -left-32 w-[640px] h-[640px] rounded-full bg-emerald-500/30 blur-[120px]"
        animate={{ x: [0, 80, -20, 0], y: [0, 40, 90, 0], scale: [1, 1.15, 0.95, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/3 -right-40 w-[560px] h-[560px] rounded-full bg-teal-400/20 blur-[120px]"
        animate={{ x: [0, -90, 20, 0], y: [0, -60, 40, 0], scale: [1, 0.9, 1.1, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-48 left-1/4 w-[620px] h-[620px] rounded-full bg-sky-500/15 blur-[130px]"
        animate={{ x: [0, 60, -60, 0], y: [0, -40, 0, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 opacity-[0.18] [background-image:radial-gradient(rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
    </div>
  );
}

export function Brand({ size = 40 }: { size?: number }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 group shrink-0">
      <span className="relative">
        <span className="absolute inset-0 rounded-2xl bg-emerald-400/40 blur-md group-hover:bg-emerald-400/60 transition-colors" />
        <Image src="/images/logo.png" alt="WargaIn" width={size} height={size} priority className="relative object-contain group-hover:scale-105 transition-transform" style={{ width: size, height: size }} />
      </span>
      <span className="font-black text-xl tracking-tight text-white">
        Warga<span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">In</span>
      </span>
    </Link>
  );
}

// ───────────── Showcase ─────────────

interface Slide {
  emoji: string;
  label: string;
  tone: string;
  title: string;
  body: React.ReactNode;
}

const SLIDES: Slide[] = [
  {
    emoji: "🗳️",
    label: "Polling warga · live",
    tone: "from-violet-500/30 to-sky-500/10 border-violet-400/30",
    title: "Setuju tambah satpam malam?",
    body: (
      <div className="space-y-1.5">
        {[["Setuju", 78], ["Tidak setuju", 22]].map(([l, v]) => (
          <div key={l as string} className="relative h-8 rounded-lg bg-white/5 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ duration: 1.1, ease: "easeOut" }} className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500/60 to-sky-400/40" />
            <div className="relative h-full px-3 flex items-center justify-between text-xs font-bold"><span>{l}</span><span>{v}%</span></div>
          </div>
        ))}
        <p className="text-[10px] text-white/50">27 dari 43 rumah memilih · 1 rumah 1 suara</p>
      </div>
    ),
  },
  {
    emoji: "🚨",
    label: "Keamanan · SOS",
    tone: "from-red-500/30 to-orange-500/10 border-red-400/30",
    title: "Panic Blok C-03 direspon",
    body: (
      <div className="flex items-center gap-3">
        <span className="relative flex w-10 h-10">
          <span className="absolute inset-0 rounded-full bg-red-500/50 animate-ping" />
          <span className="relative w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-lg">🛡️</span>
        </span>
        <div className="text-xs">
          <p className="font-bold">Satpam Pos 1 menuju lokasi</p>
          <p className="text-white/60">GPS aktif · direspon dalam 1 mnt 42 dtk</p>
        </div>
      </div>
    ),
  },
  {
    emoji: "💰",
    label: "Kas & Iuran",
    tone: "from-amber-400/30 to-emerald-500/10 border-amber-300/30",
    title: "Iuran Oktober 85% lunas",
    body: (
      <div className="space-y-2">
        <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: "85%" }} transition={{ duration: 1.2 }} className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400" />
        </div>
        <div className="flex justify-between text-[11px] text-white/70"><span>Rp 12.750.000 masuk</span><span>QRIS · Transfer · Tunai</span></div>
      </div>
    ),
  },
  {
    emoji: "🛍️",
    label: "Pasar Warga",
    tone: "from-sky-500/30 to-emerald-500/10 border-sky-400/30",
    title: "Pesanan baru: Nasi Uduk Bu Lina",
    body: (
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/70">2× Komplit · antar ke B-12</span>
        <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-200 font-black">Rp 30.000</span>
      </div>
    ),
  },
  {
    emoji: "👶",
    label: "Posyandu & KMS",
    tone: "from-pink-500/30 to-sky-500/10 border-pink-400/30",
    title: "Alfatih naik 600 g bulan ini",
    body: <p className="text-xs text-white/70">Status gizi baik · Imunisasi DPT-3 jatuh tempo minggu depan ⏰</p>,
  },
  {
    emoji: "🏛️",
    label: "Musyawarah",
    tone: "from-teal-500/30 to-sky-500/10 border-teal-400/30",
    title: "Rapat warga · 19 rumah hadir",
    body: <p className="text-xs text-white/70">Absen scan QR · voting live · notulen & keputusan langsung ke HP warga</p>,
  },
];

function useCycle(length: number, ms: number) {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % length), ms);
    return () => clearInterval(t);
  }, [length, ms]);
  return i;
}

function SlideCard({ s }: { s: Slide }) {
  return (
    <div className={`rounded-3xl border bg-gradient-to-br ${s.tone} backdrop-blur-xl p-4 shadow-2xl shadow-black/40 text-white`}>
      <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-white/70 uppercase">
        <span className="text-base">{s.emoji}</span> {s.label}
        <span className="ml-auto flex items-center gap-1 normal-case tracking-normal font-bold text-emerald-300"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> baru saja</span>
      </div>
      <p className="text-sm font-extrabold mt-2 mb-3">{s.title}</p>
      {s.body}
    </div>
  );
}

export function Showcase({ headline, sub }: { headline: React.ReactNode; sub: string }) {
  const i = useCycle(SLIDES.length, 3200);
  const back1 = SLIDES[(i + 1) % SLIDES.length];
  const back2 = SLIDES[(i + 2) % SLIDES.length];
  return (
    <div className="relative h-full flex flex-col justify-between py-4">
      <div>
        <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-200 text-[11px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Super-app RT/RW · cluster, kavling & kampung
        </motion.span>
        <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mt-5 text-4xl xl:text-5xl font-black leading-[1.05] tracking-tight text-white">
          {headline}
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mt-4 text-base text-white/65 max-w-md leading-relaxed">
          {sub}
        </motion.p>
      </div>

      {/* stacked live cards */}
      {/* stack: the next two cards peek out above the live one */}
      <div className="relative h-[270px] max-w-md my-8 pt-8">
        <motion.div key={`b2-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 0.35, y: -30, scale: 0.86 }} className="absolute inset-x-0 top-8 blur-[1px] origin-top">
          <SlideCard s={back2} />
        </motion.div>
        <motion.div key={`b1-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 0.6, y: -15, scale: 0.93 }} className="absolute inset-x-0 top-8 origin-top">
          <SlideCard s={back1} />
        </motion.div>
        <AnimatePresence mode="popLayout">
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -30, scale: 1.04, rotate: -1.5 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, y: 60, scale: 0.9 }}
            transition={{ type: "spring", damping: 20, stiffness: 180 }}
            className="absolute inset-x-0 top-8"
          >
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
              <SlideCard s={SLIDES[i]} />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-md">
        {[["12+", "modul warga"], ["24/7", "SOS & ronda"], ["100%", "Bahasa Indonesia"]].map(([v, l]) => (
          <div key={l} className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur px-3 py-3">
            <p className="text-xl font-black text-white">{v}</p>
            <p className="text-[10px] font-semibold text-white/50">{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ticker for the phone hero
export function MobileTicker() {
  const i = useCycle(SLIDES.length, 2600);
  const s = SLIDES[i];
  return (
    <div className="relative h-9 overflow-hidden">
      {/* crossfade (no gap between slides) */}
      <AnimatePresence initial={false}>
        <motion.div key={i} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ duration: 0.35 }} className="absolute left-0 top-0 inline-flex items-center gap-2 px-3 h-9 rounded-full bg-white/10 border border-white/10 text-[11px] font-bold text-white/90 max-w-full">
          <span>{s.emoji}</span>
          <span className="truncate">{s.title}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ───────────── Form primitives ─────────────

export function FloatingInput({
  icon: Icon,
  label,
  trailing,
  className = "",
  onFocus,
  onBlur,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ElementType; label: string; trailing?: React.ReactNode }) {
  const id = React.useId();
  const [focused, setFocused] = React.useState(false);
  // float the label from state (not :placeholder-shown), so autofill / password managers also work
  const ref = React.useRef<HTMLInputElement>(null);
  const [autofilled, setAutofilled] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setAutofilled(!!ref.current?.matches(":-webkit-autofill")), 400);
    return () => clearTimeout(t);
  }, []);
  const up = focused || autofilled || String(props.value ?? "").length > 0;
  return (
    <div className={`group relative ${className}`}>
      <Icon className={`w-[18px] h-[18px] absolute left-4 top-1/2 -translate-y-1/2 transition-colors pointer-events-none ${focused ? "text-emerald-300" : "text-white/35"}`} />
      <input
        ref={ref}
        id={id}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        placeholder={props.placeholder ?? ""}
        className={`w-full h-14 pl-12 pr-12 pt-5 pb-1.5 rounded-2xl bg-white/[0.05] border border-white/10 text-[15px] text-white outline-none focus:border-emerald-400/70 focus:bg-white/[0.08] focus:ring-4 focus:ring-emerald-500/15 transition-all ${focused ? "placeholder:text-white/25" : "placeholder:text-transparent"}`}
      />
      <label
        htmlFor={id}
        className={`absolute left-12 pointer-events-none transition-all duration-200 ${up ? "top-4 -translate-y-1/2 text-[11px] font-bold" : "top-1/2 -translate-y-1/2 text-sm"} ${focused ? "text-emerald-300" : "text-white/45"}`}
      >
        {label}
      </label>
      {trailing && <div className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</div>}
    </div>
  );
}

export function GlowButton({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`group relative w-full h-14 rounded-2xl overflow-hidden font-black text-[15px] text-white disabled:opacity-60 active:scale-[0.99] transition-transform ${className}`}
    >
      <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 bg-[length:200%_100%] group-hover:bg-[position:100%_0] transition-[background-position] duration-700" />
      <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity shadow-[inset_0_0_30px_rgba(255,255,255,0.25)]" />
      <span className="absolute -inset-x-10 top-0 h-full w-1/3 -skew-x-12 bg-white/25 blur-md translate-x-[-150%] group-hover:translate-x-[450%] transition-transform duration-1000" />
      <span className="relative flex items-center justify-center gap-2">{children}</span>
    </button>
  );
}

export function AuthLayout({ showcase, children, topRight }: { showcase: React.ReactNode; children: React.ReactNode; topRight?: React.ReactNode }) {
  return (
    <div className="dark relative min-h-[100dvh] text-white font-sans overflow-x-hidden selection:bg-emerald-400/30">
      <Aurora />
      <div className="relative z-10 min-h-[100dvh] max-w-7xl mx-auto grid lg:grid-cols-[1.05fr_1fr] gap-10 px-4 sm:px-8">
        <aside className="hidden lg:flex flex-col py-8">
          <Brand />
          <div className="flex-1 mt-6">{showcase}</div>
          <p className="text-[11px] text-white/35">© 2026 WargaIn · Sarana Kreasi Digital</p>
        </aside>
        <main className="flex flex-col py-5 lg:py-8">
          <div className="flex items-center justify-between lg:justify-end gap-3">
            <div className="lg:hidden"><Brand size={34} /></div>
            {topRight}
          </div>
          <div className="flex-1 flex flex-col justify-center py-6">{children}</div>
          <p className="lg:hidden text-center text-[11px] text-white/35 pb-[env(safe-area-inset-bottom)]">© 2026 WargaIn · Data terenkripsi & terlindungi</p>
        </main>
      </div>
    </div>
  );
}

export function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 22, stiffness: 160 }}
      className={`relative rounded-[28px] p-[1px] bg-gradient-to-b from-white/20 via-white/5 to-emerald-400/20 shadow-2xl shadow-black/50 ${className}`}
    >
      <div className="rounded-[27px] bg-[#0a1510]/80 backdrop-blur-2xl p-5 sm:p-8">{children}</div>
    </motion.div>
  );
}
