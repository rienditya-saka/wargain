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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export interface TemplateBlock {
  id: string;
  type: "HEADER_KOP" | "DOCUMENT_TITLE" | "PARAGRAPH" | "CITIZEN_FIELDS" | "PURPOSE_BODY" | "CLOSING" | "SIGNATURE_BLOCK";
  title?: string;
  content?: string;
  subTitle?: string;
  fields?: string[];
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
  { type: "HEADER_KOP", label: "Kop Surat Resmi RT/RW", desc: "Logo, alamat RT/RW, dan garis ganda resmi." },
  { type: "DOCUMENT_TITLE", label: "Judul & Format Nomor Surat", desc: "Nama surat dan format penomoran arsip." },
  { type: "PARAGRAPH", label: "Paragraf Pembuka / Bebas", desc: "Teks pengantar sebelum data warga." },
  { type: "CITIZEN_FIELDS", label: "Variabel Data Warga (Auto-fill)", desc: "NIK, Nama, TTL, Jenis Kelamin, Agama, Alamat." },
  { type: "PURPOSE_BODY", label: "Isi Keterangan / Keperluan", desc: "Pernyataan maksud surat dan tujuan warga." },
  { type: "CLOSING", label: "Kalimat Penutup", desc: "Demikian surat ini dibuat sebagaimana mestinya..." },
  { type: "SIGNATURE_BLOCK", label: "Blok Tanda Tangan & Stempel", desc: "Tanda tangan Pemohon, Sekretaris, & Ketua RT." },
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

  // Components Blocks state
  const defaultComponents: TemplateBlock[] = [
    { id: "b-kop", type: "HEADER_KOP", title: communityName, settings: { lineStyle: "double" } },
    { id: "b-title", type: "DOCUMENT_TITLE", title: "SURAT KETERANGAN", subTitle: "Nomor: 470/[NOMOR]/RT04/RW09/[BULAN]/[TAHUN]" },
    { id: "b-open", type: "PARAGRAPH", content: "Yang bertanda tangan di bawah ini Ketua RT/RW menerangkan bahwa:" },
    { id: "b-cit", type: "CITIZEN_FIELDS", fields: ["fullName", "nik", "gender", "birthInfo", "religion", "occupation", "address"] },
    { id: "b-purp", type: "PURPOSE_BODY", content: "Adalah benar warga kami yang bertempat tinggal di lingkungan RT kami dan mengajukan surat ini untuk keperluan: [KEPERLUAN_WARGA]." },
    { id: "b-close", type: "CLOSING", content: "Demikian surat ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya." },
    { id: "b-sign", type: "SIGNATURE_BLOCK", layout: "TWO_COLUMNS", settings: { includeApplicant: true, includeSecretary: false, includeRT: true, includeStamp: true } },
  ];

  const [blocks, setBlocks] = useState<TemplateBlock[]>(
    initialTemplate?.components?.length > 0 ? initialTemplate.components : defaultComponents
  );

  const [previewMode, setPreviewMode] = useState<"BUILDER" | "PREVIEW">("BUILDER");
  const [isSaving, setIsSaving] = useState(false);

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
    setBlocks(blocks.filter((_, i) => i !== index));
    toast.info("Komponen blok dihapus dari template.");
  };

  const addBlock = (type: TemplateBlock["type"]) => {
    const newId = `b_${Date.now()}`;
    const newBlock: TemplateBlock = {
      id: newId,
      type,
      title: type === "DOCUMENT_TITLE" ? "SURAT KETERANGAN" : undefined,
      content: type === "PARAGRAPH" ? "Isi keterangan tambahan..." : undefined,
      fields: type === "CITIZEN_FIELDS" ? ["fullName", "nik", "address"] : undefined,
    };
    setBlocks([...blocks, newBlock]);
    toast.success("Komponen baru ditambahkan ke template!");
  };

  const handleUpdateBlockContent = (index: number, field: string, value: any) => {
    setBlocks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
              <Sparkles className="w-3 h-3 mr-1" /> RT Document Studio
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Khusus Ketua & Sekretaris RT
            </Badge>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight mt-1">
            {initialTemplate ? `Edit: ${initialTemplate.title}` : "Buat Template Surat Baru"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Susun komponen surat resmi, format data isian, dan alur tanda tangan digital.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <div className="bg-muted p-1 rounded-xl flex items-center gap-1 border border-border">
            <button
              onClick={() => setPreviewMode("BUILDER")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all min-h-[44px] sm:min-h-0 ${
                previewMode === "BUILDER" ? "bg-card text-emerald-600 shadow-sm border border-border" : "text-muted-foreground"
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Susun Blok
            </button>
            <button
              onClick={() => setPreviewMode("PREVIEW")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all min-h-[44px] sm:min-h-0 ${
                previewMode === "PREVIEW" ? "bg-card text-emerald-600 shadow-sm border border-border" : "text-muted-foreground"
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Pratinjau Kertas A4
            </button>
          </div>

          <Button
            onClick={handleSaveTemplate}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl gap-1.5 shadow-md shadow-emerald-600/20 min-h-[44px]"
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

      {previewMode === "BUILDER" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Metadata & Approval Workflow */}
          <div className="space-y-6">
            <Card className="rounded-2xl border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-emerald-600" /> Informasi Dasar Surat
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Nama / Judul Template:</label>
                  <Input
                    value={templateTitle}
                    onChange={(e) => setTemplateTitle(e.target.value)}
                    placeholder="Contoh: Surat Pengantar SKCK"
                    className="h-10 text-xs bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Kode Dokumen:</label>
                  <Input
                    value={templateCode}
                    onChange={(e) => setTemplateCode(e.target.value)}
                    placeholder="Contoh: SURAT_PENGANTAR_SKCK"
                    className="h-10 text-xs uppercase font-mono bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Kategori Surat:</label>
                  <select
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs"
                  >
                    <option value="UMUM">Umum</option>
                    <option value="KEPENDUDUKAN">Kependudukan</option>
                    <option value="HUKUM">Hukum & Kepolisian</option>
                    <option value="USAHA">Usaha & UMKM</option>
                    <option value="SOSIAL">Sosial & Bansos</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Keterangan / Persyaratan Dokumen:</label>
                  <textarea
                    rows={3}
                    value={templateDesc}
                    onChange={(e) => setTemplateDesc(e.target.value)}
                    placeholder="Persyaratan fotokopi KTP, KK, foto, dll."
                    className="w-full p-2.5 rounded-lg border border-border bg-background text-xs resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Approval Workflow Settings */}
            <Card className="rounded-2xl border-border bg-emerald-950/10 border-emerald-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Alur Persetujuan (Approval)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border transition-all">
                  <input
                    type="checkbox"
                    checked={requireSecretary}
                    onChange={(e) => setRequireSecretary(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-foreground">Verifikasi Sekretaris RT</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Pengajuan harus diperiksa kelengkapan berkas oleh Sekretaris sebelum tanda tangan Ketua RT.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border transition-all">
                  <input
                    type="checkbox"
                    checked={requireRT}
                    onChange={(e) => setRequireRT(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-foreground">Tanda Tangan Digital Ketua RT</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Wajib ditandatangani oleh Ketua RT dan dibubuhi stempel RT resmi.
                    </p>
                  </div>
                </label>
              </CardContent>
            </Card>

            {/* Palette: Add Components */}
            <Card className="rounded-2xl border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-600" /> Tambah Blok Dokumen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {AVAILABLE_BLOCKS.map((block) => (
                  <button
                    key={block.type}
                    type="button"
                    onClick={() => addBlock(block.type as any)}
                    className="w-full text-left p-2.5 rounded-xl border border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all flex items-center justify-between group min-h-[44px]"
                  >
                    <div>
                      <div className="text-xs font-bold text-foreground group-hover:text-emerald-600">
                        + {block.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{block.desc}</div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Center & Right Column: Ordered Blocks List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
              <span>SUSUNAN URUTAN DOKUMEN ({blocks.length} Blok)</span>
              <span>Gunakan tombol panah untuk naik/turun</span>
            </div>

            <div className="space-y-3">
              {blocks.map((block, idx) => (
                <motion.div
                  key={block.id || idx}
                  layout
                  className="p-4 rounded-2xl bg-card border border-border shadow-sm hover:border-emerald-500/40 transition-all space-y-3"
                >
                  {/* Block Header */}
                  <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-[11px] font-bold text-foreground">
                        {idx + 1}
                      </span>
                      <Badge variant="secondary" className="text-[11px] font-bold">
                        {block.type}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={idx === 0}
                        onClick={() => moveBlock(idx, "UP")}
                        className="h-8 w-8 p-0"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={idx === blocks.length - 1}
                        onClick={() => moveBlock(idx, "DOWN")}
                        className="h-8 w-8 p-0"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBlock(idx)}
                        className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Block Content Inputs */}
                  {block.type === "HEADER_KOP" && (
                    <div className="space-y-2 text-xs">
                      <label className="font-semibold text-foreground">Kop / Nama Rukun Warga:</label>
                      <Input
                        value={block.title || ""}
                        onChange={(e) => handleUpdateBlockContent(idx, "title", e.target.value)}
                        placeholder="KOP RT/RW"
                        className="h-9 text-xs bg-background"
                      />
                      <p className="text-[11px] text-muted-foreground italic">
                        * Kop resmi otomatis mencetak garis ganda hitam tebal tipis khas administrasi pemerintahan desa/kelurahan.
                      </p>
                    </div>
                  )}

                  {block.type === "DOCUMENT_TITLE" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="font-semibold text-foreground">Judul Surat:</label>
                        <Input
                          value={block.title || ""}
                          onChange={(e) => handleUpdateBlockContent(idx, "title", e.target.value)}
                          placeholder="SURAT PENGANTAR"
                          className="h-9 text-xs font-bold bg-background"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-foreground">Format Nomor Surat:</label>
                        <Input
                          value={block.subTitle || ""}
                          onChange={(e) => handleUpdateBlockContent(idx, "subTitle", e.target.value)}
                          placeholder="Nomor: [NOMOR_SURAT]"
                          className="h-9 text-xs bg-background"
                        />
                      </div>
                    </div>
                  )}

                  {block.type === "PARAGRAPH" && (
                    <div className="space-y-1 text-xs">
                      <label className="font-semibold text-foreground">Teks Paragraf:</label>
                      <textarea
                        rows={2}
                        value={block.content || ""}
                        onChange={(e) => handleUpdateBlockContent(idx, "content", e.target.value)}
                        className="w-full p-2 rounded-lg border border-border bg-background text-xs resize-none"
                      />
                    </div>
                  )}

                  {block.type === "CITIZEN_FIELDS" && (
                    <div className="space-y-2 text-xs">
                      <label className="font-semibold text-foreground">Field Data Warga yang Dicantumkan:</label>
                      <div className="flex flex-wrap gap-1.5">
                        {["Nama Lengkap", "NIK (16 Digit)", "Jenis Kelamin", "TTL", "Agama", "Pekerjaan", "Alamat Domisili"].map(
                          (fieldName) => (
                            <Badge key={fieldName} variant="outline" className="bg-muted text-[11px] py-1 px-2.5">
                              ✓ {fieldName}
                            </Badge>
                          )
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        * Terisi otomatis dari database Kependudukan Warga saat warga login / mengajukan.
                      </p>
                    </div>
                  )}

                  {block.type === "PURPOSE_BODY" && (
                    <div className="space-y-1 text-xs">
                      <label className="font-semibold text-foreground">Teks Keterangan & Keperluan Warga:</label>
                      <textarea
                        rows={3}
                        value={block.content || ""}
                        onChange={(e) => handleUpdateBlockContent(idx, "content", e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-border bg-background text-xs resize-none"
                      />
                    </div>
                  )}

                  {block.type === "CLOSING" && (
                    <div className="space-y-1 text-xs">
                      <label className="font-semibold text-foreground">Kalimat Penutup:</label>
                      <Input
                        value={block.content || ""}
                        onChange={(e) => handleUpdateBlockContent(idx, "content", e.target.value)}
                        className="h-9 text-xs bg-background"
                      />
                    </div>
                  )}

                  {block.type === "SIGNATURE_BLOCK" && (
                    <div className="space-y-2 text-xs">
                      <span className="font-semibold text-foreground">Penandatangan & Stempel:</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2.5 rounded-xl bg-muted/50 border border-border text-center">
                          <UserCheck className="w-4 h-4 mx-auto mb-1 text-slate-500" />
                          <span className="font-bold text-[11px] block">Pemohon (Warga)</span>
                          <span className="text-[10px] text-muted-foreground">TTD Digital Warga</span>
                        </div>

                        {requireSecretary ? (
                          <div className="p-2.5 rounded-xl bg-muted/50 border border-border text-center">
                            <PenTool className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                            <span className="font-bold text-[11px] block">Sekretaris RT</span>
                            <span className="text-[10px] text-muted-foreground">Verifikasi & TTD</span>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-muted/20 border border-dashed border-border text-center opacity-40">
                            <span className="font-bold text-[11px] block">Sekretaris RT</span>
                            <span className="text-[10px]">Dilewati</span>
                          </div>
                        )}

                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center text-emerald-700 dark:text-emerald-400">
                          <Stamp className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                          <span className="font-bold text-[11px] block">Ketua RT + Stempel</span>
                          <span className="text-[10px]">Tanda Tangan & Cap</span>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Preview Mode: Simulated A4 Sheet */
        <div className="flex justify-center p-4">
          <div className="w-full max-w-2xl bg-white text-slate-900 rounded-xl shadow-2xl p-8 sm:p-12 border border-neutral-300 font-serif leading-relaxed text-sm space-y-6">
            {/* KOP */}
            <div className="text-center space-y-1">
              <h3 className="font-sans font-extrabold text-base tracking-wider uppercase">
                PENGURUS RUKUN TETANGGA 04 / RUKUN WARGA 09
              </h3>
              <h4 className="font-sans font-bold text-sm uppercase">
                KELURAHAN MEKAR, KECAMATAN KEBAYORAN BARU, JAKARTA SELATAN
              </h4>
              <p className="font-sans text-[11px] text-slate-600 italic">
                Sekretariat: Jl. Kemang Raya No. 04 Jakarta Selatan • Telp: 081234567890
              </p>
              {/* Double line KOP */}
              <div className="pt-2">
                <div className="border-b-2 border-slate-900 w-full mb-0.5" />
                <div className="border-b border-slate-900 w-full" />
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center pt-2">
              <h2 className="font-sans font-bold text-base underline underline-offset-4 tracking-wide uppercase">
                {templateTitle.toUpperCase()}
              </h2>
              <p className="text-xs font-sans text-slate-600 mt-1">
                Nomor: 470/024/RT04/RW09/IX/2026
              </p>
            </div>

            {/* Opening */}
            <p className="text-justify text-xs">
              Yang bertanda tangan di bawah ini Ketua RT 04 / RW 09 Kelurahan Mekar, Kecamatan Kebayoran Baru, dengan ini menerangkan bahwa:
            </p>

            {/* Citizen Fields table */}
            <div className="pl-6 space-y-1.5 text-xs font-sans">
              <div className="grid grid-cols-3">
                <span className="font-medium text-slate-600">Nama Lengkap</span>
                <span className="col-span-2 font-bold">: Bpk. Bambang Sujatmiko</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="font-medium text-slate-600">NIK (KTP)</span>
                <span className="col-span-2 font-mono">: 3174051204890001</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="font-medium text-slate-600">Tempat, Tgl Lahir</span>
                <span className="col-span-2">: Jakarta, 12 April 1989</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="font-medium text-slate-600">Jenis Kelamin</span>
                <span className="col-span-2">: Laki-laki</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="font-medium text-slate-600">Agama / Pekerjaan</span>
                <span className="col-span-2">: Islam / Karyawan Swasta</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="font-medium text-slate-600">Alamat KTP / Domisili</span>
                <span className="col-span-2">: Jl. Kemang Raya No. 04 RT 04 / RW 09</span>
              </div>
            </div>

            {/* Purpose */}
            <p className="text-justify text-xs">
              Orang tersebut di atas adalah benar-benar warga yang bertempat tinggal di lingkungan RT 04 / RW 09 dan berkelakuan baik. Surat pengantar ini diberikan untuk keperluan: <strong>Kelengkapan Berkas Administrasi Surat Keterangan Catatan Kepolisian (SKCK) di Polsek Kebayoran Baru</strong>.
            </p>

            {/* Closing */}
            <p className="text-justify text-xs">
              Demikian surat pengantar ini kami buat dengan sebenarnya agar dapat dipergunakan menurut keperluannya.
            </p>

            {/* Signatures & Stamp area */}
            <div className="pt-6 grid grid-cols-2 text-center text-xs font-sans">
              <div className="space-y-16">
                <div>
                  <p className="text-slate-500">Pemohon,</p>
                </div>
                <div>
                  <p className="font-bold underline uppercase">( Bambang Sujatmiko )</p>
                </div>
              </div>

              <div className="space-y-16 relative">
                <div>
                  <p className="text-slate-500">Jakarta, 21 September 2026</p>
                  <p className="font-bold">Ketua RT 04 / RW 09</p>
                </div>

                {/* Stempel RT stamp simulation */}
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-24 h-24 border-2 border-dashed border-red-500/60 rounded-full flex items-center justify-center text-red-600 font-bold text-[9px] uppercase rotate-[-12deg] pointer-events-none select-none">
                  STEMPEL RT 04
                </div>

                <div>
                  <p className="font-bold underline uppercase">( Bpk. H. Bambang Sujatmiko )</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
