// Demo Pasar Warga for Cluster Madrid through the app API, plus end-to-end checks
// (order → proof → verify → complete → review, booking, double booking, overselling).
// Usage (dev server running): node --env-file=.env.local scratch/seed-pasar.mjs [baseUrl]
import { createClient } from "@supabase/supabase-js";

const BASE = process.argv[2] ?? "http://localhost:4001";
const COMMUNITY_ID = "comm_1789889738300";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

async function api(path, method = "GET", body, expectFail = false) {
  const res = await fetch(`${BASE}${path}`, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (expectFail) return { status: res.status, ...json };
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${json.error}`);
  return json;
}
const check = (label, ok, extra = "") => console.log(`${ok ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);

const { data: users } = await supabase.from("users").select("id, email, fullName, role, houseBlock").eq("communityId", COMMUNITY_ID);
const byEmail = (e) => users.find((u) => u.email === e);
const anggota = users.filter((u) => u.role === "ANGGOTA" && u.email.endsWith("@demo.wargain.id") && u.email !== "warga@demo.wargain.id");
const lina = byEmail("lina.hidayat.a04@demo.wargain.id");
const bendahara = users.find((u) => u.role === "BENDAHARA");
const humas = users.find((u) => u.role === "HUMAS");
const [laundryOwner, lesOwner] = anggota.filter((u) => u.id !== lina.id).slice(10, 12);
const buyer = byEmail("warga@demo.wargain.id");
const buyer2 = anggota[3];

// Fresh start for the demo shops (cascade removes products & orders).
await supabase.from("shops").delete().eq("communityId", COMMUNITY_ID);
await supabase.from("feed_posts").delete().eq("communityId", COMMUNITY_ID).eq("module", "PASAR");

const payTransfer = (name) => ({ cash: true, transfer: { bank: "BCA", accountNo: "1234567890", accountName: name }, qris: null });
const weekdays = (start, end, days = [1, 2, 3, 4, 5, 6]) => days.map((day) => ({ day, start, end }));
const shops = [
  {
    owner: lina, shop: { name: "Dapur Bu Lina", category: "KULINER", tagline: "Masakan rumahan, bumbu turun-temurun", description: "Sarapan & makan siang rumahan. Pesan sebelum jam 9 untuk makan siang.", weeklyHours: weekdays("06:00", "14:00", [0, 1, 2, 3, 4, 5, 6]), deliveryEnabled: true, deliveryFee: 0, pickupEnabled: true, minOrder: 10000, paymentMethods: payTransfer(lina.fullName) },
    products: [
      { name: "Nasi Uduk Komplit", price: 15000, unit: "porsi", trackStock: true, stock: 20, description: "Nasi uduk, ayam goreng, telur balado, orek tempe, kerupuk, sambal kacang.", variants: [{ name: "Ayam paha", priceDelta: 0 }, { name: "Ayam dada", priceDelta: 2000 }] },
      { name: "Lontong Sayur Betawi", price: 13000, comparePrice: 15000, unit: "porsi", trackStock: true, stock: 12, description: "Lontong, sayur labu siam, tahu, telur, kerupuk merah." },
      { name: "Ayam Bakar Madu (1 ekor)", price: 85000, unit: "ekor", trackStock: false, preorderDays: 1, description: "Pre-order H-1. Termasuk sambal & lalapan untuk 4 orang." },
    ],
  },
  {
    owner: bendahara, shop: { name: "Kue & Camilan Neng", category: "KUE", tagline: "Kue basah & hampers", description: "Terima pesanan arisan, pengajian, dan ulang tahun.", weeklyHours: weekdays("08:00", "18:00"), deliveryEnabled: true, deliveryFee: 3000, paymentMethods: { cash: true, transfer: null, qris: null } },
    products: [
      { name: "Bolu Pandan Keju", price: 45000, unit: "loyang", trackStock: true, stock: 3, lowStockAt: 3, description: "Diameter 22 cm, keju cheddar melimpah." },
      { name: "Kue Lapis Legit", price: 180000, unit: "loyang", trackStock: false, preorderDays: 2, description: "Pre-order H-2, ukuran 20x20 cm." },
      { name: "Risoles Mayo (isi 10)", price: 30000, unit: "box", trackStock: true, stock: 8, description: "Isi smoked beef, telur, mayo." },
    ],
  },
  {
    owner: humas, shop: { name: "Servis AC Pak Dadang", category: "JASA_SERVIS", tagline: "Teknisi AC bersertifikat, bergaransi 30 hari", description: "Cuci, isi freon, bongkar pasang AC. Datang ke rumah warga cluster.", weeklyHours: weekdays("08:00", "17:00"), paymentMethods: payTransfer(humas.fullName) },
    products: [
      { type: "JASA", name: "Cuci AC Split 0.5–1 PK", price: 75000, unit: "unit", durationMin: 60, slotCapacity: 1, serviceLocation: "KE_RUMAH", description: "Cuci indoor & outdoor, cek tekanan freon, garansi 30 hari." },
      { type: "JASA", name: "Isi Freon R32", price: 250000, unit: "unit", durationMin: 90, slotCapacity: 1, serviceLocation: "KE_RUMAH", description: "Termasuk cek kebocoran." },
    ],
  },
  {
    owner: laundryOwner, shop: { name: "Laundry Kilat Madrid", category: "LAUNDRY", tagline: "Antar-jemput gratis dalam cluster", description: "Cuci setrika wangi, selesai 2 hari. Express 1 hari tersedia.", weeklyHours: weekdays("07:00", "20:00", [0, 1, 2, 3, 4, 5, 6]), deliveryEnabled: true, deliveryFee: 0, paymentMethods: { cash: true, transfer: null, qris: null } },
    products: [
      { name: "Cuci Setrika Reguler", price: 8000, unit: "kg", trackStock: false, description: "Minimal 3 kg, selesai 2 hari." },
      { name: "Cuci Setrika Express", price: 12000, unit: "kg", trackStock: false, description: "Selesai 1 hari." },
      { name: "Cuci Bed Cover", price: 35000, unit: "pcs", trackStock: false },
    ],
  },
  {
    owner: lesOwner, shop: { name: "Les Privat Matematika", category: "LES", tagline: "SD–SMP, kelas kecil maksimal 3 anak", description: "Belajar di rumah Blok kami, suasana santai. Pengajar lulusan pendidikan matematika.", weeklyHours: weekdays("15:00", "20:00", [1, 2, 3, 4, 5]), paymentMethods: payTransfer(lesOwner.fullName) },
    products: [{ type: "JASA", name: "Les Matematika (90 menit)", price: 50000, unit: "sesi", durationMin: 90, slotCapacity: 3, serviceLocation: "DI_TEMPAT", description: "Per anak per sesi. Bawa buku paket sekolah." }],
  },
];

const created = {};
for (const s of shops) {
  const { shop } = await api("/api/pasar/shops", "POST", { userId: s.owner.id, shop: s.shop });
  created[shop.name] = { shop, owner: s.owner, products: [] };
  for (const p of s.products) {
    const { product } = await api("/api/pasar/products", "POST", { userId: s.owner.id, product: p, publishToFeed: true });
    created[shop.name].products.push(product);
  }
  console.log(`✓ lapak ${shop.name} (${s.owner.fullName}, ${shop.houseBlock}) · ${s.products.length} produk`);
}

console.log("\n— Uji alur pesanan —");
const dapur = created["Dapur Bu Lina"];
const nasi = dapur.products[0];
const order = (await api("/api/pasar/orders", "POST", { userId: buyer.id, shopId: dapur.shop.id, items: [{ productId: nasi.id, qty: 2, variant: "Ayam dada" }, { productId: dapur.products[1].id, qty: 1 }], fulfillment: "ANTAR", paymentMethod: "TRANSFER", notes: "Sambal dipisah ya Bu" })).order;
check("pesanan dibuat", !!order.id, `${order.orderNumber} · total Rp${order.total} (harga dihitung server: 2×17.000 + 13.000)`);
const { data: nasiAfter } = await supabase.from("shop_products").select("stock").eq("id", nasi.id).single();
check("stok berkurang atomik", nasiAfter.stock === 18, `stok nasi uduk 20 → ${nasiAfter.stock}`);
const tinyPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
await api("/api/pasar/orders", "PATCH", { userId: dapur.owner.id, orderId: order.id, action: "CONFIRM" });
await api("/api/pasar/orders", "PATCH", { userId: buyer.id, orderId: order.id, action: "UPLOAD_PROOF", proofUrl: tinyPng });
await api("/api/pasar/orders", "PATCH", { userId: dapur.owner.id, orderId: order.id, action: "VERIFY_PAYMENT" });
await api("/api/pasar/orders", "PATCH", { userId: dapur.owner.id, orderId: order.id, action: "DELIVER" });
await api("/api/pasar/orders", "PATCH", { userId: buyer.id, orderId: order.id, action: "COMPLETE" });
const reviewed = (await api("/api/pasar/orders", "PATCH", { userId: buyer.id, orderId: order.id, action: "REVIEW", rating: 5, review: "Enak banget, masih hangat pas sampai. Porsi pas!" })).order;
check("alur lengkap", reviewed.status === "SELESAI" && reviewed.paymentStatus === "LUNAS" && reviewed.rating === 5, `status ${reviewed.status} · bayar ${reviewed.paymentStatus} · ⭐${reviewed.rating}`);
const illegal = await api("/api/pasar/orders", "PATCH", { userId: buyer.id, orderId: order.id, action: "VERIFY_PAYMENT" }, true);
check("pembeli tidak bisa verifikasi pembayaran sendiri", illegal.status === 403, `HTTP ${illegal.status}`);

console.log("\n— Uji stok —");
const kue = created["Kue & Camilan Neng"];
const bolu = kue.products[0];
const oversell = await api("/api/pasar/orders", "POST", { userId: buyer.id, shopId: kue.shop.id, items: [{ productId: bolu.id, qty: 5 }], fulfillment: "AMBIL", paymentMethod: "TUNAI" }, true);
check("pesan melebihi stok ditolak", oversell.status === 409, oversell.error);
const two = (await api("/api/pasar/orders", "POST", { userId: buyer2.id, shopId: kue.shop.id, items: [{ productId: bolu.id, qty: 2 }], fulfillment: "AMBIL", paymentMethod: "TUNAI" })).order;
await api("/api/pasar/orders", "PATCH", { userId: buyer2.id, orderId: two.id, action: "CANCEL", note: "Salah pilih" });
const { data: boluAfter } = await supabase.from("shop_products").select("stock").eq("id", bolu.id).single();
check("stok kembali setelah dibatalkan", boluAfter.stock === 3, `bolu 3 → 1 → ${boluAfter.stock}`);
const po = await api("/api/pasar/orders", "POST", { userId: buyer.id, shopId: kue.shop.id, items: [{ productId: kue.products[1].id, qty: 1 }], fulfillment: "ANTAR", paymentMethod: "TUNAI" }, true);
check("pre-order tanpa tanggal ditolak", po.status === 400, po.error);
// keep one active order for the kue shop's dashboard
await api("/api/pasar/orders", "POST", { userId: buyer2.id, shopId: kue.shop.id, items: [{ productId: kue.products[2].id, qty: 2 }], fulfillment: "ANTAR", paymentMethod: "TUNAI", notes: "Untuk arisan Sabtu" });

console.log("\n— Uji booking jasa —");
const ac = created["Servis AC Pak Dadang"];
const cuci = ac.products[0];
const tomorrow = new Date(Date.now() + 86_400_000).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
const { days } = await api(`/api/pasar/slots?productId=${cuci.id}&from=${tomorrow}&days=7`);
const day = days.find((d) => d.available > 0);
const slot = day.slots.find((s) => !s.reason);
const booking = (await api("/api/pasar/orders", "POST", { userId: buyer.id, shopId: ac.shop.id, items: [{ productId: cuci.id, qty: 1 }], fulfillment: "KE_RUMAH", paymentMethod: "TRANSFER", scheduledAt: slot.start, notes: "AC kamar depan, 1 PK" })).order;
check("booking dibuat", booking.type === "JASA", `${day.date} ${slot.label} · ${booking.fulfillment}`);
const clash = await api("/api/pasar/orders", "POST", { userId: buyer2.id, shopId: ac.shop.id, items: [{ productId: cuci.id, qty: 1 }], fulfillment: "KE_RUMAH", paymentMethod: "TUNAI", scheduledAt: slot.start }, true);
check("slot yang sama ditolak (kapasitas 1)", clash.status === 409, clash.error);
await api("/api/pasar/orders", "PATCH", { userId: ac.owner.id, orderId: booking.id, action: "CONFIRM" });
const { days: after } = await api(`/api/pasar/slots?productId=${cuci.id}&from=${day.date}&days=1`);
check("slot jadi penuh di kalender", after[0].slots.find((s) => s.start === slot.start)?.reason === "PENUH");

const les = created["Les Privat Matematika"];
const { days: lesDays } = await api(`/api/pasar/slots?productId=${les.products[0].id}&from=${tomorrow}&days=7`);
const lesSlot = lesDays.find((d) => d.available > 0).slots.find((s) => !s.reason);
for (const u of [buyer, buyer2, anggota[5]]) {
  await api("/api/pasar/orders", "POST", { userId: u.id, shopId: les.shop.id, items: [{ productId: les.products[0].id, qty: 1 }], fulfillment: "DI_TEMPAT", paymentMethod: "TUNAI", scheduledAt: lesSlot.start });
}
const fourth = await api("/api/pasar/orders", "POST", { userId: anggota[6].id, shopId: les.shop.id, items: [{ productId: les.products[0].id, qty: 1 }], fulfillment: "DI_TEMPAT", paymentMethod: "TUNAI", scheduledAt: lesSlot.start }, true);
check("kelas les kapasitas 3: anak ke-4 ditolak", fourth.status === 409, fourth.error);

console.log("\n— Notifikasi & dashboard —");
for (const [who, u] of [["Penjual Dapur", dapur.owner], ["Pembeli", buyer]]) {
  const n = await api(`/api/notifications?userId=${u.id}`);
  const pasar = n.notifications.filter((x) => x.module === "PASAR").slice(0, 5);
  console.log(`🔔 ${who} (${u.fullName}):`);
  pasar.forEach((x) => console.log(`   [${x.priority}] ${x.title}`));
}
const dash = await api(`/api/pasar/dashboard?userId=${kue.owner.id}`);
console.log(`📊 Dashboard ${kue.shop.name}: menunggu konfirmasi ${dash.todo.toConfirm}, stok menipis ${dash.lowStock.map((p) => `${p.name} (${p.stock})`).join(", ")}`);
const feed = await api(`/api/feed?communityId=${COMMUNITY_ID}&userId=${buyer.id}&filter=COMMERCE`);
console.log(`📰 Feed "Jual Beli": ${feed.posts.length} post dari Pasar Warga`);
