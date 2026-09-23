import { supabaseAdmin } from "@/lib/supabase-admin";
import { loadCommunityContext } from "@/lib/community/context";
import { notify } from "@/lib/notifications/server";

interface LetterRow {
  id: string;
  communityId: string;
  requestNumber?: string;
  issuedNumber?: string | null;
  applicantName: string;
  applicantNik: string;
  status: string;
  rejectionReason?: string | null;
  template?: { title?: string } | null;
}

const STATUS_TEXT: Record<string, { title: string; body: (r: LetterRow) => string }> = {
  WAITING_SIGNATURE: { title: "diverifikasi sekretaris", body: () => "Menunggu tanda tangan Ketua RT." },
  APPROVED: { title: "sudah terbit ✅", body: (r) => `Nomor surat ${r.issuedNumber ?? "-"}. Unduh / cetak dari menu Layanan Surat.` },
  REJECTED: { title: "ditolak", body: (r) => `Alasan: ${r.rejectionReason ?? "-"}. Silakan perbaiki & ajukan ulang.` },
};

// letter_requests has no user link; the applicant's account is found through their NIK.
async function applicantUserIds(r: LetterRow) {
  const { data: citizens } = await supabaseAdmin.from("citizens").select("id").eq("communityId", r.communityId).eq("nik", r.applicantNik);
  const ids = (citizens ?? []).map((c) => c.id);
  if (!ids.length) return [];
  const { data: users } = await supabaseAdmin.from("users").select("id").in("citizenId", ids);
  return (users ?? []).map((u) => u.id);
}

export async function onLetterRequested(r: LetterRow) {
  const letter = r.template?.title ?? "Surat pengantar";
  await notify({
    communityId: r.communityId, type: "SURAT_NEW_REQUEST", entity: { type: "LETTER_REQUEST", id: r.id },
    title: `📄 Permohonan baru: ${letter}`,
    body: `${r.applicantName} · ${r.requestNumber ?? ""} · ${r.status === "PENDING_REVIEW" ? "perlu verifikasi sekretaris" : "menunggu tanda tangan"}.`,
    link: "/surat",
    target: { roles: r.status === "PENDING_REVIEW" ? ["SEKRETARIS", "TENANT_ADMIN"] : ["KETUA", "TENANT_ADMIN"] },
    actorName: r.applicantName,
    dedupeKey: `letter-new:${r.id}`,
  });
}

export async function onLetterStatusChanged(r: LetterRow) {
  const text = STATUS_TEXT[r.status];
  if (!text) return;
  const letter = r.template?.title ?? "Surat pengantar";
  const [userIds, ctx] = await Promise.all([applicantUserIds(r), loadCommunityContext(r.communityId)]);
  if (userIds.length) {
    await notify({
      communityId: r.communityId, ctx, type: "SURAT_STATUS", entity: { type: "LETTER_REQUEST", id: r.id },
      title: `📄 ${letter} ${text.title}`,
      body: text.body(r),
      link: "/surat",
      target: { userIds },
      dedupeKey: `letter:${r.id}:${r.status}`,
    });
  }
  // Verified by the secretary -> the ketua has something to sign.
  if (r.status === "WAITING_SIGNATURE") {
    await notify({
      communityId: r.communityId, ctx, type: "SURAT_NEW_REQUEST", entity: { type: "LETTER_REQUEST", id: r.id },
      title: `✍️ Menunggu tanda tangan: ${letter}`,
      body: `${r.applicantName} · sudah diverifikasi sekretaris.`,
      link: "/surat",
      target: { roles: ["KETUA", "TENANT_ADMIN"] },
      dedupeKey: `letter-sign:${r.id}`,
    });
  }
}
