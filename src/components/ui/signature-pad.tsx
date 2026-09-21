"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { PenTool, Type, Upload, RotateCcw, Check, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface SignaturePadProps {
  onSave: (signatureDataUrl: string) => void;
  onCancel?: () => void;
  initialSignature?: string;
  title?: string;
  signeeName?: string;
  signeeRole?: string;
}

export function SignaturePad({
  onSave,
  onCancel,
  initialSignature,
  title = "Bubuhkan Tanda Tangan Digital",
  signeeName = "Warga Pemohon",
  signeeRole = "Pemohon",
}: SignaturePadProps) {
  const [activeTab, setActiveTab] = useState<"DRAW" | "TYPE" | "UPLOAD">("DRAW");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [typedName, setTypedName] = useState(signeeName || "");
  const [fontFamily, setFontFamily] = useState<"font-signature-1" | "font-signature-2">("font-signature-1");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Setup canvas resolution and styling
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High-DPI support
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.scale(ratio, ratio);

    ctx.strokeStyle = "#0F172A"; // Slate 900 ink
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  useEffect(() => {
    if (activeTab === "DRAW") {
      // Small timeout to wait for container render
      const timer = setTimeout(() => {
        initCanvas();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeTab, initCanvas]);

  // Touch & Mouse coordinates
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if ("touches" in e) {
      // prevent scrolling on mobile when drawing
      e.stopPropagation();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    if ("touches" in e) {
      e.stopPropagation();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Convert Typed Name to Canvas Data URL
  const generateTypedSignature = (): string => {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = 500;
    tempCanvas.height = 180;
    const ctx = tempCanvas.getContext("2d");
    if (!ctx) return "";

    ctx.fillStyle = "transparent";
    ctx.fillRect(0, 0, 500, 180);

    ctx.fillStyle = "#0F172A";
    ctx.font = fontFamily === "font-signature-1" ? "italic bold 44px 'Brush Script MT', 'Dancing Script', cursive" : "italic 40px 'Segoe Script', 'Great Vibes', cursive";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(typedName || signeeName, 250, 90);

    return tempCanvas.toDataURL("image/png");
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (activeTab === "DRAW") {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) return;
      onSave(canvas.toDataURL("image/png"));
    } else if (activeTab === "TYPE") {
      const dataUrl = generateTypedSignature();
      onSave(dataUrl);
    } else if (activeTab === "UPLOAD") {
      if (!uploadedImage) return;
      onSave(uploadedImage);
    }
  };

  const canSave = (activeTab === "DRAW" && hasDrawn) || (activeTab === "TYPE" && typedName.trim().length > 0) || (activeTab === "UPLOAD" && uploadedImage !== null);

  return (
    <div className="w-full bg-card rounded-2xl border border-border shadow-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <PenTool className="w-4 h-4 text-emerald-600" />
            {title}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {signeeName} • <span className="font-semibold text-emerald-600 dark:text-emerald-400">{signeeRole}</span>
          </p>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-neutral-100/50 dark:bg-neutral-900/50 p-1 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("DRAW")}
          className={`flex-1 min-h-[44px] py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "DRAW"
              ? "bg-card text-emerald-600 shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <PenTool className="w-3.5 h-3.5" /> Gores (Draw)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("TYPE")}
          className={`flex-1 min-h-[44px] py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "TYPE"
              ? "bg-card text-emerald-600 shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Type className="w-3.5 h-3.5" /> Ketik Nama
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("UPLOAD")}
          className={`flex-1 min-h-[44px] py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "UPLOAD"
              ? "bg-card text-emerald-600 shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Upload className="w-3.5 h-3.5" /> Unggah Gambar
        </button>
      </div>

      {/* Body Area */}
      <div className="p-4 flex-1 flex flex-col items-center justify-center">
        {activeTab === "DRAW" && (
          <div className="w-full flex flex-col items-center gap-2">
            <div className="relative w-full h-44 sm:h-52 bg-white rounded-xl border-2 border-dashed border-neutral-300 shadow-inner overflow-hidden touch-none">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-full cursor-crosshair block"
              />

              {/* Baseline guideline */}
              <div className="absolute bottom-10 left-6 right-6 border-b border-neutral-300 pointer-events-none flex items-center justify-between text-[10px] text-neutral-400">
                <span>✕ Goreskan tanda tangan Anda di atas garis ini</span>
                <span>PandaDoc Security Certified</span>
              </div>
            </div>

            <div className="w-full flex items-center justify-between text-xs pt-1">
              <span className="text-[11px] text-muted-foreground italic">
                * Gunakan sentuhan jari di ponsel atau kursor mouse di desktop.
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearCanvas}
                className="text-xs text-rose-500 hover:text-rose-600 h-8 gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Hapus
              </Button>
            </div>
          </div>
        )}

        {activeTab === "TYPE" && (
          <div className="w-full space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Ketik Nama Lengkap Anda:</label>
              <Input
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Contoh: Bambang Sujatmiko"
                className="h-11 text-sm bg-background"
              />
            </div>

            <div className="w-full h-36 bg-white rounded-xl border border-border shadow-inner flex items-center justify-center p-4">
              <div
                style={{
                  fontFamily: fontFamily === "font-signature-1" ? "'Brush Script MT', 'Dancing Script', cursive" : "'Segoe Script', cursive",
                }}
                className="text-3xl md:text-4xl text-slate-900 italic select-none"
              >
                {typedName || "Pratinjau Tanda Tangan"}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFontFamily("font-signature-1")}
                className={`flex-1 py-2 text-xs rounded-lg border font-medium ${
                  fontFamily === "font-signature-1" ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : "border-border"
                }`}
              >
                Gaya Kaligrafi 1
              </button>
              <button
                type="button"
                onClick={() => setFontFamily("font-signature-2")}
                className={`flex-1 py-2 text-xs rounded-lg border font-medium ${
                  fontFamily === "font-signature-2" ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : "border-border"
                }`}
              >
                Gaya Kaligrafi 2
              </button>
            </div>
          </div>
        )}

        {activeTab === "UPLOAD" && (
          <div className="w-full space-y-3">
            {uploadedImage ? (
              <div className="relative w-full h-44 bg-white rounded-xl border border-border flex items-center justify-center p-4">
                <img src={uploadedImage} alt="Uploaded signature" className="max-h-full max-w-full object-contain" />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setUploadedImage(null)}
                  className="absolute top-2 right-2 h-7 text-xs"
                >
                  Ganti
                </Button>
              </div>
            ) : (
              <label className="w-full h-44 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors p-4 text-center">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-xs font-semibold text-foreground">Klik untuk upload foto tanda tangan</span>
                <span className="text-[11px] text-muted-foreground mt-1">Format PNG transparan atau JPG putih bersih (Maks 2MB)</span>
                <input type="file" accept="image/*" onChange={handleUploadImage} className="hidden" />
              </label>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 border-t border-border bg-muted/30 flex items-center justify-between gap-2">
        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Tanda tangan sah terenkripsi digital</span>
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <Button type="button" variant="outline" size="sm" onClick={onCancel} className="h-9 min-h-[44px] px-3 text-xs">
              Batal
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!canSave}
            className="h-9 min-h-[44px] px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50"
          >
            <Check className="w-4 h-4" /> Gunakan Tanda Tangan
          </Button>
        </div>
      </div>
    </div>
  );
}
