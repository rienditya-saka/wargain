"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight, Building2, PhoneCall, Sparkles, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export function OnboardingSection() {
  const [pengurusForm, setPengurusForm] = React.useState({ housingName: "", phone: "", email: "" });
  const [wargaForm, setWargaForm] = React.useState({ housingName: "", phone: "", rtNumber: "" });

  const handlePengurusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pengurusForm.housingName || !pengurusForm.phone) {
      toast.error("Mohon lengkapi Nama Perumahan / RT dan Nomor WhatsApp.");
      return;
    }
    toast.success("Permohonan Demo Pengurus Berhasil Terkirim!", {
      description: `Tim onboarding WargaIn akan menghubungi nomor ${pengurusForm.phone} dalam kurun 15 menit via WhatsApp.`,
    });
    setPengurusForm({ housingName: "", phone: "", email: "" });
  };

  const handleWargaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wargaForm.housingName || !wargaForm.phone) {
      toast.error("Mohon lengkapi Nama Perumahan dan Nomor WhatsApp Anda.");
      return;
    }
    toast.success("Usulan Lingkungan Berhasil Diterima!", {
      description: `Terima kasih! Tim kami akan membantu mempresentasikan WargaIn ke Pengurus RT ${wargaForm.housingName}.`,
    });
    setWargaForm({ housingName: "", phone: "", rtNumber: "" });
  };

  return (
    <section id="onboarding" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="relative rounded-3xl overflow-hidden bg-neutral-950 border border-neutral-800 p-8 sm:p-12 md:p-16 shadow-2xl radial-glow">
        {/* Ambient Gradient Flares */}
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <Badge variant="glass" className="mb-4 text-emerald-300 border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Mulai Transformasi Lingkungan Anda
          </Badge>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
            Siap Bikin Perumahan Anda Lebih Rukun & Transparan?
          </h2>
          <p className="mt-4 text-base sm:text-lg text-neutral-300 leading-relaxed max-w-2xl mx-auto">
            Uji coba gratis 30 hari penuh tanpa komitmen. Tim spesialis kami siap mendampingi pengaturan data RT/RW hingga aktif.
          </p>

          {/* 2 Tab Switching Form */}
          <div className="mt-10 text-left">
            <Tabs defaultValue="pengurus" className="w-full">
              <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto mb-8 bg-neutral-900 border-neutral-800 p-1">
                <TabsTrigger value="pengurus" className="text-xs sm:text-sm font-bold">
                  Untuk Pengurus RT / RW
                </TabsTrigger>
                <TabsTrigger value="warga" className="text-xs sm:text-sm font-bold">
                  Untuk Warga Mandiri
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Untuk Pengurus */}
              <TabsContent value="pengurus">
                <form
                  onSubmit={handlePengurusSubmit}
                  className="bg-neutral-900/90 border border-neutral-800 p-6 sm:p-8 rounded-2xl shadow-xl space-y-4 max-w-xl mx-auto backdrop-blur-md"
                >
                  <div className="text-center sm:text-left mb-2">
                    <h3 className="text-lg font-bold text-white">Jadwalkan Demo & Uji Coba Gratis 30 Hari</h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      Khusus untuk Ketua RT, Ketua RW, Bendahara, atau Panitia Paguyuban.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-200">
                      Nama Perumahan / RT / RW <span className="text-emerald-400">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="Contoh: RT 04 / RW 08 Komplek Bukit Asri"
                      value={pengurusForm.housingName}
                      onChange={(e) => setPengurusForm({ ...pengurusForm, housingName: e.target.value })}
                      className="bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-200">
                      Nomor WhatsApp Aktif <span className="text-emerald-400">*</span>
                    </label>
                    <Input
                      type="tel"
                      placeholder="Contoh: 081234567890"
                      value={pengurusForm.phone}
                      onChange={(e) => setPengurusForm({ ...pengurusForm, phone: e.target.value })}
                      className="bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-500"
                    />
                  </div>

                  <Button variant="emerald" size="xl" type="submit" className="w-full font-bold text-base shadow-lg group">
                    <span>Aktifkan Uji Coba Gratis 30 Hari</span>
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1.5 transition-transform" />
                  </Button>
                </form>
              </TabsContent>

              {/* Tab 2: Untuk Warga Mandiri */}
              <TabsContent value="warga">
                <form
                  onSubmit={handleWargaSubmit}
                  className="bg-neutral-900/90 border border-neutral-800 p-6 sm:p-8 rounded-2xl shadow-xl space-y-4 max-w-xl mx-auto backdrop-blur-md"
                >
                  <div className="text-center sm:text-left mb-2">
                    <h3 className="text-lg font-bold text-white">Usulkan WargaIn ke Pengurus RT Saya</h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      Bantu kami menghubungi Pak RT/RW Anda secara sopan & profesional.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-200">
                      Nama Perumahan & Wilayah RT/RW Anda <span className="text-amber-400">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="Contoh: Perum Graha Indah RT 02"
                      value={wargaForm.housingName}
                      onChange={(e) => setWargaForm({ ...wargaForm, housingName: e.target.value })}
                      className="bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-200">
                      Nomor WhatsApp Anda <span className="text-amber-400">*</span>
                    </label>
                    <Input
                      type="tel"
                      placeholder="Contoh: 081298765432"
                      value={wargaForm.phone}
                      onChange={(e) => setWargaForm({ ...wargaForm, phone: e.target.value })}
                      className="bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-500"
                    />
                  </div>

                  <Button variant="amber" size="xl" type="submit" className="w-full font-bold text-base shadow-lg group">
                    <span>Kirim Usulan ke Tim WargaIn</span>
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1.5 transition-transform" />
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          {/* Micro-copy Assurance */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-neutral-400">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" /> Data aman terlindungi (UU PDP Compliant)
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Bebas setup rumit
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Didampingi tim onboarding sampai aktif
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
