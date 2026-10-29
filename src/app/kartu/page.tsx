"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, BadgeCheck, CheckCircle2, Home, RefreshCw, ShieldCheck, Sun, Users, XCircle } from "lucide-react";
import { getClientSession } from "@/lib/auth-session";
import type { SessionTenant } from "@/lib/types/auth";

interface Card {
  fullName: string;
  role: string;
  isPengurus: boolean;
  communityName: string;
  houseBlock: string | null;
  address: string | null;
  occupancy: string | null;
  familyRole: string | null;
  members: { name: string; role: string; age: number }[];
  memberSince: string;
  cardNo: string;
}

const ROLE_LABEL: Record<string, string> = { KETUA: "Ketua RT", SEKRETARIS: "Sekretaris RT", BENDAHARA: "Bendahara RT", HUMAS: "Humas RT", TENANT_ADMIN: "Admin", ANGGOTA: "Warga" };
const FAMILY_LABEL: Record<string, string> = { KEPALA_KELUARGA: "Kepala Keluarga", ISTRI: "Istri", SUAMI: "Suami", ANAK: "Anak", FAMILI_LAIN: "Famili" };
const OCCUPANCY_LABEL: Record<string, string> = { DITEMPATI: "Pemilik/penghuni tetap", DISEWAKAN: "Penyewa/kontrak", KOSONG: "Rumah kosong", RENOVASI: "Renovasi" };

export default function KartuPage() {
  return (
    <Suspense fallback={null}>
      <KartuContent />
    </Suspense>
  );
}

function KartuContent() {
  const router = useRouter();
  const params = useSearchParams();
  const verifyToken = params.get("v");
  const [session, setSession] = useState<SessionTenant | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = getClientSession();
    setSession(s);
    setReady(true);
    if (!s) router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  }, [router]);

  if (!ready || !session) return null;
  return (
    <div className="min-h-screen bg-[#0B130E] text-white font-sans overflow-x-hidden pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="px-4 py-3 flex items-center gap-3 max-w-md mx-auto">
        <Link href="/feed" className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center" aria-label="Kembali"><ArrowLeft className="w-5 h-5" /></Link>
        <p className="font-extrabold">{verifyToken ? "Verifikasi Kartu Warga" : "Kartu Warga Digital"}</p>
      </header>
      <main className="max-w-md mx-auto px-4">{verifyToken ? <Verify token={verifyToken} viewerId={session.userId} /> : <MyCard userId={session.userId} />}</main>
    </div>
  );
}

function MyCard({ userId }: { userId: string }) {
  const [card, setCard] = useState<Card | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [validUntil, setValidUntil] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const load = React.useCallback(async () => {
    try {
      const r = await fetch(`/api/kartu?userId=${encodeURIComponent(userId)}`).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      setCard(r.card);
      setValidUntil(r.validUntil);
      setQr(await QRCode.toDataURL(`${window.location.origin}/kartu?v=${r.token}`, { width: 520, margin: 1, errorCorrectionLevel: "M", color: { dark: "#052e16", light: "#ffffff" } }));
    } catch (e: any) {
      setError(e.message);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  // roll over to a fresh QR at midnight WIB
  useEffect(() => {
    if (validUntil && now >= new Date(validUntil).getTime()) load();
  }, [now, validUntil, load]);

  if (error) return <p className="text-center text-sm text-red-400 py-10">{error}</p>;
  if (!card) return <div className="aspect-[1/1.45] rounded-[28px] bg-white/5 animate-pulse" />;

  const clock = new Date(now).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Jakarta" });
  return (
    <div className="space-y-4">
      <motion.div initial={{ rotateX: 12, opacity: 0, y: 20 }} animate={{ rotateX: 0, opacity: 1, y: 0 }} transition={{ type: "spring", damping: 18 }} className="relative rounded-[28px] overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-600 to-sky-700 p-5 shadow-2xl shadow-emerald-900/50">
        {/* animated sheen: a live card, not a screenshot */}
        <motion.div aria-hidden className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-[-20deg]" animate={{ x: ["0%", "400%"] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }} />
        <span aria-hidden className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white text-emerald-700 flex items-center justify-center font-black text-sm">W</div>
            <div className="leading-tight">
              <p className="text-[10px] font-bold opacity-90">KARTU WARGA DIGITAL</p>
              <p className="text-xs font-black truncate max-w-[180px]">{card.communityName}</p>
            </div>
          </div>
          <span className="px-2 py-1 rounded-full bg-white/20 text-[10px] font-black flex items-center gap-1"><BadgeCheck className="w-3.5 h-3.5" /> Terverifikasi</span>
        </div>

        <div className="relative mt-5 bg-white rounded-3xl p-3 mx-auto w-[82%] aspect-square shadow-inner">
          {qr ? <img src={qr} alt="QR kartu warga" className="w-full h-full" /> : <div className="w-full h-full rounded-2xl bg-neutral-100 animate-pulse" />}
        </div>

        <div className="relative mt-4 text-center">
          <p className="text-xl font-black leading-tight">{card.fullName}</p>
          <p className="text-xs font-bold opacity-90 mt-0.5">{card.isPengurus ? ROLE_LABEL[card.role] ?? card.role : card.familyRole ? FAMILY_LABEL[card.familyRole] ?? "Warga" : "Warga"}{card.houseBlock ? ` · ${card.houseBlock}` : ""}</p>
        </div>
        <div className="relative mt-4 flex items-center justify-between text-[10px] font-bold">
          <span className="opacity-90">{card.cardNo}</span>
          <span className="px-2 py-1 rounded-lg bg-black/20 tabular-nums">{clock} WIB</span>
        </div>
      </motion.div>

      <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-start gap-2.5 text-xs">
        <Sun className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
        <p className="text-white/80">Tunjukkan ke satpam/pengurus saat diminta. QR berganti otomatis tiap hari — tangkapan layar kemarin tidak berlaku. Naikkan kecerahan layar agar mudah dipindai.</p>
      </div>

      <section className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2">
        <p className="text-xs font-black flex items-center gap-1.5"><Home className="w-4 h-4 text-emerald-400" /> Rumah</p>
        <p className="text-sm font-bold">{card.houseBlock ?? "-"}</p>
        {card.address && <p className="text-xs text-white/70">{card.address}</p>}
        {card.occupancy && <p className="text-[11px] text-white/60">{OCCUPANCY_LABEL[card.occupancy] ?? card.occupancy}</p>}
      </section>

      {card.members.length > 0 && (
        <section className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2">
          <p className="text-xs font-black flex items-center gap-1.5"><Users className="w-4 h-4 text-emerald-400" /> Anggota keluarga ({card.members.length})</p>
          {card.members.map((m, i) => (
            <div key={i} className="flex justify-between text-xs py-1 border-b border-white/5 last:border-0">
              <span className="font-semibold">{m.name}</span>
              <span className="text-white/60">{FAMILY_LABEL[m.role] ?? m.role} · {m.age} th</span>
            </div>
          ))}
        </section>
      )}
      <button onClick={load} className="w-full min-h-[44px] rounded-xl bg-white/10 text-xs font-bold flex items-center justify-center gap-1.5"><RefreshCw className="w-4 h-4" /> Muat ulang QR</button>
    </div>
  );
}

function Verify({ token, viewerId }: { token: string; viewerId: string }) {
  const [res, setRes] = useState<{ valid: boolean; reason?: string; card?: Partial<Card>; checkedAt?: string; error?: string } | null>(null);
  useEffect(() => {
    fetch(`/api/kartu?token=${encodeURIComponent(token)}&viewerId=${encodeURIComponent(viewerId)}`).then((r) => r.json()).then(setRes).catch(() => setRes({ valid: false, reason: "Gagal memverifikasi." }));
    if (navigator.vibrate) navigator.vibrate(60);
  }, [token, viewerId]);

  if (!res) return <div className="h-80 rounded-[28px] bg-white/5 animate-pulse" />;
  const ok = res.valid;
  const c = res.card;
  return (
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-4">
      <div className={`rounded-[28px] p-6 text-center ${ok ? "bg-gradient-to-br from-emerald-500 to-teal-700" : "bg-gradient-to-br from-red-600 to-rose-800"}`}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }} className="w-20 h-20 mx-auto rounded-full bg-white/20 flex items-center justify-center">
          {ok ? <CheckCircle2 className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
        </motion.div>
        <p className="text-2xl font-black mt-3">{ok ? "WARGA TERVERIFIKASI" : "TIDAK VALID"}</p>
        <p className="text-sm opacity-90 mt-1">{ok ? `Dicek ${new Date(res.checkedAt!).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })} WIB` : res.reason ?? res.error}</p>
      </div>
      {c?.fullName && (
        <section className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-1.5">
          <p className="text-lg font-black">{c.fullName}</p>
          {ok && (
            <>
              <p className="text-sm text-white/80">{c.houseBlock ?? "-"}{c.address ? ` · ${c.address}` : ""}</p>
              <p className="text-xs text-white/60">{c.isPengurus ? ROLE_LABEL[c.role!] : FAMILY_LABEL[c.familyRole ?? ""] ?? "Warga"} · {c.communityName}</p>
              {c.occupancy && <p className="text-xs text-white/60">{OCCUPANCY_LABEL[c.occupancy] ?? c.occupancy}</p>}
              {!!c.members?.length && <p className="text-xs text-white/60">{c.members.length} anggota keluarga terdaftar</p>}
            </>
          )}
        </section>
      )}
      <Link href="/keamanan" className="w-full min-h-[46px] rounded-xl bg-white/10 text-sm font-bold flex items-center justify-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Ke Pos Keamanan</Link>
    </motion.div>
  );
}
