"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Quote, CheckCheck, TrendingUp, HeartHandshake, ChevronLeft, ChevronRight, Sparkles, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  community: string;
  avatar: string;
  metric: string;
  chatBubbleMessage: string;
  time: string;
  stars: number;
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: "t1",
    name: "Bpk. Hendro Dwi",
    role: "Ketua RW 08",
    community: "Grand Galaxy Park, Bekasi",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    metric: "Tingkat bayar iuran naik dari 60% ke 98% dalam 2 bulan",
    chatBubbleMessage:
      "Dulu tiap akhir bulan bendahara pusing nagih iuran warga satu per satu di WA. Sejak pakai QRIS Dinamis WargaIn, warga otomatis dapat reminder sopan dan 98% bayar tepat waktu sebelum tanggal 5!",
    time: "14:20 WIB",
    stars: 5,
  },
  {
    id: "t2",
    name: "Ibu Ratna Pertiwi",
    role: "Bendahara RT 02",
    community: "Permata Hijau Residence",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
    metric: "Hemat 6 jam sebulan tanpa rekap Excel manual",
    chatBubbleMessage:
      "Nggak ada lagi fitnah uang kas! Bukti nota tinggal difoto dari HP, sistem langsung bikin laporan grafik. Warga tinggal buka aplikasi kalau mau cek audit.",
    time: "09:15 WIB",
    stars: 5,
  },
  {
    id: "t3",
    name: "Pak Tejo Supriyanto",
    role: "Komandan Satpam",
    community: "Klaster Anggrek Asri",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
    metric: "100% Tamu & Paket Terverifikasi QR Pass",
    chatBubbleMessage:
      "Buku tamu lusuh sudah diganti tablet pos satpam. Kurir tinggal scan QR code warga, langsung otomatis kirim notif ke HP pemilik rumah. Tugas satpam jadi lebih teratur dan profesional.",
    time: "19:45 WIB",
    stars: 5,
  },
  {
    id: "t4",
    name: "Mbak Dian Sastro",
    role: "Warga & Pegiat Warga Commerce",
    community: "Klaster Bukit Permai",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
    metric: "Omset jualan kue tetangga naik 3x lipat",
    chatBubbleMessage:
      "Nasi uduk dan kue kering buatan saya sekarang dipesan tetangga satu klaster via Warga Commerce. Pengiriman tinggal titip antar-blok tanpa dipotong biaya aplikasi rakus!",
    time: "07:30 WIB",
    stars: 5,
  },
];

export function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);

  // Auto-advance slow slider every 5 seconds
  React.useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % TESTIMONIALS.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  };

  const activeTestimonial = TESTIMONIALS[currentIndex];
  const nextTestimonial = TESTIMONIALS[(currentIndex + 1) % TESTIMONIALS.length];

  return (
    <section id="testimonials" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <Badge variant="emerald" className="mb-3">
          <HeartHandshake className="w-3.5 h-3.5 mr-1.5" />
          Suara Komunitas WargaIn
        </Badge>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground">
          Cerita Nyata Pengurus & Warga Komunitas
        </h2>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
          Dari Pengurus RT, Bendahara, Satpam, hingga Ibu Rumah Tangga merasakan dampak positif lingkungan yang guyub dan transparan.
        </p>
      </div>

      {/* Auto-Playing Slider Container */}
      <div
        className="relative max-w-5xl mx-auto"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Slider Card Frame with AnimatePresence */}
        <div className="relative min-h-[380px] sm:min-h-[320px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTestimonial.id}
              initial={{ opacity: 0, x: 50, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -50, scale: 0.96 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              <Card
                variant="glass"
                padding="spacious"
                className="p-8 sm:p-10 rounded-3xl border border-emerald-500/30 shadow-2xl relative overflow-hidden backdrop-blur-2xl bg-neutral-900/90 text-white"
              >
                {/* Background Ambient Flare */}
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Left Side: Avatar & Stars (4 cols) */}
                  <div className="md:col-span-4 flex flex-col items-center md:items-start text-center md:text-left border-b md:border-b-0 md:border-r border-neutral-800 pb-6 md:pb-0 md:pr-6">
                    <div className="relative mb-4">
                      <span className="absolute -inset-1 rounded-full bg-gradient-to-tr from-emerald-500 to-amber-400 blur-sm opacity-70 animate-pulse" />
                      <img
                        src={activeTestimonial.avatar}
                        alt={activeTestimonial.name}
                        className="relative w-20 h-20 rounded-full object-cover border-2 border-white shadow-xl"
                      />
                    </div>
                    <div className="font-extrabold text-xl text-white">{activeTestimonial.name}</div>
                    <div className="text-xs text-emerald-400 font-semibold mt-0.5">{activeTestimonial.role}</div>
                    <div className="text-[11px] text-neutral-400 font-medium">{activeTestimonial.community}</div>

                    {/* Star Rating */}
                    <div className="flex items-center gap-1 mt-3">
                      {[...Array(activeTestimonial.stars)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>

                  {/* Right Side: WhatsApp Bubble & Metric Highlight (8 cols) */}
                  <div className="md:col-span-8 flex flex-col justify-between">
                    <div>
                      {/* Metric Highlight Badge */}
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold mb-4 shadow-md">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        <span>{activeTestimonial.metric}</span>
                      </div>

                      {/* Chat Bubble Box */}
                      <div className="relative p-5 rounded-2xl bg-neutral-950/80 border border-neutral-800 text-neutral-200 text-sm sm:text-base leading-relaxed">
                        <Quote className="w-8 h-8 text-emerald-500/20 absolute -top-4 left-4" />
                        <p className="relative z-10 italic">"{activeTestimonial.chatBubbleMessage}"</p>
                        <div className="mt-4 flex items-center justify-end gap-1.5 text-xs text-emerald-400 font-mono">
                          <span>{activeTestimonial.time}</span>
                          <CheckCheck className="w-4 h-4 text-emerald-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls & Slide Indicators */}
        <div className="mt-8 flex items-center justify-between">
          {/* Pause Autoplay Indicator */}
          <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{isPaused ? "Autoplay Paused" : "Auto-playing (Slow Slider 5s)"}</span>
          </div>

          {/* Dots Indicator */}
          <div className="flex items-center gap-2">
            {TESTIMONIALS.map((t, idx) => (
              <button
                key={t.id}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${currentIndex === idx ? "w-8 bg-emerald-500" : "w-2.5 bg-neutral-800 hover:bg-neutral-700"
                  }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Prev / Next Arrows */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrev}
              className="rounded-full border-neutral-800 hover:bg-neutral-800 text-white"
              aria-label="Previous Testimonial"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              className="rounded-full border-neutral-800 hover:bg-neutral-800 text-white"
              aria-label="Next Testimonial"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
