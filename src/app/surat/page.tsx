"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  PenTool,
  Stamp,
  QrCode,
  Printer,
  Download,
  Upload,
  Eye,
  ShieldCheck,
  UserCheck,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  X,
  Menu,
  Building,
  Check,
  RotateCcw,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getClientSession } from "@/lib/auth-session";
import { SignaturePad } from "@/components/ui/signature-pad";
import { DocumentBuilder } from "@/components/surat/document-builder";
import { toast } from "sonner";

export interface LetterTemplateItem {
  id: string;
  communityId: string;
  title: string;
  code: string;
  description: string;
  category: string;
  requiredDocs: string[];
  components: any[];
  approvalWorkflow: {
    requireSecretary: boolean;
    requireRT: boolean;
  };
  isActive: boolean;
}

export interface LetterRequestItem {
  id: string;
  communityId: string;
  templateId?: string;
  requestNumber: string;
  issuedNumber?: string;
  applicantName: string;
  applicantNik: string;
  applicantPhone: string;
  applicantAddress: string;
  purpose: string;
  extraData?: Record<string, any>;
  attachments?: string[];
  status: "PENDING_REVIEW" | "WAITING_SIGNATURE" | "APPROVED" | "REJECTED";
  applicantSignature?: string;
  applicantSignedAt?: string;
  secretaryReview?: {
    status: string;
    reviewedAt: string;
    notes: string;
  };
  rtSignature?: string;
  rtSignedBy?: string;
  rtSignedAt?: string;
  rejectionReason?: string;
  issuedAt?: string;
  createdAt: string;
  template?: LetterTemplateItem;
}

export default function SuratPage() {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Active Tab: "AJUKAN" | "APPROVAL" | "BUILDER" | "ARSIP"
  const [activeTab, setActiveTab] = useState<"AJUKAN" | "APPROVAL" | "BUILDER" | "ARSIP">("AJUKAN");

  // Data states from Supabase
  const [templates, setTemplates] = useState<LetterTemplateItem[]>([]);
  const [requests, setRequests] = useState<LetterRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Submission Form modal state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplateItem | null>(null);
  const [isCustomUploadMode, setIsCustomUploadMode] = useState(false);

  // Applicant fields
  const [applicantName, setApplicantName] = useState("");
  const [applicantNik, setApplicantNik] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [applicantAddress, setApplicantAddress] = useState("");
  const [purpose, setPurpose] = useState("");
  const [customDocFile, setCustomDocFile] = useState<string | null>(null);
  const [applicantSignature, setApplicantSignature] = useState<string | null>(null);
  const [isSigningApplicant, setIsSigningApplicant] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Approval Modal state (for Ketua RT / Sekretaris)
  const [selectedRequestForApproval, setSelectedRequestForApproval] = useState<LetterRequestItem | null>(null);
  const [isSigningRT, setIsSigningRT] = useState(false);
  const [includeRTStamp, setIncludeRTStamp] = useState(true);
  const [rejectionNote, setRejectionNote] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  // View / Print Modal state
  const [selectedRequestForPrint, setSelectedRequestForPrint] = useState<LetterRequestItem | null>(null);

  // Builder state
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LetterTemplateItem | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const activeCommunityId = session?.communityId || "comm_1789890597407";
  const activeCommunityName = session?.communityName || "RT 04 / RW 09 Kemang Utama";
  const userRole = session?.role || "TENANT_ADMIN";
  const isPengurus = userRole === "TENANT_ADMIN" || userRole === "KETUA" || userRole === "SEKRETARIS";

  // Fetch templates and requests
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [resTmpl, resReq] = await Promise.all([
        fetch(`/api/surat/templates?communityId=${encodeURIComponent(activeCommunityId)}`),
        fetch(`/api/surat/requests?communityId=${encodeURIComponent(activeCommunityId)}`),
      ]);

      if (resTmpl.ok) {
        const dataTmpl = await resTmpl.json();
        setTemplates(dataTmpl.templates || []);
      }
      if (resReq.ok) {
        const dataReq = await resReq.json();
        setRequests(dataReq.requests || []);
      }
    } catch (err) {
      console.error("Failed to load surat data:", err);
      toast.error("Gagal memuat data layanan surat dari server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    const clientSession = getClientSession();
    setSession(clientSession);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchData();
    }
  }, [mounted, activeCommunityId]);

  // Open apply form with a template
  const handleOpenApply = (tmpl: LetterTemplateItem | null = null, customUpload = false) => {
    setSelectedTemplate(tmpl);
    setIsCustomUploadMode(customUpload);
    // Autofill from session if available
    setApplicantName(session?.fullName || "Bpk. Bambang Sujatmiko");
    setApplicantNik("3174051204890001");
    setApplicantPhone(session?.phone || "081234567890");
    setApplicantAddress("Jl. Kemang Raya No. 04 RT 04 / RW 09");
    setPurpose("");
    setApplicantSignature(null);
    setIsSigningApplicant(false);
    setIsSubmitModalOpen(true);
  };

  // Submit letter request
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName.trim() || !applicantNik.trim() || !purpose.trim()) {
      toast.error("Mohon lengkapi Nama Pemohon, NIK, dan Keperluan Surat.");
      return;
    }
    if (!applicantSignature) {
      toast.error("Wajib membubuhkan tanda tangan pemohon sebelum mengajukan!");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        communityId: activeCommunityId,
        templateId: selectedTemplate?.id,
        applicantName: applicantName.trim(),
        applicantNik: applicantNik.trim(),
        applicantPhone: applicantPhone.trim(),
        applicantAddress: applicantAddress.trim(),
        purpose: purpose.trim(),
        applicantSignature,
        requireSecretary: selectedTemplate?.approvalWorkflow?.requireSecretary || false,
        extraData: {
          templateTitle: selectedTemplate?.title || "Dokumen Unggah Mandiri",
          customDocUploaded: !!customDocFile,
        },
      };

      const res = await fetch("/api/surat/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Gagal membuat pengajuan surat");

      const result = await res.json();
      toast.success("Pengajuan surat berhasil dikirim ke Pengurus RT!", {
        description: `Nomor Registrasi: ${result.request?.requestNumber}`,
      });

      setIsSubmitModalOpen(false);
      fetchData();
      setActiveTab("ARSIP");
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat mengajukan surat.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Approval by Ketua RT / Sekretaris
  const handleApproveAndSign = async (rtSignatureDataUrl: string) => {
    if (!selectedRequestForApproval) return;

    try {
      const res = await fetch("/api/surat/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedRequestForApproval.id,
          action: "SIGN_RT",
          rtSignature: rtSignatureDataUrl,
          rtSignedBy: session?.fullName || "Bpk. H. Bambang Sujatmiko (Ketua RT)",
        }),
      });

      if (!res.ok) throw new Error("Gagal menandatangani surat");

      toast.success("Surat resmi berhasil disetujui & ditandatangani!", {
        description: "Nomor surat resmi telah diterbitkan dan dapat diunduh warga.",
      });

      setSelectedRequestForApproval(null);
      setIsSigningRT(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyetujui surat.");
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequestForApproval) return;
    if (!rejectionNote.trim()) {
      toast.error("Mohon tuliskan alasan penolakan untuk warga pemohon.");
      return;
    }

    try {
      const res = await fetch("/api/surat/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedRequestForApproval.id,
          action: "REJECT",
          rejectionReason: rejectionNote.trim(),
        }),
      });

      if (!res.ok) throw new Error("Gagal menolak permohonan");

      toast.info("Permohonan surat telah ditolak dengan catatan.");
      setSelectedRequestForApproval(null);
      setIsRejecting(false);
      setRejectionNote("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Gagal menolak surat.");
    }
  };

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const matchSearch =
        req.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.applicantNik.includes(searchQuery) ||
        req.requestNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.issuedNumber && req.issuedNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (req.template?.title && req.template.title.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = filterStatus === "ALL" || req.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [requests, searchQuery, filterStatus]);

  const pendingApprovalsCount = useMemo(() => {
    return requests.filter((r) => r.status === "WAITING_SIGNATURE" || r.status === "PENDING_REVIEW").length;
  }, [requests]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#FBFBF9] dark:bg-[#0B130E] text-slate-900 dark:text-slate-100 pb-28 md:pb-12 font-sans selection:bg-emerald-500 selection:text-white">
      {/* 1. TOP HEADER */}
      <header className="sticky top-0 z-40 bg-[#FBFBF9]/90 dark:bg-[#0B130E]/90 backdrop-blur-xl border-b border-neutral-200/80 dark:border-neutral-800/80 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="md:hidden w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-emerald-600/30">
                W
              </div>
              <span className="font-extrabold text-base tracking-tight hidden sm:inline">
                Warga<span className="text-emerald-600">In</span>
              </span>
            </Link>

            <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700 mx-1 hidden sm:block" />

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Building className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate max-w-[170px] sm:max-w-xs">{activeCommunityName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-semibold py-0.5 px-2">
              <FileText className="w-3 h-3 mr-1" /> Layanan Surat RT
            </Badge>

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <AppSidebar
        session={session}
        isMobileDrawerOpen={isMobileDrawerOpen}
        onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-950 via-teal-900/30 to-slate-900 border border-emerald-500/30 rounded-3xl p-5 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl relative overflow-hidden">
          <div className="space-y-1.5 relative z-10">
            <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> Penerbitan Surat Resmi & Tanda Tangan Digital
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Portal Layanan Surat Pengantar RT
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Warga dapat mengajukan permohonan surat pengantar secara instan dari ponsel dengan tanda tangan digital resmi, terverifikasi QR code & stempel RT.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 relative z-10 w-full sm:w-auto">
            <Button
              onClick={() => handleOpenApply(null, false)}
              className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl gap-2 shadow-lg shadow-emerald-600/20 min-h-[44px]"
            >
              <Plus className="w-4 h-4" /> Ajukan Surat Baru
            </Button>
            {isPengurus && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingTemplate(null);
                  setIsBuilderOpen(true);
                }}
                className="flex-1 sm:flex-none border-border rounded-xl gap-2 hover:bg-muted/80 min-h-[44px]"
              >
                <PenTool className="w-4 h-4 text-emerald-600" /> Document Builder
              </Button>
            )}
          </div>
        </div>

        {/* 2. RESPONSIVE TAB BAR (Mobile First) */}
        <div className="flex border-b border-border overflow-x-auto no-scrollbar gap-2 pb-1">
          <button
            onClick={() => {
              setActiveTab("AJUKAN");
              setIsBuilderOpen(false);
            }}
            className={`min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === "AJUKAN" && !isBuilderOpen
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <FileText className="w-4 h-4" /> Pilih Template Surat ({templates.length})
          </button>

          <button
            onClick={() => {
              setActiveTab("APPROVAL");
              setIsBuilderOpen(false);
            }}
            className={`min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === "APPROVAL" && !isBuilderOpen
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <UserCheck className="w-4 h-4" /> Antrean Approval
            {pendingApprovalsCount > 0 && (
              <span className="bg-amber-500 text-slate-900 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold">
                {pendingApprovalsCount}
              </span>
            )}
          </button>

          {isPengurus && (
            <button
              onClick={() => {
                setActiveTab("BUILDER");
                setIsBuilderOpen(true);
              }}
              className={`min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 whitespace-nowrap transition-all ${
                activeTab === "BUILDER" || isBuilderOpen
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <PenTool className="w-4 h-4" /> Kelola Template (Builder)
            </button>
          )}

          <button
            onClick={() => {
              setActiveTab("ARSIP");
              setIsBuilderOpen(false);
            }}
            className={`min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === "ARSIP" && !isBuilderOpen
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Riwayat & Arsip ({requests.length})
          </button>
        </div>

        {/* 3. TAB 1: PILIH TEMPLATE SURAT (SISI WARGA - FIRST MOBILE) */}
        {activeTab === "AJUKAN" && !isBuilderOpen && (
          <div className="space-y-6">
            {/* Opsi Upload Mandiri vs Template Resmi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card
                onClick={() => handleOpenApply(null, true)}
                className="cursor-pointer border-dashed border-2 border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all rounded-2xl p-5 flex items-center gap-4 group min-h-[44px]"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-foreground group-hover:text-emerald-600">
                    Upload Dokumen Mandiri
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sudah memiliki formulir / format surat khusus? Upload berkas PDF/Foto lalu beri tanda tangan digital.
                  </p>
                </div>
              </Card>

              <Card className="border-border bg-card/60 backdrop-blur-md rounded-2xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                  <Stamp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">
                    Verifikasi Stempel RT & QR Code
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Seluruh surat diterbitkan lengkap dengan Nomor Registrasi Kelurahan, TTD Ketua RT, dan verifikasi QR.
                  </p>
                </div>
              </Card>
            </div>

            {/* Template Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" /> Pilihan Template Surat Standar RT/RW
                </h2>
                <span className="text-xs text-muted-foreground">Pilih jenis surat yang ingin diajukan</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((tmpl) => (
                  <Card
                    key={tmpl.id}
                    className="rounded-2xl border-border hover:border-emerald-500/40 hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden group bg-card"
                  >
                    <CardHeader className="p-4 sm:p-5 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase font-mono bg-muted">
                          {tmpl.category}
                        </Badge>
                        <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Siap Diajukan
                        </div>
                      </div>
                      <CardTitle className="text-base font-extrabold text-foreground tracking-tight mt-2 group-hover:text-emerald-600 transition-colors">
                        {tmpl.title}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {tmpl.description}
                      </p>
                    </CardHeader>

                    <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
                      {tmpl.requiredDocs && tmpl.requiredDocs.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-[11px] space-y-1">
                          <span className="font-semibold text-foreground block">Berkas Persyaratan:</span>
                          <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                            {tmpl.requiredDocs.slice(0, 2).map((doc, i) => (
                              <li key={i} className="truncate">{doc}</li>
                            ))}
                            {tmpl.requiredDocs.length > 2 && (
                              <li className="text-emerald-600 font-medium">+{tmpl.requiredDocs.length - 2} berkas lainnya</li>
                            )}
                          </ul>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          onClick={() => handleOpenApply(tmpl, false)}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs min-h-[44px] gap-1.5 shadow-sm"
                        >
                          Ajukan Surat Ini <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. TAB 2: ANTREAN PERSETUJUAN & TTD (KHUSUS PENGURUS RT) */}
        {activeTab === "APPROVAL" && !isBuilderOpen && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari NIK / Nama Pemohon..."
                    className="pl-9 h-9 text-xs bg-background rounded-xl"
                  />
                </div>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-border bg-background text-xs"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="WAITING_SIGNATURE">Menunggu TTD Ketua RT</option>
                  <option value="PENDING_REVIEW">Menunggu Verifikasi Sekretaris</option>
                  <option value="APPROVED">Sudah Terbit (Approved)</option>
                  <option value="REJECTED">Ditolak</option>
                </select>
              </div>

              <div className="text-xs text-muted-foreground font-medium">
                Total: <strong>{filteredRequests.length}</strong> Pengajuan
              </div>
            </div>

            {filteredRequests.length === 0 ? (
              <Card className="rounded-2xl p-12 text-center border-border">
                <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-40" />
                <h3 className="text-sm font-bold text-foreground">Tidak Ada Permohonan Surat</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Belum ada permohonan surat warga yang cocok dengan filter atau status saat ini.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRequests.map((req) => (
                  <Card
                    key={req.id}
                    className="rounded-2xl border-border hover:border-emerald-500/40 transition-all p-4 sm:p-5 flex flex-col justify-between space-y-4 bg-card"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {req.requestNumber}
                          </span>
                          <h3 className="text-base font-extrabold text-foreground tracking-tight">
                            {req.template?.title || "Surat Permohonan Warga"}
                          </h3>
                        </div>

                        <Badge
                          variant="outline"
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            req.status === "APPROVED"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : req.status === "WAITING_SIGNATURE"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                              : req.status === "REJECTED"
                              ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                              : "bg-blue-500/10 text-blue-600 border-blue-500/30"
                          }`}
                        >
                          {req.status === "APPROVED" && "✓ Selesai Terbit"}
                          {req.status === "WAITING_SIGNATURE" && "⏳ Butuh TTD Ketua RT"}
                          {req.status === "PENDING_REVIEW" && "🔍 Verifikasi Sekretaris"}
                          {req.status === "REJECTED" && "✕ Ditolak"}
                        </Badge>
                      </div>

                      {/* Detail Warga */}
                      <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pemohon:</span>
                          <span className="font-bold text-foreground">{req.applicantName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">NIK:</span>
                          <span className="font-mono text-foreground">{req.applicantNik}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Keperluan:</span>
                          <span className="text-foreground text-right max-w-[200px] truncate">{req.purpose}</span>
                        </div>
                      </div>

                      {/* Status Tanda Tangan */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                        <span className="flex items-center gap-1">
                          {req.applicantSignature ? (
                            <span className="text-emerald-600 flex items-center gap-1 font-medium">
                              ✓ TTD Pemohon Ada
                            </span>
                          ) : (
                            <span className="text-amber-500">Belum TTD</span>
                          )}
                        </span>
                        <span>Diajukan: {new Date(req.createdAt).toLocaleDateString("id-ID")}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                      {req.status === "APPROVED" ? (
                        <Button
                          variant="outline"
                          onClick={() => setSelectedRequestForPrint(req)}
                          className="w-full text-xs font-bold rounded-xl gap-1.5 min-h-[44px]"
                        >
                          <Printer className="w-4 h-4 text-emerald-600" /> Lihat & Cetak Surat
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={() => {
                              setSelectedRequestForApproval(req);
                              setIsSigningRT(false);
                            }}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl gap-1.5 min-h-[44px] shadow-sm"
                          >
                            <PenTool className="w-3.5 h-3.5" /> Periksa & Tanda Tangani
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setSelectedRequestForApproval(req);
                              setIsRejecting(true);
                            }}
                            className="text-xs text-rose-500 hover:text-rose-600 min-h-[44px]"
                          >
                            Tolak
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. TAB 3: KELOLA TEMPLATE (DOCUMENT BUILDER) */}
        {activeTab === "BUILDER" && isBuilderOpen && (
          <DocumentBuilder
            initialTemplate={editingTemplate}
            communityId={activeCommunityId}
            communityName={activeCommunityName}
            onSaveSuccess={() => {
              fetchData();
              setIsBuilderOpen(false);
              setActiveTab("AJUKAN");
            }}
            onClose={() => {
              setIsBuilderOpen(false);
              setActiveTab("AJUKAN");
            }}
          />
        )}

        {/* 6. TAB 4: ARSIP & RIWAYAT SURAT TERBIT */}
        {activeTab === "ARSIP" && !isBuilderOpen && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Arsip Surat Keluar RT Resmi
              </h2>
              <span className="text-xs text-muted-foreground">Surat yang telah disetujui & ditandatangani</span>
            </div>

            <div className="space-y-3">
              {requests.filter((r) => r.status === "APPROVED").length === 0 ? (
                <Card className="rounded-2xl p-12 text-center border-border">
                  <ShieldCheck className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-40" />
                  <h3 className="text-sm font-bold text-foreground">Belum Ada Surat yang Terbit</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Surat yang telah ditandatangani oleh Ketua RT akan otomatis terarsip dan dapat dicetak di sini.
                  </p>
                </Card>
              ) : (
                requests
                  .filter((r) => r.status === "APPROVED")
                  .map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-emerald-600">
                              {req.issuedNumber || req.requestNumber}
                            </span>
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                              Terverifikasi QR
                            </Badge>
                          </div>
                          <h4 className="text-sm font-extrabold text-foreground mt-0.5">
                            {req.template?.title || "Surat Keterangan RT"}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Pemohon: <strong>{req.applicantName}</strong> (NIK: {req.applicantNik}) • {req.purpose}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRequestForPrint(req)}
                          className="rounded-xl text-xs min-h-[44px] gap-1.5"
                        >
                          <Printer className="w-4 h-4 text-emerald-600" /> Cetak / PDF
                        </Button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* MODAL 1: PENGAJUAN SURAT WARGA (MOBILE FIRST) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isSubmitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="w-full sm:max-w-xl max-h-[90vh] bg-card rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-border bg-muted/40 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                    <PenTool className="w-4 h-4 text-emerald-600" />
                    {selectedTemplate ? selectedTemplate.title : "Pengajuan Surat Mandiri"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Lengkapi isian data dan bubuhkan tanda tangan digital Anda.
                  </p>
                </div>
                <button
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmitRequest} className="p-5 overflow-y-auto space-y-4 flex-1">
                {/* Auto-fill Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Nama Lengkap Pemohon:</label>
                    <Input
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      placeholder="Nama Lengkap"
                      className="h-10 text-xs bg-background"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">NIK (KTP 16 Digit):</label>
                    <Input
                      value={applicantNik}
                      onChange={(e) => setApplicantNik(e.target.value)}
                      placeholder="317405..."
                      className="h-10 text-xs font-mono bg-background"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">No. HP / WhatsApp:</label>
                    <Input
                      value={applicantPhone}
                      onChange={(e) => setApplicantPhone(e.target.value)}
                      placeholder="0812..."
                      className="h-10 text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Alamat Domisili:</label>
                    <Input
                      value={applicantAddress}
                      onChange={(e) => setApplicantAddress(e.target.value)}
                      placeholder="Blok & Nomor Rumah"
                      className="h-10 text-xs bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <label className="font-semibold text-foreground">Keperluan / Alasan Pembuatan Surat:</label>
                  <textarea
                    rows={2}
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Contoh: Pembuatan SKCK untuk melamar pekerjaan di BUMN..."
                    className="w-full p-2.5 rounded-xl border border-border bg-background text-xs resize-none"
                    required
                  />
                </div>

                {/* Upload Dokumen Mandiri (if custom upload) */}
                {isCustomUploadMode && (
                  <div className="space-y-1 text-xs">
                    <label className="font-semibold text-foreground">Upload Berkas Formulir (PDF / Foto):</label>
                    <label className="w-full h-24 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors p-2 text-center">
                      <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                      <span className="text-[11px] font-semibold text-foreground">
                        {customDocFile ? "✓ Berkas Terpilih" : "Klik untuk upload formulir mandiri"}
                      </span>
                      <input
                        type="file"
                        onChange={(e) => {
                          if (e.target.files?.[0]) setCustomDocFile(e.target.files[0].name);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {/* Tanda Tangan Digital Pemohon (PandaDoc-Style) */}
                <div className="space-y-2 pt-1 border-t border-border">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <PenTool className="w-3.5 h-3.5 text-emerald-600" /> Tanda Tangan Digital Pemohon (Wajib)
                    </label>
                    {applicantSignature && (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                        ✓ Tanda Tangan Siap
                      </Badge>
                    )}
                  </div>

                  {applicantSignature ? (
                    <div className="p-3 bg-white rounded-xl border border-border flex items-center justify-between gap-3">
                      <div className="h-16 flex items-center">
                        <img src={applicantSignature} alt="Applicant Signature" className="max-h-full max-w-[160px] object-contain" />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setApplicantSignature(null);
                          setIsSigningApplicant(true);
                        }}
                        className="text-xs text-rose-500 h-8"
                      >
                        Ubah TTD
                      </Button>
                    </div>
                  ) : isSigningApplicant ? (
                    <SignaturePad
                      signeeName={applicantName || "Pemohon"}
                      signeeRole="Warga Pemohon"
                      onSave={(dataUrl) => {
                        setApplicantSignature(dataUrl);
                        setIsSigningApplicant(false);
                      }}
                      onCancel={() => setIsSigningApplicant(false)}
                    />
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsSigningApplicant(true)}
                      className="w-full h-14 border-dashed border-2 border-emerald-500/50 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 font-bold text-xs rounded-xl gap-2 min-h-[44px]"
                    >
                      <PenTool className="w-4 h-4" /> Klik Disini Untuk Membubuhkan Tanda Tangan
                    </Button>
                  )}
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting || !applicantSignature}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl min-h-[44px] gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50 text-xs"
                  >
                    <Check className="w-4 h-4" /> {isSubmitting ? "Mengirim Permohonan..." : "Kirim Permohonan Surat ke RT"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL 2: REVIEW & TANDA TANGAN KETUA RT (APPROVAL) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {selectedRequestForApproval && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="w-full sm:max-w-2xl max-h-[92vh] bg-card rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-border bg-muted/40 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                    <Stamp className="w-4 h-4 text-emerald-600" />
                    Pemeriksaan & Tanda Tangan Ketua RT
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedRequestForApproval.requestNumber} • Pemohon: {selectedRequestForApproval.applicantName}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRequestForApproval(null)}
                  className="w-8 h-8 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {isRejecting ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600">
                      Tolak permohonan surat ini dan berikan alasan penolakan yang jelas kepada warga pemohon.
                    </div>
                    <div className="space-y-1 text-xs">
                      <label className="font-semibold text-foreground">Alasan Penolakan:</label>
                      <textarea
                        rows={3}
                        value={rejectionNote}
                        onChange={(e) => setRejectionNote(e.target.value)}
                        placeholder="Contoh: Lampiran KTP tidak terbaca, mohon ajukan ulang dengan foto yang jelas..."
                        className="w-full p-2.5 rounded-xl border border-border bg-background text-xs"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setIsRejecting(false)} className="flex-1 text-xs min-h-[44px]">
                        Batal
                      </Button>
                      <Button variant="destructive" onClick={handleRejectRequest} className="flex-1 text-xs font-bold min-h-[44px]">
                        Konfirmasi Tolak
                      </Button>
                    </div>
                  </div>
                ) : isSigningRT ? (
                  <div className="space-y-3">
                    <SignaturePad
                      title="Tanda Tangan Digital Ketua RT"
                      signeeName={session?.fullName || "Bpk. H. Bambang Sujatmiko"}
                      signeeRole="Ketua RT 04 / RW 09"
                      onSave={handleApproveAndSign}
                      onCancel={() => setIsSigningRT(false)}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Ringkasan Permohonan */}
                    <div className="p-4 rounded-2xl bg-muted/30 border border-border text-xs space-y-2">
                      <div className="grid grid-cols-3">
                        <span className="text-muted-foreground">Jenis Dokumen</span>
                        <span className="col-span-2 font-bold text-foreground">
                          {selectedRequestForApproval.template?.title || "Surat Permohonan Warga"}
                        </span>
                      </div>
                      <div className="grid grid-cols-3">
                        <span className="text-muted-foreground">Nama Pemohon</span>
                        <span className="col-span-2 font-bold text-foreground">{selectedRequestForApproval.applicantName}</span>
                      </div>
                      <div className="grid grid-cols-3">
                        <span className="text-muted-foreground">NIK</span>
                        <span className="col-span-2 font-mono text-foreground">{selectedRequestForApproval.applicantNik}</span>
                      </div>
                      <div className="grid grid-cols-3">
                        <span className="text-muted-foreground">Keperluan</span>
                        <span className="col-span-2 text-foreground">{selectedRequestForApproval.purpose}</span>
                      </div>
                      <div className="grid grid-cols-3">
                        <span className="text-muted-foreground">Alamat</span>
                        <span className="col-span-2 text-foreground">{selectedRequestForApproval.applicantAddress}</span>
                      </div>
                    </div>

                    {/* TTD Pemohon */}
                    <div className="p-3 rounded-2xl bg-card border border-border space-y-1.5">
                      <span className="text-xs font-semibold text-foreground">Tanda Tangan Pemohon (Warga):</span>
                      {selectedRequestForApproval.applicantSignature ? (
                        <div className="h-20 bg-white rounded-xl border border-border flex items-center justify-center p-2">
                          <img
                            src={selectedRequestForApproval.applicantSignature}
                            alt="Applicant Sig"
                            className="max-h-full object-contain"
                          />
                        </div>
                      ) : (
                        <p className="text-xs text-amber-500 italic">Belum dibubuhi tanda tangan pemohon</p>
                      )}
                    </div>

                    {/* Stempel RT Option */}
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                      <input
                        type="checkbox"
                        checked={includeRTStamp}
                        onChange={(e) => setIncludeRTStamp(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600"
                      />
                      <span>Sematkan Stempel Resmi RT Digital pada surat keluar</span>
                    </label>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsRejecting(true)}
                        className="flex-1 text-xs text-rose-500 hover:text-rose-600 rounded-xl min-h-[44px]"
                      >
                        Tolak Berkas
                      </Button>
                      <Button
                        onClick={() => setIsSigningRT(true)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl min-h-[44px] gap-2 shadow-md shadow-emerald-600/20"
                      >
                        <PenTool className="w-4 h-4" /> Tanda Tangani & Setujui
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MODAL 3: CETAK SURAT RESMI (A4 READY-TO-PRINT) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {selectedRequestForPrint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white text-slate-900 rounded-2xl shadow-2xl p-6 sm:p-10 border border-neutral-300 font-serif leading-relaxed text-xs sm:text-sm space-y-6 relative my-auto"
            >
              {/* Close & Print Buttons (Screen Only) */}
              <div className="flex items-center justify-between border-b pb-3 print:hidden">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 font-sans text-xs">
                    ✓ Dokumen Sah Terbit
                  </Badge>
                  <span className="text-xs font-mono font-bold text-slate-700">
                    {selectedRequestForPrint.issuedNumber}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => window.print()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs font-bold gap-1 min-h-[44px] sm:min-h-0"
                  >
                    <Printer className="w-3.5 h-3.5" /> Cetak / Unduh PDF
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedRequestForPrint(null)}
                    className="text-slate-500 h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* KOP RESMI */}
              <div className="text-center space-y-1 font-sans">
                <h3 className="font-extrabold text-sm sm:text-base tracking-wider uppercase">
                  PENGURUS RUKUN TETANGGA 04 / RUKUN WARGA 09
                </h3>
                <h4 className="font-bold text-xs sm:text-sm uppercase">
                  KELURAHAN MEKAR, KECAMATAN KEBAYORAN BARU, KOTA ADM. JAKARTA SELATAN
                </h4>
                <p className="text-[10px] sm:text-[11px] text-slate-600 italic">
                  Sekretariat: Jl. Kemang Raya No. 04 Jakarta Selatan • WhatsApp: 0812-3456-7890
                </p>
                <div className="pt-2">
                  <div className="border-b-2 border-slate-900 w-full mb-0.5" />
                  <div className="border-b border-slate-900 w-full" />
                </div>
              </div>

              {/* Title & Number */}
              <div className="text-center pt-2 font-sans">
                <h2 className="font-bold text-sm sm:text-base underline underline-offset-4 tracking-wide uppercase">
                  {selectedRequestForPrint.template?.title || "SURAT PENGANTAR"}
                </h2>
                <p className="text-xs font-mono text-slate-700 mt-1">
                  Nomor: {selectedRequestForPrint.issuedNumber || selectedRequestForPrint.requestNumber}
                </p>
              </div>

              {/* Opening */}
              <p className="text-justify text-xs">
                Yang bertanda tangan di bawah ini Pengurus Rukun Tetangga 04 / Rukun Warga 09, Kelurahan Mekar, Kecamatan Kebayoran Baru, Jakarta Selatan, dengan ini menerangkan bahwa:
              </p>

              {/* Citizen Details */}
              <div className="pl-4 sm:pl-6 space-y-1.5 text-xs font-sans">
                <div className="grid grid-cols-3">
                  <span className="text-slate-600">Nama Lengkap</span>
                  <span className="col-span-2 font-bold">: {selectedRequestForPrint.applicantName}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-600">NIK (KTP)</span>
                  <span className="col-span-2 font-mono">: {selectedRequestForPrint.applicantNik}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-600">Alamat Lengkap</span>
                  <span className="col-span-2">: {selectedRequestForPrint.applicantAddress}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-600">Nomor Telepon</span>
                  <span className="col-span-2">: {selectedRequestForPrint.applicantPhone}</span>
                </div>
              </div>

              {/* Purpose */}
              <p className="text-justify text-xs">
                Orang tersebut di atas adalah benar-benar warga yang bertempat tinggal di lingkungan kami dan berkelakuan baik. Surat pengantar ini diberikan untuk keperluan: <strong>{selectedRequestForPrint.purpose}</strong>.
              </p>

              <p className="text-justify text-xs">
                Demikian surat ini kami buat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
              </p>

              {/* Signatures, Stamps, and QR Code */}
              <div className="pt-6 grid grid-cols-2 text-center text-xs font-sans items-end">
                {/* Pemohon */}
                <div className="space-y-2">
                  <p className="text-slate-600">Pemohon,</p>
                  <div className="h-16 flex items-center justify-center">
                    {selectedRequestForPrint.applicantSignature ? (
                      <img
                        src={selectedRequestForPrint.applicantSignature}
                        alt="TTD Pemohon"
                        className="max-h-full max-w-[140px] object-contain"
                      />
                    ) : (
                      <div className="h-12 border-b border-dashed border-slate-300 w-32" />
                    )}
                  </div>
                  <p className="font-bold underline uppercase">( {selectedRequestForPrint.applicantName} )</p>
                </div>

                {/* Ketua RT & Stamp */}
                <div className="space-y-2 relative">
                  <div>
                    <p className="text-slate-600">
                      Jakarta, {new Date(selectedRequestForPrint.issuedAt || Date.now()).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <p className="font-bold">Ketua RT 04 / RW 09</p>
                  </div>

                  <div className="h-16 flex items-center justify-center relative">
                    {/* Digital Stamp Simulation */}
                    <div className="absolute -left-2 top-0 w-20 h-20 border-2 border-dashed border-red-500/70 rounded-full flex flex-col items-center justify-center text-red-600 font-bold text-[8px] uppercase rotate-[-15deg] pointer-events-none select-none bg-red-50/10">
                      <span>RUKUN TETANGGA</span>
                      <span className="text-[10px]">RT 04 / RW 09</span>
                      <span>MEKAR</span>
                    </div>

                    {selectedRequestForPrint.rtSignature ? (
                      <img
                        src={selectedRequestForPrint.rtSignature}
                        alt="TTD RT"
                        className="max-h-full max-w-[140px] object-contain relative z-10"
                      />
                    ) : (
                      <div className="h-12 border-b border-dashed border-slate-300 w-32" />
                    )}
                  </div>

                  <p className="font-bold underline uppercase">
                    ( {selectedRequestForPrint.rtSignedBy || "Bpk. H. Bambang Sujatmiko"} )
                  </p>
                </div>
              </div>

              {/* Bottom Security Footer: QR Code */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-sans">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg p-1 border border-slate-300 flex items-center justify-center">
                    <QrCode className="w-8 h-8 text-slate-800" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 block">WargaIn Verified Security</span>
                    <span>Pindai QR untuk memverifikasi keaslian berkas surat ini di portal RT.</span>
                  </div>
                </div>
                <div className="text-right">
                  <span>ID: {selectedRequestForPrint.id}</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
