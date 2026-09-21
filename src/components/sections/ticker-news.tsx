"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Newspaper, Bell, ArrowUpRight, Clock, FileCheck2, Recycle, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const TICKER_ITEMS = [
  "🌿 Klaster Anggrek: Gotong royong Minggu pkl 07.00 WIB di lapangan RW",
  "💰 RT 04 / RW 08: Laporan kas bulan Agustus selesai diaudit 100% transparan",
  "⚡ WargaIn v2.4 resmi meluncurkan QRIS Dinamis & Auto-Reconcile Payment",
  "🚨 Pos Satpam: Perubahan sistem QR Gatekeeper berlaku mulai 1 Oktober",
  "🥗 Warga Commerce: Sarapan Bubur Ayam Pak Kumis Blok D2 siap dipesan pagi ini",
];

export function TickerNewsSection() {
  const [selectedStory, setSelectedStory] = React.useState<{
    title: string;
    content: string;
    date: string;
    author: string;
  } | null>(null);

  return (
    <section id="pulse" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Top Infinite Horizontal Marquee Ticker */}
      <div className="mb-12 overflow-hidden rounded-2xl bg-neutral-900/90 border border-neutral-800 p-3 shadow-lg relative flex items-center">
        <div className="bg-emerald-600 text-white font-bold text-xs uppercase px-3 py-1.5 rounded-lg tracking-wider flex items-center gap-1.5 shrink-0 z-10 shadow-sm mr-4">
          <Bell className="w-3.5 h-3.5 animate-bounce" />
          <span>Pulse Marquee</span>
        </div>

        <div className="flex overflow-hidden whitespace-nowrap mask-gradient relative w-full">
          <div className="inline-flex animate-marquee gap-8 text-sm font-medium text-neutral-300 items-center">
            {TICKER_ITEMS.concat(TICKER_ITEMS).map((item, idx) => (
              <span key={idx} className="flex items-center gap-3">
                <span>{item}</span>
                <span className="text-emerald-500 font-bold">•</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
        <div>
          <Badge variant="emerald" className="mb-3">
            <Newspaper className="w-3.5 h-3.5 mr-1.5" />
            WargaIn Pulse Editorial
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground">
            Kabar Komunitas & Inovasi Lingkungan
          </h2>
        </div>
        <p className="text-sm md:text-base text-muted-foreground max-w-md">
          Portal berita independen antar-warga. Transparansi kegiatan, pembaruan fitur, dan kisah inspiratif tetangga.
        </p>
      </div>

      {/* Bento News Grid (3 Columns Asymmetrical) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Featured Story (Spans 2 columns on lg) */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-2"
        >
          <Card variant="interactive" padding="none" className="h-full flex flex-col group">
            <div className="relative h-64 sm:h-72 w-full overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80"
                alt="Gotong Royong Komunitas"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute top-4 left-4 flex gap-2">
                <Badge variant="amber">Kabar Terkini</Badge>
                <Badge variant="glass" className="text-white">
                  <Clock className="w-3 h-3 mr-1" /> 2 min read
                </Badge>
              </div>
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <div className="text-xs text-emerald-400 font-semibold mb-1">
                  Inisiatif RT 04 / RW 08 Grand Asri
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-snug group-hover:text-emerald-300 transition-colors">
                  Aksi Gotong Royong Digital: Sukses Bersihkan Drainage Sebelum Musim Hujan
                </h3>
              </div>
            </div>

            <CardContent className="p-6 flex-1 flex flex-col justify-between">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Melalui koordinasi tanpa spam di WargaIn Pulse, 85% kepala keluarga hadir membawa peralatan masing-masing. Laporan kas konsumsi dan foto sebelum-sesudah diunggah transparan dalam kurun 1 jam.
              </p>
              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xs">
                    HD
                  </div>
                  <div className="text-xs">
                    <div className="font-semibold text-foreground">Bpk. Hendro Dwi</div>
                    <div className="text-muted-foreground">Ketua RT 04</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setSelectedStory({
                      title: "Aksi Gotong Royong Digital: Sukses Bersihkan Drainage Sebelum Musim Hujan",
                      content:
                        "Kegiatan gotong royong warga RT 04 / RW 08 bulan ini berlangsung sangat solid. Dengan fitur WargaIn Pulse, panitia membagikan pembagian tugas wilayah secara presisi. Kas RT mengeluarkan dana konsumsi sebesar Rp 450.000 yang langsung diaudit transparan di sistem. Terima kasih kepada seluruh warga yang berpartisipasi!",
                      date: "18 September 2026",
                      author: "Bpk. Hendro Dwi (Ketua RT 04)",
                    })
                  }
                  className="group-hover:text-emerald-600 dark:group-hover:text-emerald-400"
                >
                  <span>Baca Selengkapnya</span>
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Column Right (Card 2 & Card 3 stacked) */}
        <div className="flex flex-col gap-6">
          {/* Card 2: Update Sistem & Fitur WargaIn */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card variant="featured" className="h-full">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="emerald" className="gap-1">
                  <Sparkles className="w-3 h-3" /> System Update v2.4
                </Badge>
                <span className="text-[11px] text-muted-foreground">Baru Dirilis</span>
              </div>
              <CardTitle className="text-lg font-bold text-foreground">
                Kini Surat Pengantar RT Otomatis Tertanda Digital
              </CardTitle>
              <CardDescription className="mt-2 text-xs leading-relaxed">
                Warga tidak perlu lagi ketok pintu Pak RT malam hari. Buat draft surat dari HP, Pak RT tinggal klik Setujui via TTD QR Code terverifikasi.
              </CardDescription>

              {/* UI Mockup Snippet */}
              <div className="mt-4 p-3 rounded-xl bg-background border border-border/80 text-xs flex items-center justify-between shadow-inner">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Surat Keterangan Domisili</div>
                    <div className="text-[10px] text-muted-foreground">E-Signature Validated</div>
                  </div>
                </div>
                <Badge variant="emerald" className="text-[10px] px-2 py-0.5">
                  Disetujui
                </Badge>
              </div>
            </Card>
          </motion.div>

          {/* Card 3: Spotlight Warga Inspiratif */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card variant="default" className="h-full">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-emerald-500/40">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"
                    alt="Pak Joko"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <Badge variant="amber" className="text-[10px] py-0 px-2">
                    Spotlight Warga
                  </Badge>
                  <div className="text-sm font-bold text-foreground">Pak Joko Santoso</div>
                  <div className="text-[11px] text-muted-foreground">Inisiator Bank Sampah RT 08</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed italic">
                "Dengan pencatatan digital WargaIn, penjualan pilahan plastik warga menghasilkan Rp 4.200.000 bulan ini untuk kas perlengkapan poskamling."
              </p>
              <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="flex items-center gap-1">
                  <Recycle className="w-3.5 h-3.5" /> 340 kg Plastik Terdaur Ulang
                </span>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Story Detail Dialog */}
      <Dialog open={!!selectedStory} onOpenChange={() => setSelectedStory(null)}>
        <DialogContent className="max-w-lg">
          {selectedStory && (
            <>
              <DialogHeader>
                <Badge variant="emerald" className="w-fit mb-2">
                  WargaIn Pulse Story
                </Badge>
                <DialogTitle className="text-xl font-bold leading-tight">
                  {selectedStory.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Dipublikasikan oleh {selectedStory.author} • {selectedStory.date}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 text-sm text-foreground leading-relaxed">
                {selectedStory.content}
              </div>
              <div className="pt-2 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setSelectedStory(null)}>
                  Tutup Kabar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
