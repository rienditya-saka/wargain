"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import {
  User, Mail, Lock, Phone, Building, MapPin, CheckCircle2, ArrowRight, ArrowLeft, Sparkles, ShieldCheck, AlertCircle, Loader2, Eye, EyeOff,
  Landmark, Home, Crown, Rocket, Check, Globe,
} from "lucide-react";
import { setClientSession } from "@/lib/auth-session";
import { SubscriptionTierCode } from "@/lib/types/auth";
import { toast } from "sonner";
import { AuthLayout, FloatingInput, GlassCard, GlowButton, Showcase } from "@/components/auth/auth-shell";

type Step = 1 | 2 | 3;

const STEPS: { n: Step; label: string; icon: React.ElementType }[] = [
  { n: 1, label: "Pengurus", icon: User },
  { n: 2, label: "Wilayah", icon: MapPin },
  { n: 3, label: "Paket", icon: Crown },
];

const PLANS: { code: SubscriptionTierCode; name: string; price: string; scope: string; badge?: string; tone: string; icon: React.ElementType; features: React.ReactNode[] }[] = [
  {
    code: "RT_STANDARD",
    name: "RT Standard",
    price: "50.000",
    scope: "1 RT mandiri",
    tone: "from-emerald-400/25 to-teal-500/5",
    icon: Home,
    features: [<>Maksimal <b>150 KK</b></>, "300 transaksi kas / bln", "2 akun pengurus admin"],
  },
  {
    code: "RW_PRO",
    name: "RW Pro",
    price: "175.000",
    scope: "1 RW (s/d 8 RT)",
    badge: "Paling populer",
    tone: "from-amber-400/25 to-emerald-500/5",
    icon: Rocket,
    features: [<>Maksimal <b>600 KK</b></>, "1.500 transaksi kas / bln", "6 akun multi-RT"],
  },
  {
    code: "ENTERPRISE",
    name: "Enterprise",
    price: "450.000",
    scope: "Klaster / perumahan",
    tone: "from-violet-400/25 to-sky-500/5",
    icon: Crown,
    features: [<><b>Unlimited KK</b> & surat</>, "Cold storage selamanya", "Multi-level custom roles"],
  },
];

function passwordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { label: "Terlalu pendek", color: "bg-red-500", text: "text-red-300" },
    { label: "Lemah", color: "bg-red-400", text: "text-red-300" },
    { label: "Cukup", color: "bg-amber-400", text: "text-amber-300" },
    { label: "Bagus", color: "bg-lime-400", text: "text-lime-300" },
    { label: "Kuat", color: "bg-emerald-400", text: "text-emerald-300" },
    { label: "Sangat kuat", color: "bg-emerald-300", text: "text-emerald-200" },
  ];
  return { score: pw.length < 6 ? 0 : score, ...levels[pw.length < 6 ? 0 : score] };
}

const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-bold text-white/55 pl-1">{label}</span>
      {children}
    </label>
  );
}
const plainInput =
  "w-full h-12 px-4 rounded-2xl bg-white/[0.05] border border-white/10 text-sm text-white placeholder:text-white/25 outline-none focus:border-emerald-400/70 focus:bg-white/[0.08] focus:ring-4 focus:ring-emerald-500/15 transition-all";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [dir, setDir] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const shake = useAnimationControls();

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

  const strength = useMemo(() => passwordStrength(formData.password), [formData.password]);
  const slug = slugOf(formData.communityName);
  const plan = PLANS.find((p) => p.code === formData.planTier)!;

  const fail = (msg: string) => {
    setErrorMessage(msg);
    shake.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.4 } });
  };

  const goTo = (s: Step) => {
    setErrorMessage("");
    setDir(s > step ? 1 : -1);
    setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextStep = (e?: React.FormEvent) => {
    e?.preventDefault();
    setErrorMessage("");
    if (step === 1) {
      if (!formData.fullName || !formData.email || !formData.password || !formData.phone) return fail("Mohon lengkapi seluruh data akun pengurus.");
      if (formData.password.length < 6) return fail("Kata sandi minimal 6 karakter.");
      goTo(2);
    } else if (step === 2) {
      if (!formData.communityName || !formData.province || !formData.regency || !formData.district || !formData.urban || !formData.neighborhood) {
        return fail("Mohon lengkapi bidang data wilayah/komunitas.");
      }
      goTo(3);
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
      setDone(true);

      setTimeout(() => {
        router.push("/feed");
      }, 1400);
    } catch (err: any) {
      fail(err?.message || "Terjadi kesalahan pada sistem.");
    } finally {
      setIsLoading(false);
    }
  };

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d * 40 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d * -40 }),
  };

  const backBtn = (to: Step) => (
    <button type="button" onClick={() => goTo(to)} className="h-14 px-5 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/10 text-sm font-bold text-white/80 flex items-center gap-2 shrink-0 transition-colors">
      <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Kembali</span>
    </button>
  );

  return (
    <AuthLayout
      showcase={
        <Showcase
          headline={
            <>
              Digitalkan RT/RW Anda
              <br />
              <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-sky-300 bg-clip-text text-transparent">dalam 3 menit.</span>
            </>
          }
          sub="Daftarkan komunitas, undang warga, dan langsung pakai: kas & iuran, surat, keamanan, posyandu, musyawarah, sampai pasar warga."
        />
      }
      topRight={
        <Link href="/login" className="h-10 px-4 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-white/90 flex items-center gap-1.5 transition-colors">
          Sudah punya akun? <span className="text-emerald-300">Masuk</span>
        </Link>
      }
    >
      <div className="lg:hidden mb-5">
        <h1 className="text-[32px] leading-[1.05] font-black tracking-tight">
          Daftarkan <span className="bg-gradient-to-r from-emerald-300 to-sky-300 bg-clip-text text-transparent">RT/RW</span> Anda ✨
        </h1>
        <p className="text-sm text-white/55 mt-2">3 langkah singkat, langsung siap dipakai warga.</p>
      </div>

      <motion.div animate={shake} className="w-full max-w-[560px] mx-auto lg:mx-0 lg:ml-auto">
        <GlassCard>
          {done ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-10 text-center space-y-4 relative overflow-hidden">
              {Array.from({ length: 18 }).map((_, i) => (
                <motion.span
                  key={i}
                  className="absolute left-1/2 top-16 w-2 h-3 rounded-sm"
                  style={{ background: ["#34d399", "#5eead4", "#7dd3fc", "#fcd34d", "#f0abfc"][i % 5] }}
                  initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                  animate={{ x: Math.cos((i / 18) * Math.PI * 2) * (90 + (i % 3) * 40), y: Math.sin((i / 18) * Math.PI * 2) * (70 + (i % 4) * 25) + 60, opacity: 0, rotate: 360 }}
                  transition={{ duration: 1.3, ease: "easeOut" }}
                />
              ))}
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 11 }} className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/40">
                <Check className="w-10 h-10" strokeWidth={3} />
              </motion.div>
              <p className="text-2xl font-black">{formData.communityName} siap! 🎉</p>
              <p className="text-sm text-white/60">Menyiapkan portal komunitas Anda…</p>
            </motion.div>
          ) : (
            <>
              {/* stepper */}
              <div className="flex items-center mb-7">
                {STEPS.map((s, i) => {
                  const Icon = s.icon;
                  const state = step > s.n ? "done" : step === s.n ? "now" : "todo";
                  return (
                    <React.Fragment key={s.n}>
                      <button type="button" disabled={s.n > step} onClick={() => s.n < step && goTo(s.n)} className="flex items-center gap-2 shrink-0 disabled:cursor-default">
                        <span className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${state === "todo" ? "bg-white/5 text-white/35 border border-white/10" : "bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/30"}`}>
                          {state === "now" && <span className="absolute inset-0 rounded-2xl ring-4 ring-emerald-400/25 animate-pulse" />}
                          {state === "done" ? <Check className="w-5 h-5" strokeWidth={3} /> : <Icon className="w-[18px] h-[18px]" />}
                        </span>
                        <span className={`hidden sm:block text-xs font-bold ${state === "todo" ? "text-white/35" : "text-white"}`}>{s.label}</span>
                      </button>
                      {i < STEPS.length - 1 && (
                        <div className="flex-1 h-1 mx-2 sm:mx-3 rounded-full bg-white/10 overflow-hidden">
                          <motion.div className="h-full bg-gradient-to-r from-emerald-400 to-teal-400" animate={{ width: step > s.n ? "100%" : "0%" }} transition={{ duration: 0.4 }} />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              <AnimatePresence>
                {errorMessage && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div role="alert" className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-400/30 text-red-200 text-sm flex items-center gap-2.5">
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait" custom={dir}>
                {step === 1 && (
                  <motion.form key="s1" custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} onSubmit={handleNextStep} className="space-y-5">
                    <div>
                      <p className="text-[11px] font-black tracking-widest text-emerald-300">LANGKAH 1 DARI 3</p>
                      <h2 className="text-2xl font-black tracking-tight mt-1">Akun pengurus utama</h2>
                      <p className="text-sm text-white/55 mt-1">Ketua RT/RW atau admin yang mengelola portal.</p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <FloatingInput icon={User} label="Nama lengkap" autoComplete="name" value={formData.fullName} onChange={(e) => updateForm("fullName", e.target.value)} />
                      <FloatingInput icon={Phone} label="No. WhatsApp" type="tel" inputMode="tel" autoComplete="tel" value={formData.phone} onChange={(e) => updateForm("phone", e.target.value.replace(/[^\d+ -]/g, ""))} />
                    </div>
                    <FloatingInput icon={Mail} label="Email" type="email" inputMode="email" autoComplete="email" value={formData.email} onChange={(e) => updateForm("email", e.target.value)} />
                    <div className="space-y-2">
                      <FloatingInput
                        icon={Lock}
                        label="Kata sandi (min. 6 karakter)"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={formData.password}
                        onChange={(e) => updateForm("password", e.target.value)}
                        trailing={
                          <button type="button" onClick={() => setShowPassword((v) => !v)} className="w-10 h-10 rounded-xl text-white/45 hover:text-white hover:bg-white/10 flex items-center justify-center" aria-label={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}>
                            {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                          </button>
                        }
                      />
                      {formData.password && (
                        <div className="flex items-center gap-3 px-1">
                          <div className="flex-1 grid grid-cols-5 gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <motion.span key={i} className={`h-1.5 rounded-full ${i <= strength.score ? strength.color : "bg-white/10"}`} initial={false} animate={{ scaleX: i <= strength.score ? 1 : 0.85 }} />
                            ))}
                          </div>
                          <span className={`text-[11px] font-bold ${strength.text}`}>{strength.label}</span>
                        </div>
                      )}
                    </div>
                    <GlowButton type="submit">
                      Lanjut: data wilayah <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </GlowButton>
                  </motion.form>
                )}

                {step === 2 && (
                  <motion.form key="s2" custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} onSubmit={handleNextStep} className="space-y-5">
                    <div>
                      <p className="text-[11px] font-black tracking-widest text-emerald-300">LANGKAH 2 DARI 3</p>
                      <h2 className="text-2xl font-black tracking-tight mt-1">Profil komunitas</h2>
                      <p className="text-sm text-white/55 mt-1">Nama dan wilayah administratif RT/RW Anda.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {(
                        [
                          ["government", Landmark, "RT / RW resmi", "Struktur pemerintahan lokal"],
                          ["community", Building, "Komunitas mandiri", "Cluster, paguyuban, perumahan"],
                        ] as const
                      ).map(([v, Icon, t, d]) => {
                        const on = formData.communityType === v;
                        return (
                          <button key={v} type="button" onClick={() => updateForm("communityType", v)} className={`relative text-left rounded-2xl p-4 border transition-all ${on ? "border-emerald-400/70 bg-emerald-400/10 ring-4 ring-emerald-500/15" : "border-white/10 bg-white/[0.03] hover:border-white/20"}`}>
                            {on && <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-400 text-[#052e1c] flex items-center justify-center"><Check className="w-3.5 h-3.5" strokeWidth={3} /></span>}
                            <Icon className={`w-6 h-6 ${on ? "text-emerald-300" : "text-white/40"}`} />
                            <p className="text-sm font-black mt-2">{t}</p>
                            <p className="text-[11px] text-white/50 mt-0.5">{d}</p>
                          </button>
                        );
                      })}
                    </div>
                    <div className="space-y-2">
                      <FloatingInput icon={Building} label="Nama komunitas / RT-RW" value={formData.communityName} onChange={(e) => updateForm("communityName", e.target.value)} />
                      <AnimatePresence>
                        {slug && (
                          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[11px] text-white/50 pl-1 flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-emerald-300" /> Alamat komunitas: <span className="font-mono text-emerald-200">wargain.id/{slug}</span>
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <Field label="Provinsi"><input value={formData.province} onChange={(e) => updateForm("province", e.target.value)} className={plainInput} /></Field>
                      <Field label="Kota / Kabupaten"><input value={formData.regency} onChange={(e) => updateForm("regency", e.target.value)} className={plainInput} /></Field>
                      <Field label="Kecamatan"><input value={formData.district} onChange={(e) => updateForm("district", e.target.value)} className={plainInput} /></Field>
                      <Field label="Kelurahan / Desa"><input value={formData.urban} onChange={(e) => updateForm("urban", e.target.value)} className={plainInput} /></Field>
                      <Field label="RT / RW"><input value={formData.neighborhood} onChange={(e) => updateForm("neighborhood", e.target.value)} className={plainInput} /></Field>
                    </div>
                    <div className="flex gap-3 pt-1">
                      {backBtn(1)}
                      <GlowButton type="submit">
                        Lanjut: pilih paket <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </GlowButton>
                    </div>
                  </motion.form>
                )}

                {step === 3 && (
                  <motion.form key="s3" custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <p className="text-[11px] font-black tracking-widest text-emerald-300">LANGKAH 3 DARI 3</p>
                      <h2 className="text-2xl font-black tracking-tight mt-1">Pilih paket</h2>
                      <p className="text-sm text-white/55 mt-1">Bayar bulanan, bisa naik paket kapan saja.</p>
                    </div>
                    <div className="space-y-3">
                      {PLANS.map((p) => {
                        const on = formData.planTier === p.code;
                        const Icon = p.icon;
                        return (
                          <motion.button
                            key={p.code}
                            type="button"
                            whileTap={{ scale: 0.99 }}
                            onClick={() => updateForm("planTier", p.code)}
                            className={`relative w-full text-left rounded-2xl p-4 border transition-all bg-gradient-to-br ${on ? `${p.tone} border-emerald-400/70 ring-4 ring-emerald-500/15` : "from-white/[0.03] to-transparent border-white/10 hover:border-white/20"}`}
                          >
                            {p.badge && <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-300 to-orange-400 text-[#3b1d00] text-[10px] font-black uppercase tracking-wider shadow">{p.badge}</span>}
                            <div className="flex items-start gap-3">
                              <span className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${on ? "bg-emerald-400 text-[#052e1c]" : "bg-white/5 text-white/50"}`}><Icon className="w-5 h-5" /></span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                                  <p className="text-base font-black">{p.name}</p>
                                  <p className="text-lg font-black">Rp {p.price}<span className="text-xs font-bold text-white/45">/bln</span></p>
                                </div>
                                <p className="text-[11px] text-white/50">{p.scope}</p>
                                <AnimatePresence initial={false}>
                                  {on && (
                                    <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden text-xs text-white/75 space-y-1 mt-2">
                                      {p.features.map((f, i) => (
                                        <li key={i} className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" /> {f}</li>
                                      ))}
                                    </motion.ul>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2 text-xs">
                      <p className="text-[10px] font-black tracking-widest text-white/45">RINGKASAN</p>
                      <div className="flex justify-between gap-3"><span className="text-white/50">Komunitas</span><span className="font-bold text-right truncate">{formData.communityName}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-white/50">Wilayah</span><span className="font-bold text-right truncate">{formData.neighborhood}, {formData.urban}, {formData.regency}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-white/50">Admin</span><span className="font-bold text-right truncate">{formData.fullName} · {formData.email}</span></div>
                      <div className="flex justify-between gap-3 pt-2 border-t border-white/10"><span className="text-white/50">Paket</span><span className="font-black text-emerald-300">{plan.name} · Rp {plan.price}/bln</span></div>
                      <p className="flex items-center gap-1.5 text-[11px] text-amber-200/80 pt-1"><ShieldCheck className="w-3.5 h-3.5" /> Portal aktif setelah pembayaran langganan dikonfirmasi.</p>
                    </div>

                    <div className="flex gap-3">
                      {backBtn(2)}
                      <GlowButton type="submit" disabled={isLoading} className="shadow-xl shadow-emerald-600/30">
                        {isLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" /> Mendaftarkan…
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" /> Daftar & lanjut bayar
                          </>
                        )}
                      </GlowButton>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </>
          )}
        </GlassCard>
      </motion.div>
    </AuthLayout>
  );
}
