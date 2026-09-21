"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { setClientSession } from "@/lib/auth-session";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal melakukan login");
      }

      toast.success("Login Berhasil!", {
        description: `Selamat datang kembali, ${data.session?.fullName || "Pengurus"}!`,
      });

      if (data.session) {
        setClientSession(data.session);
      }

      setTimeout(() => {
        router.push("/feed");
      }, 600);
    } catch (err: any) {
      setErrorMessage(err?.message || "Kredensial login tidak valid.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 text-foreground flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* Header */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-4">
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
        <Link href="/register">
          <Button variant="outline" size="sm" className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10">
            Daftar Komunitas Baru
          </Button>
        </Link>
      </header>

      {/* Main Login Card */}
      <main className="max-w-md mx-auto w-full my-auto">
        <Card className="border border-emerald-500/20 bg-slate-900/90 backdrop-blur-2xl shadow-2xl text-slate-100 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 p-6 text-center border-b border-emerald-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Sparkles className="w-32 h-32 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Masuk ke Portal WargaIn</h1>
            <p className="text-xs text-slate-300 mt-1">
              Akses sistem informasi kas, surat, & komunitas RT/RW Anda
            </p>
          </div>

          <CardContent className="p-6 sm:p-8 space-y-6">
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Alamat Email Pengurus / Warga</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <Input
                    type="email"
                    required
                    placeholder="admin@wargain.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Kata Sandi</label>
                  <a href="#" className="text-[11px] text-emerald-400 hover:underline">
                    Lupa sandi?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <Input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-5 rounded-xl gap-2 shadow-lg shadow-emerald-600/25 mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Memproses Login...
                  </>
                ) : (
                  <>
                    Masuk ke Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="pt-2 text-center text-xs text-slate-400">
              Belum memiliki akun komunitas?{" "}
              <Link href="/register" className="text-emerald-400 font-semibold hover:underline">
                Daftarkan RT/RW Sekarang
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full text-center text-xs text-slate-500 py-4">
        © 2026 WargaIn Sarana Digital. Terenkripsi & Terlindungi.
      </footer>
    </div>
  );
}
