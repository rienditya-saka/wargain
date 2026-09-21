"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Lock,
  Phone,
  Building,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { setClientSession } from "@/lib/auth-session";
import { SubscriptionTierCode } from "@/lib/types/auth";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Admin
    fullName: "",
    email: "",
    password: "",
    phone: "",

    // Step 2: Community & Location
    communityName: "",
    communitySlug: "",
    communityType: "government", // "government" | "community"
    country: "Indonesia",
    province: "DKI Jakarta",
    regency: "Jakarta Selatan",
    district: "Kebayoran Baru",
    urban: "Mekar",
    neighborhood: "RT 04 / RW 09",
    address: "",
    lat: "-6.2088",
    long: "106.8456",

    // Step 3: Tier
    planTier: "RT_STANDARD" as SubscriptionTierCode,
  });

  const updateForm = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleNextStep = () => {
    setErrorMessage("");
    if (step === 1) {
      if (!formData.fullName || !formData.email || !formData.password || !formData.phone) {
        setErrorMessage("Mohon lengkapi seluruh data akun pengurus.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.communityName || !formData.province || !formData.regency || !formData.district || !formData.urban || !formData.neighborhood) {
        setErrorMessage("Mohon lengkapi bidang data wilayah/komunitas.");
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal melakukan registrasi");
      }

      toast.success("Registrasi Berhasil!", {
        description: "Mengarahkan ke Dashboard Komunitas...",
      });

      // Save session
      if (data.session) {
        setClientSession(data.session);
      }

      setTimeout(() => {
        router.push("/feed");
      }, 800);
    } catch (err: any) {
      setErrorMessage(err?.message || "Terjadi kesalahan pada sistem.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 text-foreground flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* Top Header Navigation */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-3 group">
          <Image
            src="/images/logo.png"
            alt="WargaIn Logo"
            width={40}
            height={40}
            className="w-10 h-10 object-contain group-hover:scale-105 transition-transform"
          />
          <span className="font-extrabold text-xl tracking-tight text-white">
            Warga<span className="text-emerald-400">In</span>
          </span>
        </Link>
        <div className="flex items-center gap-4 text-xs sm:text-sm">
          <span className="text-slate-400 hidden sm:inline">Sudah memiliki akun?</span>
          <Link href="/login">
            <Button variant="outline" size="sm" className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10">
              Masuk
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Registration Card Container */}
      <main className="max-w-4xl mx-auto w-full my-6">
        <Card className="border border-emerald-500/20 bg-slate-900/90 backdrop-blur-2xl shadow-2xl text-slate-100 overflow-hidden">
          {/* Step Progress Bar */}
          <div className="bg-slate-950/80 p-4 border-b border-border/60">
            <div className="flex items-center justify-between max-w-xl mx-auto">
              {/* Step 1 */}
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                  step >= 1 ? "bg-emerald-500 text-slate-950 font-extrabold" : "bg-slate-800 text-slate-400"
                }`}>
                  1
                </div>
                <span className={`text-xs font-semibold ${step >= 1 ? "text-emerald-400" : "text-slate-500"}`}>
                  Pengurus
                </span>
              </div>
              <div className={`flex-1 h-1 mx-3 rounded ${step >= 2 ? "bg-emerald-500" : "bg-slate-800"}`} />

              {/* Step 2 */}
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                  step >= 2 ? "bg-emerald-500 text-slate-950 font-extrabold" : "bg-slate-800 text-slate-400"
                }`}>
                  2
                </div>
                <span className={`text-xs font-semibold ${step >= 2 ? "text-emerald-400" : "text-slate-500"}`}>
                  Wilayah / RT-RW
                </span>
              </div>
              <div className={`flex-1 h-1 mx-3 rounded ${step >= 3 ? "bg-emerald-500" : "bg-slate-800"}`} />

              {/* Step 3 */}
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                  step >= 3 ? "bg-emerald-500 text-slate-950 font-extrabold" : "bg-slate-800 text-slate-400"
                }`}>
                  3
                </div>
                <span className={`text-xs font-semibold ${step >= 3 ? "text-emerald-400" : "text-slate-500"}`}>
                  Paket Langganan
                </span>
              </div>
            </div>
          </div>

          <CardContent className="p-6 sm:p-8 space-y-6">
            {/* Error Banner */}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs sm:text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>{errorMessage}</div>
              </div>
            )}

            {/* STEP 1: INFORMASI PENGURUS */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                    <User className="w-6 h-6 text-emerald-400" />
                    Informasi Akun Utama / Pengurus
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Buat kredensial admin (Ketua RT / RW / Pengurus) untuk mengelola portal WargaIn.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Nama Lengkap Admin *</label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <Input
                        placeholder="Contoh: H. Bambang Sujatmiko"
                        value={formData.fullName}
                        onChange={(e) => updateForm("fullName", e.target.value)}
                        className="pl-9 bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">No. WhatsApp / HP *</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <Input
                        placeholder="081234567890"
                        value={formData.phone}
                        onChange={(e) => updateForm("phone", e.target.value)}
                        className="pl-9 bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Alamat Email *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <Input
                        type="email"
                        placeholder="ketua.rt04@wargain.id"
                        value={formData.email}
                        onChange={(e) => updateForm("email", e.target.value)}
                        className="pl-9 bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Kata Sandi *</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <Input
                        type="password"
                        placeholder="••••••••••••"
                        value={formData.password}
                        onChange={(e) => updateForm("password", e.target.value)}
                        className="pl-9 bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={handleNextStep}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-5 rounded-xl gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    Lanjut: Data Wilayah
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: DATA WILAYAH & ALAMAT */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                    <Building className="w-6 h-6 text-emerald-400" />
                    Profil Komunitas / Hirarki Alamat
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Definisikan nama komunitas dan batas administratif wilayah RT/RW Anda.
                  </p>
                </div>

                {/* Type selector */}
                <div className="grid grid-cols-2 gap-4">
                  <div
                    onClick={() => updateForm("communityType", "government")}
                    className={`cursor-pointer rounded-xl p-4 border transition-all ${
                      formData.communityType === "government"
                        ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500"
                        : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                    }`}
                  >
                    <div className="font-bold text-sm text-white">Pemerintahan RT / RW</div>
                    <div className="text-xs text-slate-400 mt-1">Struktur resmi pemerintahan lokal (Wajib isi alamat lengkap)</div>
                  </div>
                  <div
                    onClick={() => updateForm("communityType", "community")}
                    className={`cursor-pointer rounded-xl p-4 border transition-all ${
                      formData.communityType === "community"
                        ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500"
                        : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                    }`}
                  >
                    <div className="font-bold text-sm text-white">Komunitas / Paguyuban Mandiri</div>
                    <div className="text-xs text-slate-400 mt-1">Perumahan swasta, perkumpulan warga klaster mandiri</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Nama Komunitas / RT-RW *</label>
                    <Input
                      placeholder="Contoh: RT 04 / RW 09 Kelurahan Mekar"
                      value={formData.communityName}
                      onChange={(e) => updateForm("communityName", e.target.value)}
                      className="bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500"
                    />
                  </div>

                  {/* Administrative Address Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-300">Provinsi *</label>
                      <Input
                        value={formData.province}
                        onChange={(e) => updateForm("province", e.target.value)}
                        className="bg-slate-950/60 border-slate-800 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-300">Kota / Kabupaten *</label>
                      <Input
                        value={formData.regency}
                        onChange={(e) => updateForm("regency", e.target.value)}
                        className="bg-slate-950/60 border-slate-800 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-300">Kecamatan *</label>
                      <Input
                        value={formData.district}
                        onChange={(e) => updateForm("district", e.target.value)}
                        className="bg-slate-950/60 border-slate-800 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-300">Kelurahan / Desa *</label>
                      <Input
                        value={formData.urban}
                        onChange={(e) => updateForm("urban", e.target.value)}
                        className="bg-slate-950/60 border-slate-800 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-300">RT / RW *</label>
                      <Input
                        value={formData.neighborhood}
                        onChange={(e) => updateForm("neighborhood", e.target.value)}
                        className="bg-slate-950/60 border-slate-800 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep(1)}
                    className="text-slate-400 hover:text-white"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
                  </Button>
                  <Button
                    onClick={handleNextStep}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-5 rounded-xl gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    Lanjut: Pilih Paket
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: PAKET LANGGANAN & CHECKOUT */}
            {step === 3 && (
              <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-emerald-400" />
                    Pilih Paket Langganan WargaIn
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Model berbayar murni (Zero-Free Tier) dengan jaminan keamanan & keandalan layanan tinggi.
                  </p>
                </div>

                {/* Tier Selection Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* RT STANDARD */}
                  <div
                    onClick={() => updateForm("planTier", "RT_STANDARD")}
                    className={`cursor-pointer rounded-2xl p-5 border transition-all relative flex flex-col justify-between ${
                      formData.planTier === "RT_STANDARD"
                        ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/40"
                        : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                    }`}
                  >
                    <div className="space-y-3">
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                        1 RT Mandiri
                      </Badge>
                      <div>
                        <h3 className="text-lg font-bold text-white">RT STANDARD</h3>
                        <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                          Rp 50.000 <span className="text-xs font-normal text-slate-400">/bln</span>
                        </div>
                      </div>
                      <ul className="text-xs text-slate-300 space-y-2 pt-2 border-t border-slate-800">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Maksimal <strong>150 KK</strong>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 300 Transaksi Kas / bln
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 2 Akun Pengurus Admin
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* RW PRO */}
                  <div
                    onClick={() => updateForm("planTier", "RW_PRO")}
                    className={`cursor-pointer rounded-2xl p-5 border transition-all relative flex flex-col justify-between ${
                      formData.planTier === "RW_PRO"
                        ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/40"
                        : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                    }`}
                  >
                    <span className="absolute -top-2.5 right-4 bg-emerald-500 text-slate-950 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Rekomendasi RW
                    </span>
                    <div className="space-y-3">
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40">
                        1 RW (s/d 8 RT)
                      </Badge>
                      <div>
                        <h3 className="text-lg font-bold text-white">RW PRO</h3>
                        <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                          Rp 175.000 <span className="text-xs font-normal text-slate-400">/bln</span>
                        </div>
                      </div>
                      <ul className="text-xs text-slate-300 space-y-2 pt-2 border-t border-slate-800">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Maksimal <strong>600 KK</strong>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 1.500 Transaksi Kas / bln
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 6 Akun Multi-RT
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* ENTERPRISE */}
                  <div
                    onClick={() => updateForm("planTier", "ENTERPRISE")}
                    className={`cursor-pointer rounded-2xl p-5 border transition-all relative flex flex-col justify-between ${
                      formData.planTier === "ENTERPRISE"
                        ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/40"
                        : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                    }`}
                  >
                    <div className="space-y-3">
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40">
                        Klaster / Perumahan
                      </Badge>
                      <div>
                        <h3 className="text-lg font-bold text-white">ENTERPRISE</h3>
                        <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                          Rp 450.000 <span className="text-xs font-normal text-slate-400">/bln</span>
                        </div>
                      </div>
                      <ul className="text-xs text-slate-300 space-y-2 pt-2 border-t border-slate-800">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> <strong>Unlimited KK</strong> & Surat
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Cold Storage Selamanya
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Multi-Level Custom Roles
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <span>Status awal akun setelah pendaftaran: <strong className="text-amber-400">Pending Payment (Terkunci)</strong></span>
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep(2)}
                    className="text-slate-400 hover:text-white"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-8 py-6 rounded-xl gap-2 shadow-xl shadow-emerald-600/30"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Mendaftarkan...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Selesaikan Pendaftaran & Lanjut Bayar
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full text-center text-xs text-slate-500 py-4">
        © 2026 WargaIn Sarana Digital. Seluruh hak cipta dilindungi.
      </footer>
    </div>
  );
}
