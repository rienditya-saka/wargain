import { NextResponse } from "next/server";
import { extractPlates } from "@/lib/keamanan/plate";

// ANPR: reads a plate photo through the PaddleOCR microservice ("plate" mode returns raw lines).
export async function POST(req: Request) {
  try {
    const { image } = await req.json();
    if (!image || typeof image !== "string" || image.length < 20) {
      return NextResponse.json({ error: "Foto plat nomor wajib dikirim." }, { status: 400 });
    }

    const paddleOcrUrl = process.env.PADDLE_OCR_SERVICE_URL || "http://localhost:8000/predict";
    let res: Response;
    try {
      res = await fetch(paddleOcrUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, document_type: "plate" }),
        signal: AbortSignal.timeout(20000),
      });
    } catch (err: any) {
      return NextResponse.json(
        { error: "Service OCR tidak dapat dihubungi. Jalankan container paddle-ocr atau input plat manual." },
        { status: 503 }
      );
    }

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: payload.detail || "OCR gagal membaca gambar." }, { status: res.status });
    }

    const lines: string[] = payload?.data?.rawLines ?? [];
    const candidates = extractPlates(lines);
    return NextResponse.json({
      success: true,
      plate: candidates[0] ?? null,
      candidates,
      rawLines: lines,
      confidence: payload?.data?.confidence ?? null,
    });
  } catch (err: any) {
    console.error("API /api/keamanan/anpr POST error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
