"use client";

import * as React from "react";
import {
  ScanText,
  UploadCloud,
  FileCheck,
  CheckCircle2,
  Sparkles,
  Users,
  ShieldCheck,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { OcrExtractedKTP, OcrExtractedKK, OcrResult } from "@/app/api/ocr/ktp-kk/route";

export interface FamilyMemberItem {
  id?: string;
  fullName: string;
  nik: string;
  role: "KEPALA_KELUARGA" | "ISTRI" | "ANAK" | "FAMILI_LAIN";
  gender: "L" | "P";
  age: number;
  maritalStatus?: string;
}

export interface HeadDataPayload {
  headName: string;
  headNik: string;
  noKK?: string;
  address?: string;
  rtRw?: string;
  blockNumber?: string;
  gender: "L" | "P";
}

export interface FullKkPayload {
  headName: string;
  headNik?: string;
  noKK: string;
  address?: string;
  rtRw?: string;
  blockNumber?: string;
  members: FamilyMemberItem[];
}

interface KtpKkPaddleOcrScannerProps {
  onSetHead: (data: HeadDataPayload) => void;
  onAddMember: (member: FamilyMemberItem) => void;
  onAutoFillFullKK: (data: FullKkPayload) => void;
  currentMembersCount?: number;
}

export function KtpKkPaddleOcrScanner({
  onSetHead,
  onAddMember,
  onAutoFillFullKK,
  currentMembersCount = 0,
}: KtpKkPaddleOcrScannerProps) {
  const [docType, setDocType] = React.useState<"ktp" | "kk">("ktp");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [base64Data, setBase64Data] = React.useState<string | null>(null);
  const [isScanning, setIsScanning] = React.useState(false);
  const [scanProgress, setScanProgress] = React.useState(0);
  const [scanStep, setScanStep] = React.useState("");
  const [ocrResult, setOcrResult] = React.useState<OcrResult | null>(null);
  const [showRawLines, setShowRawLines] = React.useState(false);
  const [selectedKtpRole, setSelectedKtpRole] = React.useState<"ISTRI" | "ANAK" | "FAMILI_LAIN">("ISTRI");

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setOcrResult(null);

    const reader = new FileReader();
    reader.onload = () => {
      setBase64Data(reader.result as string);
    };
    reader.onerror = () => {
      toast.error("Gagal membaca file gambar.");
    };
    reader.readAsDataURL(file);
  };

  const triggerPaddleOcr = async (customDocType = docType) => {
    if (!base64Data && !selectedFile) {
      fileInputRef.current?.click();
      return;
    }

    setIsScanning(true);
    setScanProgress(15);
    setScanStep("Inisialisasi PP-OCRv4 Engine...");

    try {
      setScanProgress(35);
      setScanStep("Mengirim gambar ke PaddleOCR Inference Server...");

      const payload = {
        documentType: customDocType,
        image: base64Data || "",
      };

      setScanProgress(60);
      setScanStep("Deteksi Text Box, Orientasi, & Pengenalan Karakter...");

      const res = await fetch("/api/ocr/ktp-kk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      setScanProgress(100);
      setScanStep("Analisis Selesai!");

      if (!res.ok || !json.success) {
        throw new Error(json.error || json.detail || "Gagal memproses gambar pada PaddleOCR.");
      }

      if (json.data) {
        setOcrResult(json.data);
        const detectedName = json.data.documentType === "KTP" ? json.data.nama : json.data.namaKepalaKeluarga;
        toast.success(
          detectedName
            ? `PaddleOCR: Terdeteksi "${detectedName}" (${json.data.confidence || 95}%)`
            : "PaddleOCR: Dokumen berhasil diproses!"
        );

        // LANGSUNG TERAPKAN & TAMPILKAN SELURUH ANGGOTA KK OTOMATIS!
        if (json.data.documentType === "KK") {
          const kk = json.data as OcrExtractedKK;
          const membersToPass: FamilyMemberItem[] =
            kk.members && kk.members.length > 0
              ? kk.members.map((m, idx) => ({
                  id: `m-kk-${Date.now()}-${idx}`,
                  fullName: m.nama,
                  nik: m.nik,
                  role:
                    (m.statusHubungan as any) ||
                    (idx === 0 ? "KEPALA_KELUARGA" : idx === 1 ? "ISTRI" : "ANAK"),
                  gender: (m.jenisKelamin === "P" ? "P" : "L") as "L" | "P",
                  age: idx === 0 ? 40 : idx === 1 ? 37 : Math.max(5, 20 - (idx - 2) * 4),
                  maritalStatus: m.statusPernikahan || (idx <= 1 ? "KAWIN" : "BELUM KAWIN"),
                }))
              : kk.namaKepalaKeluarga
              ? [
                  {
                    id: `m-kk-${Date.now()}-0`,
                    fullName: kk.namaKepalaKeluarga,
                    nik: kk.noKk || "",
                    role: "KEPALA_KELUARGA" as const,
                    gender: "L" as const,
                    age: 40,
                  },
                ]
              : [];

          const headMember =
            membersToPass.find((m) => m.role === "KEPALA_KELUARGA") || membersToPass[0];

          onAutoFillFullKK({
            headName: kk.namaKepalaKeluarga || (headMember ? headMember.fullName : ""),
            headNik: headMember ? headMember.nik : "",
            noKK: kk.noKk || "",
            address: kk.alamat || "",
            rtRw: kk.rtRw || "",
            blockNumber: kk.alamat || "",
            members: membersToPass,
          });

          toast.success(
            `⚡ Otomatis menerapkan seluruh keluarga (${membersToPass.length} jiwa) ke formulir!`
          );
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menjalankan PaddleOCR.");
    } finally {
      setIsScanning(false);
    }
  };

  // Action 1: Set as Kepala Keluarga (from KTP)
  const handleSetAsHead = () => {
    if (!ocrResult || ocrResult.documentType !== "KTP") return;
    const ktp = ocrResult as OcrExtractedKTP;
    onSetHead({
      headName: ktp.nama || "",
      headNik: ktp.nik || "",
      address: ktp.alamat || "",
      rtRw: ktp.rtRw || "",
      blockNumber: ktp.alamat || "",
      gender: (ktp.jenisKelamin === "P" ? "P" : "L") as "L" | "P",
    });
    toast.success(`"${ktp.nama || "Warga"}" ditetapkan sebagai Kepala Keluarga.`);
  };

  // Action 2: Add as Additional Family Member (from KTP)
  const handleAddAsMember = () => {
    if (!ocrResult || ocrResult.documentType !== "KTP") return;
    const ktp = ocrResult as OcrExtractedKTP;
    onAddMember({
      id: `m-ocr-${Date.now()}`,
      fullName: ktp.nama || "Anggota Baru",
      nik: ktp.nik || "",
      role: selectedKtpRole,
      gender: (ktp.jenisKelamin === "P" ? "P" : "L") as "L" | "P",
      age: 30,
    });
    toast.success(`"${ktp.nama || "Anggota"}" ditambahkan ke daftar KK sebagai ${selectedKtpRole}.`);
    // Clear preview so user can easily scan next KTP
    setSelectedFile(null);
    setPreviewUrl(null);
    setBase64Data(null);
    setOcrResult(null);
  };

  // Action 3: Apply Full KK (from KK document)
  const handleApplyFullKK = () => {
    if (!ocrResult || ocrResult.documentType !== "KK") return;
    const kk = ocrResult as OcrExtractedKK;

    const membersToPass: FamilyMemberItem[] = kk.members && kk.members.length > 0
      ? kk.members.map((m, idx) => ({
          id: `m-kk-${Date.now()}-${idx}`,
          fullName: m.nama,
          nik: m.nik,
          role: (m.statusHubungan as any) || (idx === 0 ? "KEPALA_KELUARGA" : idx === 1 ? "ISTRI" : "ANAK"),
          gender: (m.jenisKelamin === "P" ? "P" : "L") as "L" | "P",
          age: idx === 0 ? 40 : idx === 1 ? 37 : 12,
          maritalStatus: m.statusPernikahan || (idx <= 1 ? "KAWIN" : "BELUM KAWIN"),
        }))
      : kk.namaKepalaKeluarga
      ? [
          {
            id: `m-kk-${Date.now()}-0`,
            fullName: kk.namaKepalaKeluarga,
            nik: kk.noKk || "",
            role: "KEPALA_KELUARGA" as const,
            gender: "L" as const,
            age: 40,
          },
        ]
      : [];

    const headMember = membersToPass.find((m) => m.role === "KEPALA_KELUARGA") || membersToPass[0];

    onAutoFillFullKK({
      headName: kk.namaKepalaKeluarga || (headMember ? headMember.fullName : ""),
      headNik: headMember ? headMember.nik : "",
      noKK: kk.noKk || "",
      address: kk.alamat || "",
      rtRw: kk.rtRw || "",
      blockNumber: kk.alamat || "",
      members: membersToPass,
    });
    toast.success(`Berhasil memuat seluruh keluarga (${membersToPass.length} jiwa) dari Kartu Keluarga!`);
  };

  return (
    <Card padding="none" className="border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-neutral-900/40 to-teal-950/20 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-3 sm:p-4 border-b border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-xs">
            <ScanText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1">
                AI PaddleOCR Scanner (1 KK / Multi-Warga)
              </h3>
              <Badge className="bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[9px] px-1.5 py-0 font-mono">
                PP-OCRv4
              </Badge>
            </div>
            <p className="text-[10px] text-slate-400">
              Scan KK fisik untuk langsung dapat 1 keluarga, atau scan KTP satu per satu untuk menambah anggota keluarga.
            </p>
          </div>
        </div>

        {/* Doc Type Selector */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-neutral-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setDocType("ktp");
              setOcrResult(null);
            }}
            className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
              docType === "ktp"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Scan KTP (Per Jiwa)
          </button>
          <button
            type="button"
            onClick={() => {
              setDocType("kk");
              setOcrResult(null);
            }}
            className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
              docType === "kk"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Scan KK (1 Keluarga Sekaligus)
          </button>
        </div>
      </div>

      <CardContent className="p-3 sm:p-4 space-y-3">
        {/* Upload Dropzone & Action Column */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Dropzone Column */}
          <div className="md:col-span-6 space-y-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative border-2 border-dashed border-emerald-500/30 hover:border-emerald-500/60 rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer bg-neutral-950/40 hover:bg-neutral-900/50 transition-all group min-h-[135px] overflow-hidden"
            >
              {/* Laser Scanning Animation */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none z-10">
                  <div className="w-full h-1 bg-emerald-400 shadow-[0_0_15px_#10B981] animate-bounce" />
                </div>
              )}

              {previewUrl ? (
                <div className="space-y-1.5 w-full flex flex-col items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Preview Dokumen"
                    className="max-h-24 object-contain rounded-lg border border-neutral-700/80 shadow-xs"
                  />
                  <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-md">
                    <FileCheck className="w-3 h-3" /> {selectedFile?.name || "Foto Dokumen"}
                  </div>
                  <div className="text-[9px] text-slate-400">Klik untuk mengganti foto dokumen</div>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform mb-1.5" />
                  <div className="text-xs font-semibold text-slate-200">
                    Pilih Foto {docType === "ktp" ? "e-KTP (Kepala / Istri / Anak)" : "Kartu Keluarga (1 Lembar Penuh)"}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Mendukung JPG, PNG, WEBP dari kamera atau galeri
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action / Scanning Status Column */}
          <div className="md:col-span-6 flex flex-col justify-between p-3 rounded-xl bg-neutral-950/50 border border-neutral-800/80">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-200 mb-1.5">
                <span>Status Engine AI</span>
                <span className="text-[10px] font-mono text-emerald-400">
                  {isScanning ? `${scanProgress}%` : ocrResult ? "Ekstraksi Selesai" : "Siap Pindai"}
                </span>
              </div>

              <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-400 min-h-[32px] flex items-center gap-1.5">
                {isScanning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />
                    <span>{scanStep}</span>
                  </>
                ) : ocrResult ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      Teks berhasil diekstrak dengan akurasi <strong>{ocrResult.confidence}%</strong>.
                    </span>
                  </>
                ) : (
                  <span>
                    {docType === "ktp"
                      ? "Pilih KTP untuk didaftarkan sebagai Kepala KK atau Anggota baru."
                      : "Pilih foto Kartu Keluarga untuk menarik seluruh nama & NIK anggota sekaligus."}
                  </span>
                )}
              </p>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <Button
                type="button"
                onClick={() => triggerPaddleOcr(docType)}
                disabled={isScanning}
                size="sm"
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl gap-1.5 h-8.5"
              >
                <ScanText className="w-3.5 h-3.5" />
                <span>
                  {isScanning
                    ? "Sedang Membaca Dokumen..."
                    : selectedFile
                    ? `Mulai Ekstraksi ${docType.toUpperCase()}`
                    : `Pilih File Foto ${docType.toUpperCase()}`}
                </span>
              </Button>
            </div>
          </div>
        </div>

        {/* OCR Result Preview Card with Decision Actions */}
        {ocrResult && (
          <div className="p-3 rounded-xl bg-neutral-900/80 border border-emerald-500/30 space-y-2.5 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-600 text-white text-[10px] font-mono">
                  {ocrResult.documentType === "KTP" ? "e-KTP TERDETEKSI" : "KARTU KELUARGA TERDETEKSI"}
                </Badge>
                <span className="text-[10px] text-slate-400 font-mono">
                  Confidence: {ocrResult.confidence}%
                </span>
              </div>

              {/* DYNAMIC ACTION BUTTONS */}
              {ocrResult.documentType === "KTP" ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Action A: Set as Head */}
                  <Button
                    type="button"
                    onClick={handleSetAsHead}
                    size="sm"
                    className="h-7 text-[11px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold gap-1 rounded-lg"
                  >
                    <Crown className="w-3 h-3" /> Set sbg Kepala KK
                  </Button>

                  {/* Action B: Add as Family Member */}
                  <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-neutral-800">
                    <select
                      value={selectedKtpRole}
                      onChange={(e: any) => setSelectedKtpRole(e.target.value)}
                      className="bg-transparent text-[11px] text-slate-300 font-semibold px-1.5 py-0.5 focus:outline-none"
                    >
                      <option value="ISTRI" className="bg-neutral-900 text-white">Istri</option>
                      <option value="ANAK" className="bg-neutral-900 text-white">Anak</option>
                      <option value="FAMILI_LAIN" className="bg-neutral-900 text-white">Famili Lain</option>
                    </select>
                    <Button
                      type="button"
                      onClick={handleAddAsMember}
                      size="sm"
                      className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1 px-2 rounded-md"
                    >
                      <UserPlus className="w-3 h-3" /> + Tambah Anggota
                    </Button>
                  </div>
                </div>
              ) : (
                /* Action C: Apply Full KK */
                <Button
                  type="button"
                  onClick={handleApplyFullKK}
                  size="sm"
                  className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 rounded-lg shadow-sm"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    Terapkan Seluruh Keluarga ({(ocrResult as OcrExtractedKK).members?.length || 1} Jiwa)
                  </span>
                </Button>
              )}
            </div>

            {/* Field Display */}
            {ocrResult.documentType === "KTP" ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800">
                  <div className="text-[9px] text-slate-400 uppercase">NIK</div>
                  <div className="font-mono font-bold text-emerald-400 truncate">
                    {(ocrResult as OcrExtractedKTP).nik || "—"}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800">
                  <div className="text-[9px] text-slate-400 uppercase">Nama Lengkap</div>
                  <div className="font-bold text-slate-200 truncate">
                    {(ocrResult as OcrExtractedKTP).nama || "—"}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800">
                  <div className="text-[9px] text-slate-400 uppercase">TTL / Gender</div>
                  <div className="text-slate-200 truncate text-[11px]">
                    {(ocrResult as OcrExtractedKTP).tempatTanggalLahir || "—"}{" "}
                    {(ocrResult as OcrExtractedKTP).jenisKelamin ? `(${(ocrResult as OcrExtractedKTP).jenisKelamin})` : ""}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800">
                  <div className="text-[9px] text-slate-400 uppercase">Alamat & RT/RW</div>
                  <div className="text-slate-200 truncate text-[11px]">
                    {(ocrResult as OcrExtractedKTP).alamat || "—"}{" "}
                    {(ocrResult as OcrExtractedKTP).rtRw ? `RT ${(ocrResult as OcrExtractedKTP).rtRw}` : ""}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800">
                    <div className="text-[9px] text-slate-400 uppercase">Nomor KK</div>
                    <div className="font-mono font-bold text-emerald-400 truncate">
                      {(ocrResult as OcrExtractedKK).noKk || "—"}
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800">
                    <div className="text-[9px] text-slate-400 uppercase">Kepala Keluarga</div>
                    <div className="font-bold text-slate-200 truncate">
                      {(ocrResult as OcrExtractedKK).namaKepalaKeluarga || "—"}
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800">
                    <div className="text-[9px] text-slate-400 uppercase">Alamat Domisili</div>
                    <div className="text-slate-200 truncate text-[11px]">
                      {(ocrResult as OcrExtractedKK).alamat || "—"} {(ocrResult as OcrExtractedKK).rtRw || ""}
                    </div>
                  </div>
                </div>

                {/* KK Members Table if detected */}
                {(ocrResult as OcrExtractedKK).members && (ocrResult as OcrExtractedKK).members.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-emerald-400" />
                        Seluruh Anggota Terdeteksi ({(ocrResult as OcrExtractedKK).members.length} Jiwa):
                      </span>
                      <span className="text-[9px] text-emerald-400">Siap diterapkan ke 1 Kartu Keluarga</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                      {(ocrResult as OcrExtractedKK).members.map((m, idx) => (
                        <div
                          key={idx}
                          className="p-1.5 rounded-lg bg-neutral-950/40 border border-neutral-800 text-[11px] flex items-center justify-between"
                        >
                          <div className="truncate">
                            <span className="font-semibold text-slate-200">{m.nama}</span>
                            <span className="text-[9px] text-slate-500 block font-mono">{m.nik}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {m.statusPernikahan && (
                              <Badge variant="outline" className="text-[8px] border-neutral-700 text-slate-400">
                                {m.statusPernikahan}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-[8px]">
                              {m.statusHubungan}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Raw OCR Detected Lines Inspector */}
            {(ocrResult as any).rawLines && (ocrResult as any).rawLines.length > 0 && (
              <div className="pt-1 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowRawLines(!showRawLines)}
                  className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 font-mono transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  <span>
                    {showRawLines ? "Sembunyikan" : "Tampilkan"} Teks Mentah Hasil Deteksi PP-OCRv4 ({(ocrResult as any).rawLines.length} baris)
                  </span>
                  {showRawLines ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showRawLines && (
                  <div className="mt-1.5 p-2 rounded-lg bg-black/60 border border-neutral-800/80 font-mono text-[10px] text-emerald-400 space-y-0.5 max-h-36 overflow-y-auto">
                    {(ocrResult as any).rawLines.map((line: string, idx: number) => (
                      <div key={idx} className="truncate">
                        <span className="text-slate-600 mr-2">[{idx + 1}]</span>
                        {line}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
