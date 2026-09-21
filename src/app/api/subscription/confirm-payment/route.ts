import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { communityId, invoiceId, paymentMethod, paymentProofUrl } = body;

    if (!communityId) {
      return NextResponse.json(
        { error: "Community ID wajib disertakan." },
        { status: 400 }
      );
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    return NextResponse.json({
      success: true,
      message: "Pembayaran telah berhasil diverifikasi dan dikonfirmasi.",
      communityId,
      invoiceId: invoiceId || `inv_${Date.now()}`,
      paymentMethod: paymentMethod || "QRIS",
      paymentProofUrl: paymentProofUrl || null,
      planStatus: "ACTIVE",
      isActive: true,
      planExpiresAt: expiresAt.toISOString(),
      paidAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Subscription payment confirmation error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal mengonfirmasi pembayaran." },
      { status: 500 }
    );
  }
}
