// Exercises the feed + notification platform through the app API and leaves realistic demo content.
// Usage (dev server running): node --env-file=.env.local scratch/seed-feed-platform.mjs [baseUrl]
import { createClient } from "@supabase/supabase-js";

const BASE = process.argv[2] ?? "http://localhost:4001";
const COMMUNITY_ID = "comm_1789889738300";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

async function api(path, method = "GET", body) {
  const res = await fetch(`${BASE}${path}`, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json();
  if (!res.ok) throw new Error(`${method} ${path}: ${json.error ?? JSON.stringify(json.errors)}`);
  return json;
}
const uid = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const { data: users } = await supabase.from("users").select("id, email, role, fullName, houseBlock").eq("communityId", COMMUNITY_ID);
const byEmail = (e) => users.find((u) => u.email === e);
const ketua = users.find((u) => u.role === "KETUA");
const humas = users.find((u) => u.role === "HUMAS");
const warga = byEmail("warga@demo.wargain.id");
const lina = byEmail("lina.hidayat.a04@demo.wargain.id");
const others = users.filter((u) => u.role === "ANGGOTA" && u.id !== warga.id && u.id !== lina.id).slice(0, 6);

// ---------- 1. User posts ----------
const ann = await api("/api/feed", "POST", {
  userId: ketua.id, type: "ANNOUNCEMENT", pinDays: 3,
  title: "Iuran keamanan & kebersihan Oktober",
  content: "Assalamualaikum warga Cluster Madrid. Iuran bulan Oktober sudah bisa dibayar lewat menu Kas & Iuran (QRIS/transfer). Terima kasih atas kerja samanya, lingkungan kita makin aman & bersih 🙏",
});
console.log("✓ pengumuman (disematkan):", ann.post.id);

const jual = await api("/api/feed", "POST", {
  userId: lina.id, type: "COMMERCE", title: "Nasi Uduk & Lontong Sayur Bu Lina",
  content: "Buka tiap Sabtu–Minggu jam 06.00–09.00 di depan rumah Blok A-04. Bisa pesan antar dalam cluster, gratis ongkir!",
  payload: { price: 12000, contactPhone: "081234567890" },
});
console.log("✓ jual beli:", jual.post.id);

const aduan = await api("/api/feed", "POST", {
  userId: warga.id, type: "REPORT", title: "Got depan Blok C mampet",
  content: "Setiap hujan air meluap ke jalan di depan C-01 s/d C-05. Mohon dibantu dibersihkan sebelum musim hujan.",
});
console.log("✓ aduan:", aduan.post.id);

const umum = await api("/api/feed", "POST", {
  userId: others[0].id, type: "GENERAL",
  content: "Terima kasih bapak-bapak yang kemarin ikut ronda, semalam aman terkendali. Semangat jaga lingkungan! 💪",
});
console.log("✓ post umum:", umum.post.id);

// ---------- 2. Likes & comments ----------
for (const u of others.slice(0, 5)) await api("/api/feed", "PATCH", { postId: ann.post.id, userId: u.id, action: "LIKE" });
for (const u of others.slice(1, 4)) await api("/api/feed", "PATCH", { postId: jual.post.id, userId: u.id, action: "LIKE" });
await api("/api/feed/comments", "POST", { postId: jual.post.id, userId: others[1].id, content: "Mantap Bu, pesan 3 porsi buat Minggu ya 🙏" });
await api("/api/feed/comments", "POST", { postId: jual.post.id, userId: lina.id, content: "Siap Pak, dicatat ya. Diantar jam 7 👍" });
await api("/api/feed/comments", "POST", { postId: aduan.post.id, userId: ketua.id, content: "Terima kasih laporannya Pak, Sabtu ini kita masukkan ke agenda kerja bakti." });
console.log("✓ like & komentar");

// ---------- 3. Keamanan hooks through the sync API ----------
const now = new Date().toISOString();
const lostId = uid("lf");
const watchId = uid("watch");
const gateId = uid("gate");
const panicId = uid("sos");
await api("/api/keamanan/sync", "POST", {
  communityId: COMMUNITY_ID,
  upserts: {
    lostFound: [{
      id: lostId, type: "HILANG", category: "ANAK", title: "Dimas (7 th), kaos merah celana jeans",
      description: "Terakhir main sepeda di taman Blok D sekitar jam 16.30. Rambut cepak, bawa sepeda BMX biru.",
      lastSeenLocation: "Taman Blok D", contactName: humas.fullName, contactPhone: "081234560004", houseBlock: humas.houseBlock, status: "AKTIF", createdAt: now,
    }],
    watchlist: [{
      id: watchId, kind: "KENDARAAN", label: "Avanza silver kaca gelap", plate: "B 1777 XX", level: "BAHAYA",
      description: "Mondar-mandir 3x di Jl. Madrid 2 jam 02.00, berhenti lama di depan rumah kosong B-06. Sudah dilaporkan ke Polsek Babelan.",
      lastSeenAt: now, lastSeenLocation: "Jl. Madrid 2", reportedBy: "Satpam Budi", active: true, createdAt: now,
    }],
    gateLogs: [{
      id: gateId, kind: "TAMU", name: "Sdr. Arman (kurir furnitur)", plate: "B 9921 KLM", destinationBlock: lina.houseBlock,
      purpose: "Antar lemari pesanan", inAt: now, status: "MENUNGGU_KONFIRMASI", officer: "Satpam Budi",
    }],
    alerts: [{
      id: panicId, senderName: warga.fullName, houseBlock: warga.houseBlock, phone: "081234567890", type: "MEDIS",
      note: "Ayah sesak napas", lat: -6.13702, lng: 107.01718, createdAt: now, status: "BARU",
    }],
  },
});
console.log("✓ keamanan: anak hilang, waspada BAHAYA, tamu di gerbang, panic");

// Petugas responds to the panic -> the sender's household gets notified.
await api("/api/keamanan/sync", "POST", {
  communityId: COMMUNITY_ID,
  upserts: { alerts: [{ id: panicId, senderName: warga.fullName, houseBlock: warga.houseBlock, phone: "081234567890", type: "MEDIS", note: "Ayah sesak napas", lat: -6.13702, lng: 107.01718, createdAt: now, status: "DIRESPON", responder: "Satpam Budi", respondedAt: new Date().toISOString() }] },
});
console.log("✓ panic direspon");

// ---------- 4. Verify ----------
const show = async (u, label) => {
  const n = await api(`/api/notifications?userId=${u.id}`);
  console.log(`\n🔔 ${label} — ${u.fullName} (${u.houseBlock}), ${n.unread} belum dibaca:`);
  n.notifications.slice(0, 7).forEach((x) => console.log(`   [${x.priority.padEnd(6)}] ${x.module.padEnd(8)} ${x.title}`));
};
await show(ketua, "Ketua RT");
await show(lina, "Warga A-04");
await show(warga, "Warga pelapor panic");

const feed = await api(`/api/feed?communityId=${COMMUNITY_ID}&userId=${warga.id}`);
console.log(`\n📰 Feed: ${feed.pinned.length} disematkan, ${feed.posts.length} post`);
[...feed.pinned.map((p) => ({ ...p, pin: true })), ...feed.posts].slice(0, 12).forEach((p) =>
  console.log(`   ${p.pin ? "📌" : "  "} ${p.module.padEnd(8)} ${p.type.padEnd(15)} ❤${p.likeCount} 💬${p.commentCount}  ${(p.title ?? p.content).slice(0, 55)}`)
);
