"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  QrCode,
  CreditCard,
  Upload,
  CheckCircle2,
  Copy,
  Sparkles,
  Lock,
  Building2,
  Users,
  FileText,
  Loader2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getClientSession, setClientSession } from "@/lib/auth-session";
import { SubscriptionTierCode } from "@/lib/types/auth";
import { toast } from "sonner";

interface SubscriptionPaywallModalProps {
  communityId?: string;
  communityName?: string;
  currentTier?: SubscriptionTierCode;
}

export default function SubscriptionPaywallModal({
  communityId,
  communityName,
  currentTier = "RT_STANDARD",
}: SubscriptionPaywallModalProps) {
  const [selectedTier, setSelectedTier] = useState<SubscriptionTierCode>(currentTier);
  const [paymentMethod, setPaymentMethod] = useState<"QRIS" | "BCA_VA" | "MANUAL">("QRIS");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<any>(null);

  React.useEffect(() => {
    setMounted(true);
    setSession(getClientSession());

    const handleUpdate = () => setSession(getClientSession());
    window.addEventListener("wargain_session_updated", handleUpdate);
    return () => window.removeEventListener("wargain_session_updated", handleUpdate);
  }, []);

  const activeCommunityName = communityName || (mounted && session?.communityName) || "RT 04 / RW 09 Mekar";

  const tierPrices: Record<SubscriptionTierCode, { price: string; num: number; desc: string; maxKk: string }> = {
    RT_STANDARD: {
      price: "Rp 50.000",
      num: 50000,
      desc: "1 RT Mandiri",
      maxKk: "Maks. 150 KK",
    },
    RW_PRO: {
      price: "Rp 175.000",
      num: 175000,
      desc: "1 RW (s/d 8 RT)",
      maxKk: "Maks. 600 KK",
    },
    ENTERPRISE: {
      price: "Rp 450.000",
      num: 450000,
      desc: "Klaster / Kawasan Besar",
      maxKk: "Unlimited KK",
    },
  };

  const handleCopyVa = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Nomor Virtual Account berhasil disalin!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmPayment = async () => {
    setIsSubmitting(true);
    toast.loading("Memverifikasi transaksi pembayaran...", { id: "pay-toast" });

    try {
      const res = await fetch("/api/subscription/confirm-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId: communityId || session?.communityId || "comm_101",
          paymentMethod,
          paymentProofUrl: receiptFile ? receiptFile.name : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal mengonfirmasi pembayaran");
      }

      // Simulate step verification delay for high-tech experience
      await new Promise((r) => setTimeout(r, 1200));

      toast.success("Pembayaran Berhasil! Akses Layanan WargaIn Telah Aktif.", {
        id: "pay-toast",
        description: "Status komunitas Anda telah diubah menjadi AKTIF.",
      });

      // Update Session
      if (session) {
        setClientSession({
          ...session,
          isTenantActive: true,
          planStatus: "ACTIVE",
          planTier: selectedTier,
        });
      } else {
        setClientSession({
          userId: "usr_101",
          email: "admin@wargain.id",
          fullName: "Ketua RT",
          communityId: communityId || "comm_101",
          communityName: activeCommunityName,
          communitySlug: "rt04-rw09",
          role: "TENANT_ADMIN",
          isTenantActive: true,
          planTier: selectedTier,
          planStatus: "ACTIVE",
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "Terjadi kesalahan pembayaran", { id: "pay-toast" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-auto animate-in fade-in zoom-in-95 duration-200">
      <Card className="border border-emerald-500/30 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden text-card-foreground">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white p-6 md:p-8 relative overflow-hidden border-b border-emerald-500/20">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Lock className="w-48 h-48 text-emerald-400" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/40 px-3 py-1 font-mono text-xs uppercase tracking-wider">
                  <ShieldAlert className="w-3.5 h-3.5 mr-1.5 inline text-amber-400" />
                  Akses Terkunci (Zero-Free Tier)
                </Badge>
                <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs">
                  {activeCommunityName}
                </Badge>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                Aktifkan Layanan WargaIn Komunitas Anda
              </h2>
              <p className="text-slate-300 text-sm max-w-2xl">
                Selesaikan transaksi pembayaran langganan untuk membuka penuh fitur kas transparan, tanda tangan surat digital, dan sistem SOS warga.
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-6 md:p-8 space-y-8">
          {/* Step 1: Tier Selection */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              1. Pilih / Konfirmasi Paket Langganan
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(["RT_STANDARD", "RW_PRO", "ENTERPRISE"] as SubscriptionTierCode[]).map((tier) => {
                const info = tierPrices[tier];
                const isSelected = selectedTier === tier;
                return (
                  <div
                    key={tier}
                    onClick={() => setSelectedTier(tier)}
                    className={`cursor-pointer rounded-2xl p-4 border transition-all duration-200 relative ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-500/10 dark:bg-emerald-950/40 shadow-md ring-2 ring-emerald-600/30"
                        : "border-border/60 hover:border-emerald-500/40 bg-card"
                    }`}
                  >
                    {tier === "RT_STANDARD" && (
                      <span className="absolute -top-2.5 right-3 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Populer
                      </span>
                    )}
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-muted-foreground uppercase">{tier.replace("_", " ")}</div>
                      <div className="text-xl font-extrabold text-foreground">{info.price} <span className="text-xs font-normal text-muted-foreground">/bln</span></div>
                      <div className="text-xs text-muted-foreground">{info.desc} • <span className="font-semibold text-emerald-600 dark:text-emerald-400">{info.maxKk}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Payment Method Tabs */}
          <div className="space-y-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              2. Pilih Metode Pembayaran
            </label>

            <Tabs defaultValue="QRIS" onValueChange={(val) => setPaymentMethod(val as any)} className="w-full">
              <TabsList className="grid grid-cols-3 w-full p-1 bg-muted rounded-xl">
                <TabsTrigger value="QRIS" className="rounded-lg text-xs md:text-sm font-medium py-2.5 flex items-center justify-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  QRIS Dinamis
                </TabsTrigger>
                <TabsTrigger value="BCA_VA" className="rounded-lg text-xs md:text-sm font-medium py-2.5 flex items-center justify-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  BCA Virtual Account
                </TabsTrigger>
                <TabsTrigger value="MANUAL" className="rounded-lg text-xs md:text-sm font-medium py-2.5 flex items-center justify-center gap-1.5">
                  <Upload className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Transfer & Struk
                </TabsTrigger>
              </TabsList>

              {/* QRIS Tab */}
              <TabsContent value="QRIS" className="mt-4 space-y-4">
                <div className="bg-muted/40 border border-border/80 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6">
                  {/* Mock QR Code Graphic */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-md flex flex-col items-center justify-center">
                    <div className="w-44 h-44 bg-slate-900 rounded-lg p-2 flex items-center justify-center relative overflow-hidden">
                      {/* Stylized QR Code SVG mockup */}
                      <svg className="w-full h-full text-white" viewBox="0 0 100 100" fill="currentColor">
                        <rect x="5" y="5" width="30" height="30" />
                        <rect x="10" y="10" width="20" height="20" fill="black" />
                        <rect x="65" y="5" width="30" height="30" />
                        <rect x="70" y="10" width="20" height="20" fill="black" />
                        <rect x="5" y="65" width="30" height="30" />
                        <rect x="10" y="70" width="20" height="20" fill="black" />
                        <rect x="40" y="40" width="20" height="20" />
                        <rect x="65" y="65" width="15" height="15" />
                        <rect x="85" y="75" width="10" height="15" />
                        <rect x="40" y="70" width="15" height="25" />
                      </svg>
                      <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center">
                        <span className="bg-white text-emerald-700 font-extrabold text-[10px] px-2 py-0.5 rounded shadow">QRIS</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono mt-2">NMID: ID1029381920381</span>
                  </div>

                  <div className="space-y-3 flex-1 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifikasi Otomatis Realtime
                    </div>
                    <h4 className="text-lg font-bold text-foreground">Scan QRIS Menggunakan Aplikasi E-Wallet / Mobile Banking</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Dapat di-scan melalui BCA Mobile, Mandiri Livin, GoPay, OVO, ShopeePay, Dana, LinkAja, & seluruh aplikasi perbankan berlogo QRIS.
                    </p>
                    <div className="pt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="bg-card border px-2.5 py-1 rounded-md">Total Tagihan: <strong className="text-foreground">{tierPrices[selectedTier].price}</strong></span>
                      <span className="bg-card border px-2.5 py-1 rounded-md font-mono text-amber-600 dark:text-amber-400">Batas Waktu: 14:59 min</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* BCA VA Tab */}
              <TabsContent value="BCA_VA" className="mt-4 space-y-4">
                <div className="bg-muted/40 border border-border/80 rounded-2xl p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border">
                    <div>
                      <div className="text-xs text-muted-foreground font-medium uppercase">Nomor BCA Virtual Account</div>
                      <div className="text-2xl font-mono font-extrabold text-foreground tracking-wider mt-1">
                        8820 9182 3019 4410
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">a.n. PT WargaIn Sarana Digital</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyVa("8820918230194410")}
                      className="gap-2 border-emerald-600/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                    >
                      {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      {copied ? "Tersalin!" : "Salin VA"}
                    </Button>
                  </div>

                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground">Petunjuk Pembayaran ATM / m-BCA:</p>
                    <ol className="list-decimal list-inside space-y-1 pl-1">
                      <li>Buka aplikasi m-BCA atau Kunjungi ATM BCA terdekat.</li>
                      <li>Pilih menu <strong>m-Transfer &gt; BCA Virtual Account</strong>.</li>
                      <li>Masukkan kode Virtual Account <strong>8820918230194410</strong>.</li>
                      <li>Pastikan nominal pembayaran sebesar <strong>{tierPrices[selectedTier].price}</strong>.</li>
                      <li>Konfirmasi pembayaran lalu simpan buktinya.</li>
                    </ol>
                  </div>
                </div>
              </TabsContent>

              {/* Manual Transfer Tab */}
              <TabsContent value="MANUAL" className="mt-4 space-y-4">
                <div className="bg-muted/40 border border-border/80 rounded-2xl p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-card p-4 rounded-xl border space-y-1">
                      <div className="text-xs text-muted-foreground uppercase font-medium">Bank Mandiri</div>
                      <div className="text-lg font-mono font-bold text-foreground">127-00-1182390-1</div>
                      <div className="text-xs text-muted-foreground">a.n. PT WargaIn Sarana Digital</div>
                    </div>
                    <div className="bg-card p-4 rounded-xl border space-y-1">
                      <div className="text-xs text-muted-foreground uppercase font-medium">Bank BCA</div>
                      <div className="text-lg font-mono font-bold text-foreground">527-1092-881</div>
                      <div className="text-xs text-muted-foreground">a.n. PT WargaIn Sarana Digital</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground">Upload Struk / Bukti Transfer (.jpg, .png, .pdf)</label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                    />
                    {receiptFile && (
                      <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> File terpilih: {receiptFile.name}
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Action Confirmation Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/60">
            <div className="text-xs text-muted-foreground">
              Tagihan: <strong className="text-foreground text-base">{tierPrices[selectedTier].price}</strong> / bulan
            </div>
            <Button
              onClick={handleConfirmPayment}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 py-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Konfirmasi Pembayaran & Aktifkan Layanan
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
