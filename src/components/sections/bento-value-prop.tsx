"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  FileText,
  QrCode,
  TrendingUp,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Smartphone,
  MapPin,
  Check,
  Clock,
  ArrowRight,
  Download,
  ExternalLink,
  Lock,
  Radio
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { SOSReport } from "@/components/ui/sos-leaflet-map";

// Dynamically import SOSLeafletMap with SSR disabled
const SOSLeafletMap = dynamic(
  () => import("@/components/ui/sos-leaflet-map").then((mod) => mod.SOSLeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[230px] bg-[#0B130E] rounded-2xl border border-neutral-800 animate-pulse flex items-center justify-center text-slate-400 text-xs">
        Memuat Peta Sinyal SOS GPS...
      </div>
    ),
  }
);

export function BentoValuePropSection() {
  const [sosActive, setSosActive] = React.useState(false);
  const [sosModalOpen, setSosModalOpen] = React.useState(false);
  const [suratModalOpen, setSuratModalOpen] = React.useState(false);
  const [activeReport, setActiveReport] = React.useState<SOSReport | null>(null);

  const triggerSOS = () => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const report: SOSReport = {
            id: `sos-${Date.now()}`,
            senderName: "Ibu Dian",
            houseBlock: "Blok C3 No. 12",
            alertType: "Maling / Keamanan",
            timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setActiveReport(report);
          setSosActive(true);
          setSosModalOpen(true);
          toast.error("SIREN SOS AKTIF! Koordinat GPS Anda direkam di Peta Pos Satpam!", { duration: 6000 });
        },
        () => {
          const report: SOSReport = {
            id: `sos-${Date.now()}`,
            senderName: "Ibu Dian",
            houseBlock: "Blok C3 No. 12",
            alertType: "Maling / Keamanan",
            timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
            lat: -6.2088,
            lng: 106.8456,
          };
          setActiveReport(report);
          setSosActive(true);
          setSosModalOpen(true);
          toast.error("SIREN SOS AKTIF! Sinyal Darurat Dikirim!", { duration: 6000 });
        }
      );
    } else {
      setSosActive(true);
      setSosModalOpen(true);
    }
  };

  return (
    <section id="features" className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <Badge variant="outline" className="mb-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold text-xs">
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          Layanan Unggulan WargaIn
        </Badge>
        <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          Semua Kebutuhan RT/RW Terintegrasi
        </h2>
        <p className="mt-3 text-xs sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl mx-auto">
          Tinggalkan administrasi manual. Kelola keuangan, persuratan, pos satpam, dan darurat SOS dalam satu portal pintar.
        </p>
      </div>

      {/* Bento Grid Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* ========================================== */}
        {/* CARD 1: FINANCIAL & KAS RT (Span 2) */}
        {/* ========================================== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="md:col-span-2"
        >
          <div className="h-full p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#131F17] border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs flex flex-col justify-between space-y-6 hover:shadow-xl transition-all duration-300">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" /> Financial & Kas RT
                </Badge>
                <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Auto-Reconcile QRIS
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Transparansi Kas RT/RW Otomatis
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                Warga membayar iuran rutin lewat QRIS Dinamis. Laporan kas terkumpul dan rincian pengeluaran tercatat otomatis secara transparan untuk seluruh warga.
              </p>
            </div>

            {/* Interactive Cashflow Preview Widget */}
            <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900 text-white border border-neutral-800 space-y-3 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-800">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Kas Terkumpul (Bulan Ini)
                  </span>
                  <p className="text-xl sm:text-2xl font-black text-emerald-400">
                    Rp 24.850.000
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 block">Pemasukan</span>
                    <span className="font-bold text-emerald-400">+28.5M</span>
                  </div>
                  <div className="pl-3 border-l border-neutral-800">
                    <span className="text-[9px] text-slate-400 block">Pengeluaran</span>
                    <span className="font-bold text-amber-400">-3.6M</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-semibold">Iuran Keamanan & Sampah (64 KK)</span>
                  <span className="font-mono text-emerald-400 font-bold">85% Paid</span>
                </div>
                <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full w-[85%]" />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> bebas manipulasi nota & pembukuan ganda
              </span>
            </div>
          </div>
        </motion.div>

        {/* ========================================== */}
        {/* CARD 2: E-SURAT RT DIGITAL (Span 1 - REDESIGNED) */}
        {/* ========================================== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="md:col-span-1"
        >
          <div className="h-full p-6 rounded-3xl bg-white dark:bg-[#131F17] border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-xl transition-all duration-300">
            <div className="space-y-3">
              <Badge className="bg-teal-600 text-white font-bold text-[10px]">
                <FileText className="w-3.5 h-3.5 mr-1" /> E-Surat Resmi RT
              </Badge>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Surat Pengantar 1-Klik via HP
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Ajukan Surat Domisili, SKTM, atau Numpang Nikah secara digital. Pengurus RT tanda tangan legal dengan validasi QR Code resmi.
              </p>
            </div>

            {/* Official Document Preview Card */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#0B130E] border border-neutral-200/80 dark:border-neutral-800/80 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200/80 dark:border-neutral-800/80">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-[11px]">
                    Surat Pengantar RT 04
                  </span>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[9px] font-bold">
                  ✓ QR Verified
                </Badge>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Pemohon:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">Agus Pratama (Blok C3)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Perihal:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">Keterangan Domisili</span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => setSuratModalOpen(true)}
                className="w-full text-xs py-2 bg-white dark:bg-[#131F17] hover:bg-emerald-600 hover:text-white border-neutral-300 dark:border-neutral-700 font-bold transition-all shadow-xs"
              >
                Previu Template Surat
              </Button>
            </div>

            <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-800/60 text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Sesuai standar Kelurahan/Desa</span>
            </div>
          </div>
        </motion.div>

        {/* ========================================== */}
        {/* CARD 3: POS SATPAM & QR TAMU (Span 1) */}
        {/* ========================================== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="md:col-span-1"
        >
          <div className="h-full p-6 rounded-3xl bg-white dark:bg-[#131F17] border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-xl transition-all duration-300">
            <div className="space-y-3">
              <Badge className="bg-amber-600 text-white font-bold text-[10px]">
                <QrCode className="w-3.5 h-3.5 mr-1" /> Pos Satpam Digital
              </Badge>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Akses QR Pass Tamu & Kurir
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Tamu & kurir cukup menunjukkan QR Pass dari HP warga. Satpam scan 1 detik dan log masuk tersimpan aman.
              </p>
            </div>

            {/* Smartphone Scan Simulator */}
            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-white shadow-md text-center space-y-2">
              <div className="w-10 h-10 mx-auto rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                <Smartphone className="w-5 h-5 animate-pulse" />
              </div>
              <div className="text-xs font-bold text-white">Scan QR Pass Tamu</div>
              <div className="text-[10px] text-slate-400">Tamu: Bpk. Budi (Blok B/04)</div>
              <div className="py-1 px-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold inline-block">
                ✓ Akses Disetujui
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-800/60 text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>Privasi plat kendaraan terlindungi</span>
            </div>
          </div>
        </motion.div>

        {/* ========================================== */}
        {/* CARD 4: TOMBOL DARURAT SOS (Span 2 - REDESIGNED) */}
        {/* ========================================== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="md:col-span-2"
        >
          <div className="h-full p-6 sm:p-8 rounded-3xl bg-[#0B130E] border border-neutral-800 shadow-xl text-white flex flex-col justify-between space-y-6 hover:shadow-2xl transition-all duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              
              {/* Left Column: Info & Tactile SOS Button */}
              <div className="lg:col-span-6 space-y-4">
                <Badge className="bg-rose-600 text-white font-bold text-[10px] animate-pulse">
                  <ShieldAlert className="w-3.5 h-3.5 mr-1" /> Panic Button Darurat Realtime
                </Badge>
                
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Tombol Darurat SOS Komunitas
                </h3>
                
                <p className="text-xs text-slate-300 leading-relaxed">
                  Dalam kondisi medis mendesak, kebakaran, atau maling, 1 kali tekan tombol SOS akan merekam koordinat GPS Anda dan menyalakan marker merah di Peta Pos Satpam!
                </p>

                <div className="flex items-center gap-4 pt-2">
                  {/* Tactile Glowing 3D SOS Button */}
                  <button
                    onClick={triggerSOS}
                    className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 font-black text-white text-lg shadow-2xl flex items-center justify-center transition-all duration-300 cursor-pointer shrink-0 active:scale-95 ${
                      sosActive
                        ? "bg-rose-600 border-amber-400 animate-ping shadow-rose-600/80"
                        : "bg-gradient-to-tr from-rose-700 via-red-600 to-rose-500 border-rose-400/40 hover:scale-105 shadow-rose-600/40"
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <ShieldAlert className="w-7 h-7 mb-0.5" />
                      <span>SOS</span>
                    </div>
                  </button>

                  <div className="text-xs space-y-0.5">
                    <span className="font-bold text-white text-sm block">Tekan Tombol SOS</span>
                    <p className="text-slate-400 text-[11px]">
                      GPS direkam & Marker merah menyala di Peta Satpam
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Clean SOS Leaflet GPS Map Container */}
              <div className="lg:col-span-6">
                <SOSLeafletMap sosActive={sosActive} activeReport={activeReport} />
              </div>

            </div>
          </div>
        </motion.div>

      </div>

      {/* Modal Dialog for E-Surat Preview */}
      <Dialog open={suratModalOpen} onOpenChange={setSuratModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#131F17] border border-neutral-200 dark:border-neutral-800 text-slate-900 dark:text-slate-100 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <span>Simulasi Layanan Surat RT Online</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Surat pengantar diterbitkan resmi dengan kode verifikasi QR.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-[#0B130E] space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Pemohon:</span>
              <span className="font-bold">Bpk. Agus Pratama (Blok C3/04)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Jenis Surat:</span>
              <span className="font-bold">Surat Keterangan Domisili</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status Pengurus:</span>
              <span className="font-bold text-emerald-600">✓ Disetujui Ketua RT 04</span>
            </div>
          </div>

          <Button
            onClick={() => {
              setSuratModalOpen(false);
              toast.success("Surat Berhasil Diterbitkan!", {
                description: "File PDF siap diunduh oleh warga."
              });
            }}
            className="w-full bg-emerald-600 text-white font-bold text-xs rounded-xl"
          >
            Selesai Simulasi
          </Button>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog for SOS Siren Simulation */}
      <Dialog open={sosModalOpen} onOpenChange={setSosModalOpen}>
        <DialogContent className="max-w-md bg-[#0B130E] text-white border-rose-600/50 rounded-3xl">
          <DialogHeader>
            <Badge variant="destructive" className="w-fit mb-2 animate-bounce">
              <AlertTriangle className="w-3.5 h-3.5 mr-1" /> ALARM DARURAT DIAKTIFKAN
            </Badge>
            <DialogTitle className="text-xl font-bold text-white">
              Sinyal Darurat Disebarkan ke Peta!
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Koordinat GPS Anda telah direkam & marker merah menyala di Peta Satpam!
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3 text-xs bg-neutral-900 p-4 rounded-2xl border border-neutral-800">
            <div className="flex items-center justify-between font-bold text-rose-400">
              <span>Pelapor SOS:</span>
              <span>{activeReport?.senderName || "Ibu Dian"} ({activeReport?.houseBlock || "Blok C3 No. 12"})</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Koordinat GPS:</span>
              <span className="font-mono text-amber-300">{activeReport?.lat.toFixed(4)}, {activeReport?.lng.toFixed(4)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Status Peta Satpam:</span>
              <span className="text-emerald-400 font-semibold">✓ Marker Merah Menyala</span>
            </div>
          </div>
          <div className="pt-2 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSosModalOpen(false);
              }}
              className="text-xs border-neutral-800 text-white hover:bg-neutral-800"
            >
              Tutup Dialog Simulation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
