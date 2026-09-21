"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, HeartPulse, Bike, Activity, ShoppingBag } from "lucide-react";

export function HeroSection() {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const loopCountRef = React.useRef(0);

  // Set smooth hardware-accelerated slow-motion playback rate
  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.75; // Native smooth frame divisor (butter smooth 60fps slow-mo)
    }
  }, []);

  const handleVideoEnded = () => {
    if (loopCountRef.current < 2) {
      // Plays 3 times total (0, 1, 2)
      loopCountRef.current += 1;
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.playbackRate = 0.75;
        videoRef.current.play();
      }
    } else {
      // After 3 loops, stop at initial frame
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.pause();
      }
    }
  };

  const scrollToOnboarding = () => {
    const onboardingEl = document.getElementById("onboarding");
    if (onboardingEl) {
      onboardingEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToPulse = () => {
    const el = document.getElementById("pulse");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative w-full h-[100dvh] min-h-[720px] overflow-hidden flex flex-col justify-between bg-slate-950 text-white">
      {/* 1. Fullscreen Video Background (Smooth Slow-mo GPU Accelerated & 3-Loop Limit) */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={handleVideoEnded}
          onLoadedData={() => {
            if (videoRef.current) {
              videoRef.current.playbackRate = 0.75;
            }
          }}
          className="w-full h-full object-cover scale-105 filter brightness-[0.88] saturate-[1.15] transform-gpu will-change-transform"
          poster="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=80"
        >
          <source src="/videos/hero-bg.mp4" type="video/mp4" />
        </video>
      </div>

      {/* 2. Scrim Overlay & Morning Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-black/35 to-slate-950/95 z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-amber-400/20 via-transparent to-transparent z-10 pointer-events-none" />

      {/* 3. Floating Interactive Radar Pins (ALL MOVED TO LEFT SIDE AS REQUESTED) */}

      {/* Pin 1 (Top Left - Senam Sehat PKK) */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="hidden xl:flex absolute left-8 top-28 z-20 items-center gap-3.5 bg-slate-900/85 backdrop-blur-xl border border-emerald-500/30 text-white p-3.5 rounded-2xl shadow-2xl max-w-xs cursor-pointer hover:scale-105 transition-transform"
        onClick={() => {
          const el = document.getElementById("pulse");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }}
      >
        <div className="p-2.5 bg-emerald-400 text-slate-950 rounded-xl font-bold shadow-md shrink-0">
          <HeartPulse className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <p className="text-xs text-emerald-300 font-bold uppercase tracking-wide">Senam Sehat PKK • Lapangan RW</p>
          </div>
          <p className="text-xs font-semibold leading-snug mt-0.5 text-white">
            Minggu 06.30 WIB: Aerobik & Zumba Ceria Warga 🏃‍♀️
          </p>
        </div>
      </motion.div>

      {/* Pin 2 (Middle Left - Gowes & Jogging Pagi, Moved from Right) */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="hidden xl:flex absolute left-8 top-56 z-20 items-center gap-3.5 bg-slate-900/85 backdrop-blur-xl border border-amber-500/30 text-white p-3.5 rounded-2xl shadow-2xl max-w-xs cursor-pointer hover:scale-105 transition-transform"
        onClick={() => {
          const el = document.getElementById("pulse");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }}
      >
        <div className="p-2.5 bg-amber-400 text-slate-950 rounded-xl font-bold shadow-md shrink-0">
          <Bike className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <p className="text-xs text-amber-300 font-bold uppercase tracking-wide">Gowes & Jogging Pagi</p>
          </div>
          <p className="text-xs font-semibold leading-snug mt-0.5 text-white">
            Pak RT Hendro: Tour De Klaster v2.0 Start 06.00 WIB 🚴‍♂️
          </p>
        </div>
      </motion.div>

      {/* Pin 3 (Lower Left - Fasilitas Olahraga RT, Moved from Right) */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="hidden xl:flex absolute left-8 bottom-36 z-20 items-center gap-3.5 bg-slate-900/85 backdrop-blur-xl border border-teal-500/30 text-white p-3 rounded-2xl shadow-2xl max-w-xs cursor-pointer hover:scale-105 transition-transform"
        onClick={() => {
          const el = document.getElementById("features");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }}
      >
        <div className="p-2 bg-teal-400 text-slate-950 rounded-xl font-bold shadow-md shrink-0">
          <Activity className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[11px] text-teal-300 font-bold uppercase tracking-wide">Fasilitas Olahraga RT</p>
          <p className="text-xs font-semibold leading-snug mt-0.5 text-white">
            Sound System & Matras Senam Siap Digunakan 🎉
          </p>
        </div>
      </motion.div>

      {/* Pin 4 (Bottom Left - Sarapan Post-Workout) */}
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="hidden xl:flex absolute left-8 bottom-12 z-20 items-center gap-3.5 bg-slate-900/85 backdrop-blur-xl border border-amber-400/30 text-white p-3 rounded-2xl shadow-2xl max-w-xs cursor-pointer hover:scale-105 transition-transform"
        onClick={() => {
          const el = document.getElementById("commerce");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }}
      >
        <div className="p-2 bg-amber-400 text-slate-950 rounded-xl font-bold shadow-md shrink-0">
          <ShoppingBag className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[11px] text-amber-300 font-bold uppercase tracking-wide">Sarapan Post-Workout</p>
          <p className="text-xs font-semibold leading-snug mt-0.5 text-white">
            Bu Dewi: Es Kelapa Muda & Bubur Organik Ready 🥥
          </p>
        </div>
      </motion.div>

      {/* Centerpiece Content (BLUE BOX STATUS BADGE REMOVED AS REQUESTED) */}
      <div className="relative z-20 max-w-3xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center pt-32 md:pt-40 pb-8 my-auto">
        {/* Compact Display Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight max-w-2xl drop-shadow-xl"
        >
          Bikin Lingkungan Tetangga{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
            Seguyub
          </span>{" "}
          & Seseru Ini.
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-4 text-xs sm:text-sm md:text-base text-slate-200 max-w-xl font-normal leading-relaxed drop-shadow"
        >
          Kelola kas transparan, surat pengantar digital, jadwal kegiatan olahraga, dan jualan antar-tetangga langsung dari ponsel. Komunitas rukun tanpa drama.
        </motion.p>

        {/* Single CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-6"
        >
          <Button
            variant="emerald"
            size="lg"
            onClick={scrollToOnboarding}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-8 py-3.5 rounded-full shadow-xl hover:scale-105 transition-all cursor-pointer text-sm font-sans"
          >
            <span>Daftarkan Lingkungan Anda</span>
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </motion.div>
      </div>

      {/* 5. Bottom Panorama Navigation Hint */}
      <div className="relative z-20 pb-6 flex items-center justify-center text-white/80 text-xs font-medium">
        <button
          onClick={scrollToPulse}
          className="animate-bounce inline-flex items-center gap-1.5 tracking-wider uppercase bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 hover:bg-white/20 transition-colors cursor-pointer"
        >
          <span>Scroll untuk melihat denyut warga ↓</span>
        </button>
      </div>
    </section>
  );
}
