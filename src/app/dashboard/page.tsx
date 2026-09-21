"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Wallet,
  Users,
  FileText,
  Bell,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Search,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8"
    >
      {/* Welcome Banner */}
      <motion.div
        variants={itemVariants}
        className="bg-gradient-to-r from-emerald-950 via-teal-900/40 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden"
      >
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" /> Portal Administrasi RT 04 / RW 09
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Selamat Datang di Dashboard Komunitas
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
            Sistem pengawasan iuran kas transparan, penerbitan surat pengantar otomatis, dan direktori warga terintegrasi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl gap-2 shadow-lg shadow-emerald-600/20">
              <PlusCircle className="w-4 h-4" /> Catat Transaksi Kas
            </Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button variant="outline" className="border-border rounded-xl gap-2 hover:bg-muted/80">
              <FileText className="w-4 h-4" /> Buat Surat Pengantar
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Metrics Bento Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Saldo Kas */}
        <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
          <Card className="rounded-2xl border-border/60 shadow-md hover:shadow-lg transition-all bg-card/90 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Saldo Kas RT Saat Ini
              </CardTitle>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold text-foreground">Rp 14.850.000</div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1 font-medium">
                <TrendingUp className="w-3.5 h-3.5" /> +Rp 1.250.000 bulan ini
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 2: Total KK & Warga */}
        <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
          <Card className="rounded-2xl border-border/60 shadow-md hover:shadow-lg transition-all bg-card/90 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Terdaftar
              </CardTitle>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold text-foreground">124 KK</div>
              <div className="text-xs text-muted-foreground mt-1">
                Total 418 Jiwa terverifikasi
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 3: Surat Pengantar */}
        <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
          <Card className="rounded-2xl border-border/60 shadow-md hover:shadow-lg transition-all bg-card/90 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Surat Pending TT
              </CardTitle>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">3 Surat</div>
              <div className="text-xs text-muted-foreground mt-1">
                Perlu tanda tangan Ketua RT
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 4: Iuran Bulan Ini */}
        <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
          <Card className="rounded-2xl border-border/60 shadow-md hover:shadow-lg transition-all bg-card/90 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Capaian Iuran Warga
              </CardTitle>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <QrCode className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold text-foreground">92.5%</div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                115 / 124 KK Lunas
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Main Content Layout Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Mutasi Kas Terakhir */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-2xl border-border/60 shadow-md bg-card/90 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground">Mutasi Kas Komunitas Terbaru</CardTitle>
                <p className="text-xs text-muted-foreground">Catatan otomatis pembayaran QRIS dan pengeluaran RT</p>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-emerald-600 dark:text-emerald-400">
                Lihat Semua &rarr;
              </Button>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border/60">
                {[
                  { title: "Iuran Bulanan KK Bpk. Hendra (No. 42)", amount: "+Rp 100.000", type: "in", date: "Hari Ini, 14:20", method: "QRIS" },
                  { title: "Pembayaran Honor Keamanan Malam (2 Personel)", amount: "-Rp 800.000", type: "out", date: "Kemarin, 09:00", method: "Transfer Bank" },
                  { title: "Iuran Bulanan KK Ibu Ratna (No. 18)", amount: "+Rp 100.000", type: "in", date: "18 Sep 2026", method: "QRIS" },
                  { title: "Pembelian Lampu LED Jalan Pos Satpam", amount: "-Rp 150.000", type: "out", date: "17 Sep 2026", method: "Tunai Kas" },
                ].map((item, idx) => (
                  <div key={idx} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        item.type === "in" ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"
                      }`}>
                        {item.type === "in" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-semibold text-foreground">{item.title}</div>
                        <div className="text-[11px] text-muted-foreground">{item.date} • {item.method}</div>
                      </div>
                    </div>
                    <div className={`text-xs sm:text-sm font-bold ${
                      item.type === "in" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                    }`}>
                      {item.amount}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Pengumuman & Agenda */}
        <div className="space-y-6">
          <Card className="rounded-2xl border-border/60 shadow-md bg-card/90 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Pengumuman & Agenda RT
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3.5 rounded-xl bg-muted/60 border border-border/60 space-y-1">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 text-[10px]">Kerja Bakti</Badge>
                  <span className="text-[10px] text-muted-foreground">Minggu Ini</span>
                </div>
                <div className="text-xs font-bold text-foreground">Kerja Bakti Pembersihan Selokan</div>
                <div className="text-[11px] text-muted-foreground">Pukul 07:00 WIB • Lapangan RT 04</div>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/60 border border-border/60 space-y-1">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 text-[10px]">Posyandu</Badge>
                  <span className="text-[10px] text-muted-foreground">22 Sep 2026</span>
                </div>
                <div className="text-xs font-bold text-foreground">Posyandu Balita & Lansia</div>
                <div className="text-[11px] text-muted-foreground">Pukul 09:00 WIB • Pos Balai Warga</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );
}
