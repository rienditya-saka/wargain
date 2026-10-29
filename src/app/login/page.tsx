"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { Mail, Lock, ArrowRight, AlertCircle, Loader2, Eye, EyeOff, Check, ShieldCheck, Fingerprint, Smartphone } from "lucide-react";
import { setClientSession } from "@/lib/auth-session";
import { toast } from "sonner";
import { AuthLayout, FloatingInput, GlassCard, GlowButton, MobileTicker, Showcase } from "@/components/auth/auth-shell";

const REMEMBER_KEY = "wargain:last-email";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [remember, setRemember] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const shake = useAnimationControls();

  useEffect(() => {
    try {
      const last = localStorage.getItem(REMEMBER_KEY);
      if (last) setEmail(last);
    } catch {}
  }, []);

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

      try {
        if (remember) localStorage.setItem(REMEMBER_KEY, email);
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {}

      if (data.session) {
        setClientSession(data.session);
      }
      const name: string = data.session?.fullName || "Pengurus";
      setSuccess(name.split(" ")[0]);
      toast.success("Login Berhasil!", { description: `Selamat datang kembali, ${name}!` });

      // return to the page that sent us here (e.g. a scanned QR), same-origin paths only
      const next = new URLSearchParams(window.location.search).get("next");
      const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/feed";
      setTimeout(() => {
        router.push(target);
      }, 900);
    } catch (err: any) {
      setErrorMessage(err?.message || "Kredensial login tidak valid.");
      shake.start({ x: [0, -12, 12, -8, 8, -4, 0], transition: { duration: 0.45 } });
    } finally {
      setIsLoading(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState?.("CapsLock") ?? false);

  return (
    <AuthLayout
      showcase={
        <Showcase
          headline={
            <>
              Lingkungan rukun,
              <br />
              <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-sky-300 bg-clip-text text-transparent">semua di satu genggaman.</span>
            </>
          }
          sub="Iuran & kas transparan, surat pengantar online, tombol SOS, posyandu, musyawarah, sampai jualan tetangga — tanpa drama grup WhatsApp yang tertimbun."
        />
      }
      topRight={
        <Link href="/register" className="h-10 px-4 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-white/90 flex items-center gap-1.5 transition-colors">
          Daftarkan RT/RW <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      }
    >
      {/* phone hero */}
      <div className="lg:hidden mb-6 space-y-3">
        <h1 className="text-[34px] leading-[1.05] font-black tracking-tight">
          Halo lagi, <span className="bg-gradient-to-r from-emerald-300 to-sky-300 bg-clip-text text-transparent">tetangga!</span> 👋
        </h1>
        <MobileTicker />
      </div>

      <motion.div animate={shake} className="w-full max-w-[460px] mx-auto lg:mx-0 lg:ml-auto">
        <GlassCard>
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div key="ok" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-10 text-center space-y-4">
                <div className="relative mx-auto w-20 h-20">
                  <motion.span className="absolute inset-0 rounded-full bg-emerald-400/30" initial={{ scale: 0.6, opacity: 1 }} animate={{ scale: 2.2, opacity: 0 }} transition={{ duration: 1 }} />
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12 }} className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/40">
                    <Check className="w-10 h-10" strokeWidth={3} />
                  </motion.div>
                </div>
                <div>
                  <p className="text-2xl font-black">Selamat datang, {success}!</p>
                  <p className="text-sm text-white/60 mt-1">Menyiapkan beranda warga Anda…</p>
                </div>
                <div className="h-1 rounded-full bg-white/10 overflow-hidden max-w-[200px] mx-auto">
                  <motion.div className="h-full bg-emerald-400" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.9 }} />
                </div>
              </motion.div>
            ) : (
              <motion.div key="form" exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="space-y-1.5">
                  <div className="hidden lg:flex w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400/30 to-teal-500/10 border border-emerald-400/30 items-center justify-center mb-4">
                    <Fingerprint className="w-6 h-6 text-emerald-300" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">Masuk ke WargaIn</h2>
                  <p className="text-sm text-white/55">Satu akun untuk pengurus maupun warga.</p>
                </div>

                <AnimatePresence>
                  {errorMessage && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div role="alert" className="p-3.5 rounded-2xl bg-red-500/10 border border-red-400/30 text-red-200 text-sm flex items-center gap-2.5">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleLogin} className="space-y-4">
                  <FloatingInput icon={Mail} label="Email" type="email" required autoComplete="email" inputMode="email" placeholder="admin@wargain.id" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <div className="space-y-1.5">
                    <FloatingInput
                      icon={Lock}
                      label="Kata sandi"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyUp={onKey}
                      onKeyDown={onKey}
                      trailing={
                        <button type="button" onClick={() => setShowPassword((v) => !v)} className="w-10 h-10 rounded-xl text-white/45 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors" aria-label={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}>
                          {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                        </button>
                      }
                    />
                    <AnimatePresence>
                      {capsLock && (
                        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[11px] font-bold text-amber-300 pl-1">
                          ⇪ Caps Lock aktif
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 text-white/65 cursor-pointer select-none">
                      <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4 rounded accent-emerald-500" />
                      Ingat email saya
                    </label>
                    <button type="button" onClick={() => toast("Lupa kata sandi?", { description: "Hubungi Sekretaris/Ketua RT Anda untuk mengatur ulang kata sandi akun." })} className="font-bold text-emerald-300 hover:text-emerald-200">
                      Lupa sandi?
                    </button>
                  </div>

                  <GlowButton type="submit" disabled={isLoading} className="shadow-xl shadow-emerald-600/30">
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Memeriksa akun…
                      </>
                    ) : (
                      <>
                        Masuk <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </GlowButton>
                </form>

                <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-white/55">
                  {(
                    [
                      [ShieldCheck, "Data terenkripsi"],
                      [Smartphone, "Bisa dipasang di HP"],
                      [Fingerprint, "Akses per peran"],
                    ] as const
                  ).map(([Icon, l]) => (
                    <div key={l} className="rounded-xl bg-white/[0.04] border border-white/5 py-2.5 flex flex-col items-center gap-1 text-center">
                      <Icon className="w-4 h-4 text-emerald-300" /> {l}
                    </div>
                  ))}
                </div>

                <p className="text-center text-sm text-white/55">
                  Pengurus RT/RW baru?{" "}
                  <Link href="/register" className="font-black text-emerald-300 hover:text-emerald-200">
                    Daftarkan komunitas →
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </motion.div>
    </AuthLayout>
  );
}
