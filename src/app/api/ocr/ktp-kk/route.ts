import { NextRequest, NextResponse } from "next/server";

export interface OcrExtractedKTP {
  documentType: "KTP";
  nik: string;
  nama: string;
  tempatTanggalLahir: string;
  jenisKelamin: "L" | "P" | string;
  golDarah?: string;
  alamat: string;
  rtRw: string;
  kelDesa: string;
  kecamatan: string;
  agama: string;
  statusPerkawinan: string;
  pekerjaan: string;
  kewarganegaraan: string;
  confidence: number;
  engine: string;
  rawLines?: string[];
}

export interface OcrExtractedKKMember {
  nik: string;
  nama: string;
  jenisKelamin: "L" | "P" | string;
  tempatLahir: string;
  tanggalLahir: string;
  agama: string;
  pendidikan: string;
  jenisPekerjaan: string;
  statusPernikahan: string;
  statusHubungan: string;
}

export interface OcrExtractedKK {
  documentType: "KK";
  noKk: string;
  namaKepalaKeluarga: string;
  alamat: string;
  rtRw: string;
  kodePos?: string;
  kelurahanDesa: string;
  kecamatan: string;
  kabupatenKota: string;
  provinsi: string;
  members: OcrExtractedKKMember[];
  confidence: number;
  engine: string;
  rawLines?: string[];
}

export type OcrResult = OcrExtractedKTP | OcrExtractedKK;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let documentType: "ktp" | "kk" = "ktp";
    let base64Image = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      documentType = (formData.get("documentType") as "ktp" | "kk") || "ktp";

      if (!file) {
        return NextResponse.json({ error: "File dokumen KTP/KK wajib diunggah." }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      base64Image = buffer.toString("base64");
    } else {
      const body = await req.json();
      documentType = body.documentType || "ktp";
      base64Image = body.image || "";
    }

    if (!base64Image || base64Image.trim().length < 20) {
      return NextResponse.json(
        { error: "Foto dokumen KTP/KK wajib diunggah untuk dapat diproses oleh AI PaddleOCR." },
        { status: 400 }
      );
    }

    // Call PaddleOCR microservice (Docker / FastAPI)
    const paddleOcrUrl = process.env.PADDLE_OCR_SERVICE_URL || "http://localhost:8000/predict";

    try {
      const ocrResponse = await fetch(paddleOcrUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64Image,
          document_type: documentType,
        }),
        signal: AbortSignal.timeout(25000),
      });

      const remoteData = await ocrResponse.json();

      if (!ocrResponse.ok) {
        return NextResponse.json(
          { error: remoteData.detail || remoteData.error || "Gagal memproses gambar pada PaddleOCR." },
          { status: ocrResponse.status }
        );
      }

      return NextResponse.json({
        success: true,
        data: remoteData.data || remoteData,
        source: remoteData.source || "native_paddle_ocr_docker",
        latencyMs: remoteData.latency_ms,
        processedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("Error connecting to PaddleOCR microservice:", err.message);
      return NextResponse.json(
        {
          error: `Service PaddleOCR Docker belum dapat dihubungi (${err.message}). Pastikan container wargain_paddle_ocr berjalan di port 8000.`,
        },
        { status: 502 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan pada OCR handler." },
      { status: 500 }
    );
  }
}
