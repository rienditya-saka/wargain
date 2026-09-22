"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Settings,
  Eye,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Building,
  UserCheck,
  Save,
  PenTool,
  Stamp,
  Layers,
  HelpCircle,
  GripVertical,
  Copy,
  Users,
  User,
  BadgeCheck,
  QrCode,
  ChevronRight,
  ChevronDown,
  Sliders,
  LayoutGrid,
  Maximize2,
  Minimize2,
  X,
  Check,
  ListOrdered,
  Type,
  AlignLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export type StaffRole =
  | "KETUA"
  | "WAKIL_KETUA"
  | "SEKRETARIS"
  | "BENDAHARA"
  | "KEAMANAN"
  | "PEMBANGUNAN"
  | "KEBERSIHAN"
  | "HUMAS"
  | "PEMUDA_OLAHRAGA";

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  KETUA: "Ketua RT",
  WAKIL_KETUA: "Wakil Ketua RT",
  SEKRETARIS: "Sekretaris RT",
  BENDAHARA: "Bendahara RT",
  KEAMANAN: "Seksi Keamanan & Ketertiban",
  PEMBANGUNAN: "Seksi Pembangunan & Lingkungan",
  KEBERSIHAN: "Seksi Kebersihan & Kesehatan",
  HUMAS: "Seksi Hubungan Masyarakat (Humas)",
  PEMUDA_OLAHRAGA: "Seksi Pemuda & Olahraga",
};

export interface SigneeItem {
  id: string;
  signeeType: "STAFF" | "WARGA";
  staffRole?: StaffRole;
  citizenName?: string;
  titleLabel: string;
  showStamp?: boolean;
  showQr?: boolean;
}

export interface TemplateBlock {
  id: string;
  type:
    | "HEADER_KOP"
    | "DOCUMENT_TITLE"
    | "PARAGRAPH"
    | "CITIZEN_FIELDS"
    | "PURPOSE_BODY"
    | "CLOSING"
    | "SIGNATURE_BLOCK"
    | "TABLE_LIST";
  title?: string;
  content?: string;
  subTitle?: string;
  fields?: string[];
  signees?: SigneeItem[];
  layout?: string;
  settings?: Record<string, any>;
}

export interface DocumentBuilderProps {
  initialTemplate?: any;
  communityName?: string;
  communityId: string;
  onSaveSuccess?: () => void;
  onClose?: () => void;
}

const AVAILABLE_BLOCKS = [
  { type: "HEADER_KOP", label: "Kop Surat Resmi RT/RW", desc: "Logo, nama RT/RW, dan garis ganda resmi.", icon: Building },
  { type: "DOCUMENT_TITLE", label: "Judul & Format Nomor Surat", desc: "Nama surat dan format penomoran arsip.", icon: Type },
  { type: "PARAGRAPH", label: "Paragraf Pembuka / Bebas", desc: "Teks pengantar sebelum data warga.", icon: AlignLeft },
  { type: "CITIZEN_FIELDS", label: "Variabel Data Warga (Auto-fill)", desc: "NIK, Nama, TTL, Jenis Kelamin, Alamat.", icon: Users },
  { type: "PURPOSE_BODY", label: "Isi Keterangan / Keperluan", desc: "Pernyataan maksud dan tujuan warga.", icon: FileText },
  { type: "CLOSING", label: "Kalimat Penutup", desc: "Demikian surat ini dibuat sebagaimana mestinya...", icon: CheckCircle2 },
  { type: "SIGNATURE_BLOCK", label: "Blok Tanda Tangan & Stempel", desc: "TTD Staff (Ketua hingga Humas) & Warga.", icon: Stamp },
];

export function DocumentBuilder({
  initialTemplate,
  communityName = "Rukun Tetangga 04 / Rukun Warga 09",
  communityId,
  onSaveSuccess,
  onClose,
}: DocumentBuilderProps) {
  const [templateTitle, setTemplateTitle] = useState(initialTemplate?.title || "Surat Keterangan Kustom");
  const [templateCode, setTemplateCode] = useState(initialTemplate?.code || `SURAT_CUSTOM_${Date.now().toString().slice(-4)}`);
  const [templateDesc, setTemplateDesc] = useState(initialTemplate?.description || "Deskripsi surat...");
  const [templateCategory, setTemplateCategory] = useState(initialTemplate?.category || "UMUM");

  // Approval Workflow state
  const [requireSecretary, setRequireSecretary] = useState(
    initialTemplate?.approvalWorkflow?.requireSecretary || false
  );
  const [requireRT, setRequireRT] = useState(
    initialTemplate?.approvalWorkflow?.requireRT !== undefined ? initialTemplate.approvalWorkflow.requireRT : true
  );

  // Default Signees
  const defaultSignees: SigneeItem[] = [
    {
      id: "sig_warga",
      signeeType: "WARGA",
      citizenName: "Warga Pemohon (Auto-fill)",
      titleLabel: "Pemohon (Warga)",
      showStamp: false,
      showQr: false,
    },
    {
      id: "sig_ketua",
      signeeType: "STAFF",
      staffRole: "KETUA",
      titleLabel: "Ketua RT 04 / RW 09",
      showStamp: true,
      showQr: true,
    },
  ];

  // Components Blocks state
  const defaultComponents: TemplateBlock[] = [
    {
      id: "b-kop",
      type: "HEADER_KOP",
      title: communityName,
      subTitle: "KELURAHAN MEKAR, KECAMATAN KEBAYORAN BARU, JAKARTA SELATAN",
      content: "Sekretariat: Jl. Kemang Raya No. 04 Jakarta Selatan • WhatsApp: 0812-3456-7890",
      settings: { lineStyle: "double" },
    },
    {
      id: "b-title",
      type: "DOCUMENT_TITLE",
      title: "SURAT KETERANGAN RT",
      subTitle: "Nomor: 470/[NOMOR]/RT04/RW09/[BULAN]/[TAHUN]",
    },
    {
      id: "b-open",
      type: "PARAGRAPH",
      content: "Yang bertanda tangan di bawah ini Pengurus RT 04 / RW 09 Kelurahan Mekar, Kecamatan Kebayoran Baru, Jakarta Selatan, dengan ini menerangkan bahwa:",
    },
    {
      id: "b-cit",
      type: "CITIZEN_FIELDS",
      fields: ["fullName", "nik", "gender", "birthInfo", "religion", "occupation", "address"],
    },
    {
      id: "b-purp",
      type: "PURPOSE_BODY",
      content: "Orang tersebut di atas adalah benar-benar warga yang bertempat tinggal di lingkungan kami dan berkelakuan baik. Surat pengantar ini diberikan untuk keperluan: [KEPERLUAN_WARGA].",
    },
    {
      id: "b-close",
      type: "CLOSING",
      content: "Demikian surat pengantar ini kami buat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.",
    },
    {
      id: "b-sign",
      type: "SIGNATURE_BLOCK",
      layout: "TWO_COLUMNS",
      signees: defaultSignees,
      settings: { includeStamp: true },
    },
  ];

  const [blocks, setBlocks] = useState<TemplateBlock[]>(
    initialTemplate?.components?.length > 0 ? initialTemplate.components : defaultComponents
  );

  // Active selected block for properties editor / inspector
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>("b-kop");
  const [viewMode, setViewMode] = useState<"CANVAS" | "SPLIT" | "PREVIEW">("SPLIT");
  const [isSaving, setIsSaving] = useState(false);

  // Signee Editing Modal state
  const [editingSigneeBlockIdx, setEditingSigneeBlockIdx] = useState<number | null>(null);

  // Reordering blocks
  const moveBlock = (index: number, direction: "UP" | "DOWN") => {
    const targetIdx = direction === "UP" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;
    const next = [...blocks];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    setBlocks(next);
  };

  const removeBlock = (index: number) => {
    const blockToRemove = blocks[index];
    setBlocks(blocks.filter((_, i) => i !== index));
    if (selectedBlockId === blockToRemove.id) {
      setSelectedBlockId(null);
    }
    toast.info("Komponen blok dihapus dari canvas.");
  };

  const duplicateBlock = (index: number) => {
    const original = blocks[index];
    const copyBlock: TemplateBlock = {
      ...JSON.parse(JSON.stringify(original)),
      id: `b_${Date.now()}`,
    };
    const next = [...blocks];
    next.splice(index + 1, 0, copyBlock);
    setBlocks(next);
    setSelectedBlockId(copyBlock.id);
    toast.success("Komponen berhasil diduplikasi!");
  };

  const addBlock = (type: TemplateBlock["type"]) => {
    const newId = `b_${Date.now()}`;
    const newBlock: TemplateBlock = {
      id: newId,
      type,
      title:
        type === "DOCUMENT_TITLE"
          ? "SURAT KETERANGAN"
          : type === "HEADER_KOP"
          ? communityName
          : undefined,
      subTitle:
        type === "DOCUMENT_TITLE"
          ? "Nomor: 470/[NOMOR]/RT04/RW09/[BULAN]/[TAHUN]"
          : type === "HEADER_KOP"
          ? "KELURAHAN MEKAR, JAKARTA SELATAN"
          : undefined,
      content:
        type === "PARAGRAPH"
          ? "Yang bertanda tangan di bawah ini menerangkan bahwa..."
          : type === "PURPOSE_BODY"
          ? "Surat keterangan ini diberikan untuk keperluan: [DESKRIPSI_KEPERLUAN]."
          : type === "CLOSING"
          ? "Demikian surat ini dibuat agar dapat dipergunakan sebagaimana mestinya."
          : undefined,
      fields: type === "CITIZEN_FIELDS" ? ["fullName", "nik", "address"] : undefined,
      signees: type === "SIGNATURE_BLOCK" ? defaultSignees : undefined,
    };
    setBlocks([...blocks, newBlock]);
    setSelectedBlockId(newId);
    toast.success("Komponen baru ditambahkan ke Canvas!");
  };

  const handleUpdateBlockContent = (index: number, field: string, value: any) => {
    setBlocks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Signee Configuration inside a SIGNATURE_BLOCK
  const handleAddSignee = (blockIdx: number) => {
    setBlocks((prev) => {
      const next = [...prev];
      const targetBlock = { ...next[blockIdx] };
      const currentSignees = targetBlock.signees || [];
      const newSignee: SigneeItem = {
        id: `sig_${Date.now()}`,
        signeeType: "STAFF",
        staffRole: "SEKRETARIS",
        titleLabel: "Sekretaris RT 04 / RW 09",
        showStamp: false,
        showQr: true,
      };
      targetBlock.signees = [...currentSignees, newSignee];
      next[blockIdx] = targetBlock;
      return next;
    });
    toast.success("Penandatangan baru ditambahkan ke blok!");
  };

  const handleRemoveSignee = (blockIdx: number, signeeIdx: number) => {
    setBlocks((prev) => {
      const next = [...prev];
      const targetBlock = { ...next[blockIdx] };
      targetBlock.signees = targetBlock.signees?.filter((_, i) => i !== signeeIdx);
      next[blockIdx] = targetBlock;
      return next;
    });
    toast.info("Penandatangan dihapus.");
  };

  const handleUpdateSignee = (blockIdx: number, signeeIdx: number, updates: Partial<SigneeItem>) => {
    setBlocks((prev) => {
      const next = [...prev];
      const targetBlock = { ...next[blockIdx] };
      if (!targetBlock.signees) return prev;
      const nextSignees = [...targetBlock.signees];
      const targetSignee = { ...nextSignees[signeeIdx], ...updates };

      // Auto update title label if staff role changes
      if (updates.staffRole && updates.signeeType === "STAFF") {
        targetSignee.titleLabel = STAFF_ROLE_LABELS[updates.staffRole] || targetSignee.titleLabel;
      } else if (updates.signeeType === "WARGA") {
        targetSignee.titleLabel = "Pemohon (Warga)";
      }

      nextSignees[signeeIdx] = targetSignee;
      targetBlock.signees = nextSignees;
      next[blockIdx] = targetBlock;
      return next;
    });
  };

  const handleSaveTemplate = async () => {
    if (!templateTitle.trim() || !templateCode.trim()) {
      toast.error("Nama template dan kode surat wajib diisi!");
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        id: initialTemplate?.id,
        communityId,
        title: templateTitle.trim(),
        code: templateCode.trim().toUpperCase(),
        description: templateDesc.trim(),
        category: templateCategory,
        components: blocks,
        approvalWorkflow: {
          requireSecretary,
          requireRT,
        },
      };

      const endpoint = initialTemplate?.id ? "/api/surat/templates" : "/api/surat/templates";
      const method = initialTemplate?.id ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Gagal menyimpan template");

      toast.success(`Template ${templateTitle} berhasil disimpan!`, {
        description: "Template siap digunakan untuk pengajuan warga.",
      });

      if (onSaveSuccess) onSaveSuccess();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan template.");
    } finally {
      setIsSaving(false);
    }
  };

  const activeSelectedBlockIndex = blocks.findIndex((b) => b.id === selectedBlockId);
  const activeSelectedBlock = activeSelectedBlockIndex >= 0 ? blocks[activeSelectedBlockIndex] : null;

  return (
    <div className="space-y-6">
      {/* Top Header Controls Bar */}
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Interactive Canvas Builder
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Khusus Pengurus RT/RW
            </Badge>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight mt-1">
            {initialTemplate ? `Edit Template: ${initialTemplate.title}` : "Canvas Studio Builder Surat RT"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Geser & susun komponen di canvas A4, edit teks langsung, dan atur penandatangan staff organisasi / warga.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-stretch sm:self-auto">
          {/* View Mode Toggle Switch */}
          <div className="bg-muted p-1 rounded-xl flex items-center gap-1 border border-border">
            <button
              onClick={() => setViewMode("CANVAS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all min-h-[44px] sm:min-h-0 ${
                viewMode === "CANVAS" ? "bg-card text-emerald-600 shadow-sm border border-border font-bold" : "text-muted-foreground"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Full Canvas
            </button>

            <button
              onClick={() => setViewMode("SPLIT")}
              className={`hidden lg:flex px-3 py-1.5 rounded-lg text-xs font-semibold items-center gap-1.5 transition-all min-h-[44px] sm:min-h-0 ${
                viewMode === "SPLIT" ? "bg-card text-emerald-600 shadow-sm border border-border font-bold" : "text-muted-foreground"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" /> Split Studio
            </button>

            <button
              onClick={() => setViewMode("PREVIEW")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all min-h-[44px] sm:min-h-0 ${
                viewMode === "PREVIEW" ? "bg-card text-emerald-600 shadow-sm border border-border font-bold" : "text-muted-foreground"
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Pratinjau A4
            </button>
          </div>

          <Button
            onClick={handleSaveTemplate}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl gap-2 shadow-lg shadow-emerald-600/25 min-h-[44px]"
          >
            <Save className="w-4 h-4" /> {isSaving ? "Menyimpan..." : "Simpan Template"}
          </Button>

          {onClose && (
            <Button variant="outline" onClick={onClose} className="rounded-xl min-h-[44px]">
              Tutup
            </Button>
          )}
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PALETTE: Available Component Blocks */}
        <div className={`space-y-5 ${viewMode === "PREVIEW" ? "hidden" : "lg:col-span-3"}`}>
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-600" /> Palette Komponen Surat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3">
              {AVAILABLE_BLOCKS.map((block) => {
                const IconComp = block.icon;
                return (
                  <button
                    key={block.type}
                    type="button"
                    onClick={() => addBlock(block.type as any)}
                    className="w-full text-left p-3 rounded-xl border border-border/80 hover:border-emerald-500/60 bg-card hover:bg-emerald-500/5 transition-all flex items-center gap-3 group min-h-[44px] shadow-2xs hover:shadow-xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-extrabold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate">
                        + {block.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">{block.desc}</div>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Template Metadata Box */}
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-emerald-600" /> Pengaturan Meta Template
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Nama / Judul Template:</label>
                <Input
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  placeholder="Contoh: Surat Pengantar SKCK"
                  className="h-9 text-xs bg-background"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Kode Surat:</label>
                <Input
                  value={templateCode}
                  onChange={(e) => setTemplateCode(e.target.value)}
                  placeholder="Contoh: SKCK"
                  className="h-9 text-xs uppercase font-mono bg-background"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Kategori Surat:</label>
                <select
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs"
                >
                  <option value="UMUM">Umum & Izin</option>
                  <option value="KEPENDUDUKAN">Kependudukan</option>
                  <option value="LEGALITAS">Legalitas & Kepolisian</option>
                  <option value="USAHA">Usaha & UMKM</option>
                  <option value="PERNIKAHAN">Pernikahan</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Persyaratan Dokumen:</label>
                <textarea
                  rows={2}
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  placeholder="Fotokopi KTP, KK, foto 4x6, dll."
                  className="w-full p-2 rounded-lg border border-border bg-background text-xs resize-none"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CENTER INTERACTIVE A4 CANVAS */}
        <div
          className={`space-y-4 ${
            viewMode === "PREVIEW"
              ? "lg:col-span-12 flex justify-center"
              : viewMode === "CANVAS"
              ? "lg:col-span-9"
              : "lg:col-span-6"
          }`}
        >
          {viewMode === "PREVIEW" ? (
            /* FULL PRINT READY A4 PREVIEW MODE */
            <div className="w-full max-w-2xl bg-white text-slate-900 rounded-2xl shadow-2xl p-8 sm:p-12 border border-slate-300 font-serif leading-relaxed text-xs sm:text-sm space-y-6">
              {/* KOP */}
              <div className="text-center space-y-1 font-sans">
                <h3 className="font-extrabold text-sm sm:text-base tracking-wider uppercase text-slate-950">
                  {blocks.find((b) => b.type === "HEADER_KOP")?.title || communityName}
                </h3>
                <h4 className="font-bold text-xs uppercase text-slate-800">
                  {blocks.find((b) => b.type === "HEADER_KOP")?.subTitle || "KELURAHAN MEKAR, JAKARTA SELATAN"}
                </h4>
                <p className="text-[10px] text-slate-600 italic">
                  {blocks.find((b) => b.type === "HEADER_KOP")?.content || "Sekretariat RT/RW • WhatsApp Verified"}
                </p>
                <div className="pt-2">
                  <div className="border-b-2 border-slate-950 w-full mb-0.5" />
                  <div className="border-b border-slate-950 w-full" />
                </div>
              </div>

              {/* Title & Number */}
              <div className="text-center pt-2 font-sans">
                <h2 className="font-bold text-sm sm:text-base underline underline-offset-4 tracking-wide uppercase text-slate-900">
                  {blocks.find((b) => b.type === "DOCUMENT_TITLE")?.title || templateTitle.toUpperCase()}
                </h2>
                <p className="text-xs font-mono text-slate-600 mt-1">
                  {blocks.find((b) => b.type === "DOCUMENT_TITLE")?.subTitle || "Nomor: 470/024/RT04/RW09/IX/2026"}
                </p>
              </div>

              {/* Body Content */}
              <p className="text-justify text-xs text-slate-800">
                {blocks.find((b) => b.type === "PARAGRAPH")?.content || "Yang bertanda tangan di bawah ini menerangkan bahwa:"}
              </p>

              {/* Auto Fill Data Warga Table */}
              <div className="pl-4 sm:pl-6 space-y-1.5 text-xs font-sans bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="grid grid-cols-3">
                  <span className="text-slate-500">Nama Lengkap</span>
                  <span className="col-span-2 font-bold text-slate-900">: Bpk. Bambang Sujatmiko</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-500">NIK (KTP)</span>
                  <span className="col-span-2 font-mono text-slate-900">: 3174051204890001</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-500">Alamat Domisili</span>
                  <span className="col-span-2 text-slate-900">: Jl. Kemang Raya No. 04 RT 04 / RW 09</span>
                </div>
              </div>

              <p className="text-justify text-xs text-slate-800">
                {blocks.find((b) => b.type === "PURPOSE_BODY")?.content || "Surat keterangan ini diberikan untuk keperluan warga."}
              </p>

              <p className="text-justify text-xs text-slate-800">
                {blocks.find((b) => b.type === "CLOSING")?.content || "Demikian surat ini dibuat sebagaimana mestinya."}
              </p>

              {/* Dynamic Signees Grid */}
              <div className="pt-6 font-sans">
                {(() => {
                  const sigBlock = blocks.find((b) => b.type === "SIGNATURE_BLOCK");
                  const signeesList = sigBlock?.signees || defaultSignees;
                  const colsClass =
                    signeesList.length === 1
                      ? "grid-cols-1 justify-items-center"
                      : signeesList.length === 2
                      ? "grid-cols-2"
                      : signeesList.length === 3
                      ? "grid-cols-3"
                      : "grid-cols-2 sm:grid-cols-4";

                  return (
                    <div className={`grid ${colsClass} gap-4 text-center text-xs items-end`}>
                      {signeesList.map((sig) => (
                        <div key={sig.id} className="space-y-2 relative p-2">
                          <p className="text-slate-500">{sig.signeeType === "WARGA" ? "Pemohon," : "Mengetahui,"}</p>
                          <div className="h-16 flex items-center justify-center relative">
                            {sig.showStamp && (
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 border border-dashed border-red-500/70 rounded-full flex flex-col items-center justify-center text-red-600 font-bold text-[7px] uppercase rotate-[-12deg] bg-red-50/20">
                                <span>STEMPEL RT</span>
                                <span>VERIFIED</span>
                              </div>
                            )}
                            <div className="text-[10px] text-emerald-600 font-bold font-mono">
                              ✓ {sig.signeeType === "WARGA" ? "TTD DIGITAL WARGA" : "TTD DIGITAL RT"}
                            </div>
                          </div>
                          <p className="font-bold underline uppercase text-slate-900">
                            ( {sig.citizenName || sig.titleLabel} )
                          </p>
                          <p className="text-[10px] text-slate-500">{sig.titleLabel}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            /* REAL-TIME INTERACTIVE A4 CANVAS BUILDER */
            <div className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-3xl border-2 border-slate-300 dark:border-emerald-500/40 shadow-2xl p-4 sm:p-8 min-h-[800px] relative space-y-4">
              <div className="flex items-center justify-between border-b pb-3 text-xs font-sans text-muted-foreground">
                <span className="font-extrabold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <PenTool className="w-4 h-4" /> INTERACTIVE A4 CANVAS ({blocks.length} Komponen)
                </span>
                <span className="hidden sm:inline italic">Klik teks pada canvas untuk edit langsung!</span>
              </div>

              {/* Render Drag & Drop Block Cards inside A4 Canvas */}
              <div className="space-y-4">
                {blocks.map((block, idx) => {
                  const isSelected = selectedBlockId === block.id;

                  return (
                    <motion.div
                      key={block.id}
                      layout
                      onClick={() => setSelectedBlockId(block.id)}
                      className={`group relative rounded-2xl p-4 transition-all border-2 ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-500/5 shadow-md ring-2 ring-emerald-500/20"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:border-emerald-500/40"
                      }`}
                    >
                      {/* Block Quick Action Floating Bar */}
                      <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1 bg-card border border-border p-1 rounded-xl shadow-md z-20">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={idx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveBlock(idx, "UP");
                          }}
                          className="h-7 w-7 p-0"
                          title="Naikkan Ke Atas"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={idx === blocks.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveBlock(idx, "DOWN");
                          }}
                          className="h-7 w-7 p-0"
                          title="Turunkan Ke Bawah"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateBlock(idx);
                          }}
                          className="h-7 w-7 p-0 text-blue-500"
                          title="Duplikasi"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeBlock(idx);
                          }}
                          className="h-7 w-7 p-0 text-rose-500"
                          title="Hapus Blok"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      {/* Header Badge tag */}
                      <div className="flex items-center gap-2 mb-2 font-sans">
                        <GripVertical className="w-4 h-4 text-slate-400 cursor-grab shrink-0" />
                        <Badge variant="outline" className="text-[10px] font-mono font-bold bg-background">
                          {idx + 1}. {block.type}
                        </Badge>
                      </div>

                      {/* DIRECT IN-CANVAS CONTENT EDITING */}
                      {block.type === "HEADER_KOP" && (
                        <div className="text-center font-sans space-y-1 border-b-2 border-slate-900 pb-2">
                          <input
                            value={block.title || ""}
                            onChange={(e) => handleUpdateBlockContent(idx, "title", e.target.value)}
                            className="w-full text-center font-extrabold text-sm sm:text-base tracking-wider uppercase bg-transparent border-b border-dashed border-transparent hover:border-slate-400 focus:border-emerald-500 focus:bg-background focus:outline-none rounded px-2 py-0.5"
                            placeholder="PENGURUS RT 04 / RW 09"
                          />
                          <input
                            value={block.subTitle || ""}
                            onChange={(e) => handleUpdateBlockContent(idx, "subTitle", e.target.value)}
                            className="w-full text-center font-bold text-xs uppercase bg-transparent border-b border-dashed border-transparent hover:border-slate-400 focus:border-emerald-500 focus:bg-background focus:outline-none rounded px-2 py-0.5"
                            placeholder="KELURAHAN MEKAR, KECAMATAN KEBAYORAN BARU"
                          />
                          <input
                            value={block.content || ""}
                            onChange={(e) => handleUpdateBlockContent(idx, "content", e.target.value)}
                            className="w-full text-center text-[11px] italic bg-transparent border-b border-dashed border-transparent hover:border-slate-400 focus:border-emerald-500 focus:bg-background focus:outline-none rounded px-2 py-0.5"
                            placeholder="Sekretariat: Jl. Kemang Raya No. 04 Jakarta Selatan"
                          />
                        </div>
                      )}

                      {block.type === "DOCUMENT_TITLE" && (
                        <div className="text-center space-y-1 font-sans">
                          <input
                            value={block.title || ""}
                            onChange={(e) => handleUpdateBlockContent(idx, "title", e.target.value)}
                            className="w-full text-center font-extrabold text-sm sm:text-base underline uppercase bg-transparent border-b border-dashed border-transparent hover:border-slate-400 focus:border-emerald-500 focus:bg-background focus:outline-none rounded px-2 py-0.5 text-emerald-800 dark:text-emerald-400"
                            placeholder="SURAT KETERANGAN RT"
                          />
                          <input
                            value={block.subTitle || ""}
                            onChange={(e) => handleUpdateBlockContent(idx, "subTitle", e.target.value)}
                            className="w-full text-center text-xs font-mono bg-transparent border-b border-dashed border-transparent hover:border-slate-400 focus:border-emerald-500 focus:bg-background focus:outline-none rounded px-2 py-0.5"
                            placeholder="Nomor: 470/[NOMOR]/RT04/RW09/[BULAN]/[TAHUN]"
                          />
                        </div>
                      )}

                      {block.type === "PARAGRAPH" && (
                        <textarea
                          rows={2}
                          value={block.content || ""}
                          onChange={(e) => handleUpdateBlockContent(idx, "content", e.target.value)}
                          className="w-full text-xs font-serif leading-relaxed bg-transparent border border-dashed border-transparent hover:border-slate-400 focus:border-emerald-500 focus:bg-background focus:outline-none rounded p-2 resize-none"
                          placeholder="Yang bertanda tangan di bawah ini..."
                        />
                      )}

                      {block.type === "CITIZEN_FIELDS" && (
                        <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl font-sans text-xs space-y-1.5 border border-slate-200 dark:border-slate-800">
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 text-[11px] block">
                            ✓ Auto-fill Variable Table Data Warga (KTP & KK):
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
                            <span className="bg-background px-2 py-1 rounded border">Nama Lengkap</span>
                            <span className="bg-background px-2 py-1 rounded border">NIK (16 Digit)</span>
                            <span className="bg-background px-2 py-1 rounded border">Tempat, Tgl Lahir</span>
                            <span className="bg-background px-2 py-1 rounded border">Jenis Kelamin</span>
                            <span className="bg-background px-2 py-1 rounded border">Agama & Pekerjaan</span>
                            <span className="bg-background px-2 py-1 rounded border">Alamat Domisili</span>
                          </div>
                        </div>
                      )}

                      {block.type === "PURPOSE_BODY" && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground font-sans">
                            Teks Keperluan / Maksud Warga:
                          </label>
                          <textarea
                            rows={3}
                            value={block.content || ""}
                            onChange={(e) => handleUpdateBlockContent(idx, "content", e.target.value)}
                            className="w-full text-xs font-serif leading-relaxed bg-transparent border border-dashed border-transparent hover:border-slate-400 focus:border-emerald-500 focus:bg-background focus:outline-none rounded p-2 resize-none"
                            placeholder="Surat pengantar ini diberikan untuk keperluan..."
                          />
                        </div>
                      )}

                      {block.type === "CLOSING" && (
                        <input
                          value={block.content || ""}
                          onChange={(e) => handleUpdateBlockContent(idx, "content", e.target.value)}
                          className="w-full text-xs font-serif italic bg-transparent border border-dashed border-transparent hover:border-slate-400 focus:border-emerald-500 focus:bg-background focus:outline-none rounded p-2"
                          placeholder="Demikian surat ini dibuat..."
                        />
                      )}

                      {/* SIGNATURE BLOCK ON CANVAS WITH STAFF & CITIZEN PICKER */}
                      {block.type === "SIGNATURE_BLOCK" && (
                        <div className="space-y-3 font-sans pt-2 border-t border-slate-200 dark:border-slate-800">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <Stamp className="w-4 h-4 text-emerald-600" /> Penandatangan Surat ({block.signees?.length || 0} Kolom)
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddSignee(idx)}
                              className="text-xs font-bold border-emerald-500/40 text-emerald-600 h-8 gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" /> Tambah TTD
                            </Button>
                          </div>

                          {/* Render Signee Columns Visual */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {(block.signees || defaultSignees).map((sig, sigIdx) => (
                              <div
                                key={sig.id}
                                className="p-3 rounded-xl bg-background border border-border shadow-2xs space-y-2 relative"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSignee(idx, sigIdx)}
                                  className="absolute top-2 right-2 text-rose-500 hover:text-rose-600 w-6 h-6 rounded-lg flex items-center justify-center hover:bg-rose-500/10"
                                  title="Hapus Penandatangan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Staff vs Citizen Switcher */}
                                <div className="space-y-1.5 pr-6 text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateSignee(idx, sigIdx, { signeeType: "STAFF" })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        sig.signeeType === "STAFF"
                                          ? "bg-emerald-600 text-white"
                                          : "bg-muted text-muted-foreground"
                                      }`}
                                    >
                                      Staff RT
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateSignee(idx, sigIdx, { signeeType: "WARGA" })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        sig.signeeType === "WARGA"
                                          ? "bg-emerald-600 text-white"
                                          : "bg-muted text-muted-foreground"
                                      }`}
                                    >
                                      Warga / Pemohon
                                    </button>
                                  </div>

                                  {/* Staff Role Selector */}
                                  {sig.signeeType === "STAFF" ? (
                                    <div className="space-y-1 pt-1">
                                      <label className="text-[10px] text-muted-foreground font-semibold">Jabatan Staff:</label>
                                      <select
                                        value={sig.staffRole || "KETUA"}
                                        onChange={(e) =>
                                          handleUpdateSignee(idx, sigIdx, {
                                            staffRole: e.target.value as StaffRole,
                                          })
                                        }
                                        className="w-full h-8 px-2 rounded border border-border bg-card text-xs"
                                      >
                                        {Object.entries(STAFF_ROLE_LABELS).map(([k, label]) => (
                                          <option key={k} value={k}>
                                            {label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  ) : (
                                    <div className="space-y-1 pt-1">
                                      <label className="text-[10px] text-muted-foreground font-semibold">Pilih Warga:</label>
                                      <input
                                        value={sig.citizenName || "Warga Pemohon (Auto-fill)"}
                                        onChange={(e) =>
                                          handleUpdateSignee(idx, sigIdx, { citizenName: e.target.value })
                                        }
                                        className="w-full h-8 px-2 rounded border border-border bg-card text-xs"
                                        placeholder="Warga Pemohon"
                                      />
                                    </div>
                                  )}

                                  {/* Custom Label */}
                                  <div className="space-y-1 pt-1">
                                    <label className="text-[10px] text-muted-foreground font-semibold">Judul TTD:</label>
                                    <input
                                      value={sig.titleLabel}
                                      onChange={(e) =>
                                        handleUpdateSignee(idx, sigIdx, { titleLabel: e.target.value })
                                      }
                                      className="w-full h-8 px-2 rounded border border-border bg-card text-xs font-bold"
                                    />
                                  </div>

                                  {/* Toggles */}
                                  <div className="flex items-center gap-3 pt-1 text-[11px]">
                                    <label className="flex items-center gap-1 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={sig.showStamp}
                                        onChange={(e) =>
                                          handleUpdateSignee(idx, sigIdx, { showStamp: e.target.checked })
                                        }
                                        className="rounded text-emerald-600"
                                      />
                                      <span>Stempel</span>
                                    </label>
                                    <label className="flex items-center gap-1 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={sig.showQr}
                                        onChange={(e) =>
                                          handleUpdateSignee(idx, sigIdx, { showQr: e.target.checked })
                                        }
                                        className="rounded text-emerald-600"
                                      />
                                      <span>QR Verification</span>
                                    </label>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT INSPECTOR PANEL (For Component Properties / Quick Inspection) */}
        {viewMode === "SPLIT" && (
          <div className="lg:col-span-3 space-y-5">
            <Card className="rounded-2xl border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-emerald-600" /> Component Inspector
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-3 text-xs">
                {activeSelectedBlock ? (
                  <div className="space-y-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <span className="font-extrabold text-emerald-700 dark:text-emerald-400 block text-xs">
                        {activeSelectedBlock.type}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Posisi Urutan #{activeSelectedBlockIndex + 1}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Judul / Title:</label>
                      <Input
                        value={activeSelectedBlock.title || ""}
                        onChange={(e) =>
                          handleUpdateBlockContent(activeSelectedBlockIndex, "title", e.target.value)
                        }
                        className="h-9 text-xs bg-background"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Sub-judul / Format:</label>
                      <Input
                        value={activeSelectedBlock.subTitle || ""}
                        onChange={(e) =>
                          handleUpdateBlockContent(activeSelectedBlockIndex, "subTitle", e.target.value)
                        }
                        className="h-9 text-xs bg-background"
                      />
                    </div>

                    {activeSelectedBlock.type !== "CITIZEN_FIELDS" && (
                      <div className="space-y-1">
                        <label className="font-semibold text-foreground">Isi Teks / Konten:</label>
                        <textarea
                          rows={4}
                          value={activeSelectedBlock.content || ""}
                          onChange={(e) =>
                            handleUpdateBlockContent(activeSelectedBlockIndex, "content", e.target.value)
                          }
                          className="w-full p-2 rounded-lg border border-border bg-background text-xs resize-none"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center py-4">
                    Klik salah satu blok pada canvas di sebelah kiri untuk memeriksa properti.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Approval Workflow Checklist Card */}
            <Card className="rounded-2xl border-border bg-emerald-950/10 border-emerald-500/20 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Alur Verifikasi Surat
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireSecretary}
                    onChange={(e) => setRequireSecretary(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span className="font-bold">Verifikasi Sekretaris RT</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireRT}
                    onChange={(e) => setRequireRT(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span className="font-bold">Tanda Tangan Digital Ketua RT</span>
                </label>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
