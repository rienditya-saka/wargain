import { loadCommunityContext } from "@/lib/community/context";
import { notify } from "@/lib/notifications/server";
import { publishFeedPost } from "@/lib/feed/server";

const rupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

interface BillRow {
  id: string;
  communityId: string;
  masterBillingId?: string | null;
  title: string;
  periodKey: string;
  periodLabel: string;
  houseId: string;
  houseBlock: string;
  totalAmount: number;
  billNumber: string;
}

// New bills: each house gets its own notification, the community gets one summary post per period.
export async function onBillsGenerated(communityId: string, bills: BillRow[]) {
  if (!bills.length) return;
  try {
    const ctx = await loadCommunityContext(communityId);
    for (const b of bills) {
      await notify({
        communityId, ctx, type: "KAS_BILL_ISSUED", entity: { type: "BILL", id: b.id },
        title: `🧾 Tagihan ${b.title} ${b.periodLabel}`,
        body: `${b.houseBlock} · ${rupiah(b.totalAmount)} · No. ${b.billNumber}. Bayar lewat menu Kas & Iuran.`,
        link: "/kas",
        target: { houseKeys: [`id:${b.houseId}`] },
        dedupeKey: `bill:${b.id}`,
      });
    }

    const groups = new Map<string, BillRow[]>();
    bills.forEach((b) => {
      const k = `${b.masterBillingId ?? b.title}:${b.periodKey}`;
      groups.set(k, [...(groups.get(k) ?? []), b]);
    });
    for (const [key, list] of groups) {
      const first = list[0];
      const total = list.reduce((n, b) => n + b.totalAmount, 0);
      await publishFeedPost({
        communityId, module: "KAS", type: "KAS_INFO", entity: { type: "BILL_PERIOD", id: key },
        title: `💰 ${first.title} periode ${first.periodLabel} telah terbit`,
        content: `Tagihan untuk ${list.length} rumah sudah terbit. Cek & bayar tagihan rumah Anda di menu Kas & Iuran.`,
        payload: { houses: list.length, totalAmount: total, periodLabel: first.periodLabel, title: first.title },
        author: { name: "Bendahara RT", role: "BENDAHARA" },
      });
    }
  } catch (err) {
    console.error("onBillsGenerated:", err);
  }
}

export async function onBillPaid(bill: BillRow & { paidAmount?: number; paymentMethod?: string | null }) {
  await notify({
    communityId: bill.communityId, type: "KAS_BILL_PAID", entity: { type: "BILL", id: bill.id },
    title: `✅ Pembayaran ${bill.title} ${bill.periodLabel} diterima`,
    body: `${bill.houseBlock} · ${rupiah(bill.paidAmount ?? bill.totalAmount)}${bill.paymentMethod ? ` via ${bill.paymentMethod.replace(/_/g, " ").toLowerCase()}` : ""}. Terima kasih!`,
    link: "/kas",
    target: { houseKeys: [`id:${bill.houseId}`] },
    dedupeKey: `bill-paid:${bill.id}`,
  });
}

export async function onFineIssued(communityId: string, fine: { id: string; memberName: string; shiftDate: string; amount: number; billNumber?: string | null }, houseId: string) {
  await notify({
    communityId, type: "KAS_FINE", entity: { type: "RONDA_FINE", id: fine.id },
    title: `⚠️ Denda tidak ronda: ${rupiah(fine.amount)}`,
    body: `${fine.memberName} tercatat alpa ronda tanggal ${fine.shiftDate}. Tagihan ${fine.billNumber ?? ""} sudah masuk menu Kas & Iuran.`,
    link: "/kas",
    target: { houseKeys: [`id:${houseId}`] },
    dedupeKey: `fine:${fine.id}`,
  });
}
