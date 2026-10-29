// Demo Balai Warga for Cluster Madrid through the app API, plus end-to-end checks
// (polling per rumah, musyawarah + absen QR + notulen, galang dana → Kas, pinjam inventaris bentrok).
// Usage (dev server running): node --env-file=.env.local scratch/seed-balai.mjs [baseUrl]
import { createClient } from "@supabase/supabase-js";

const BASE = process.argv[2] ?? "http://localhost:4001";
const COMMUNITY_ID = "comm_1789889738300";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

async function call(action, userId, body = {}, expectFail = false) {
  const res = await fetch(`${BASE}/api/balai`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, action, ...body }) });
  const json = await res.json().catch(() => ({}));
  if (expectFail) return { status: res.status, ...json };
  if (!res.ok) throw new Error(`${action} → ${res.status}: ${json.error}`);
  return json;
}
async function get(userId, params) {
  const res = await fetch(`${BASE}/api/balai?${new URLSearchParams({ userId, ...params })}`);
  const json = await res.json();
  if (!res.ok) throw new Error(`GET ${params.view} → ${res.status}: ${json.error}`);
  return json;
}
const check = (label, ok, extra = "") => console.log(`${ok ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`);
const iso = (ms) => new Date(Date.now() + ms).toISOString();
const H = 3_600_000;
const D = 24 * H;
const wibDate = (offsetDays) => new Date(Date.now() + offsetDays * D).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

const { data: users } = await supabase.from("users").select("id, email, fullName, role, houseBlock, citizenId").eq("communityId", COMMUNITY_ID);
const ketua = users.find((u) => u.role === "KETUA");
const sekretaris = users.find((u) => u.role === "SEKRETARIS");
const bendahara = users.find((u) => u.role === "BENDAHARA");
const humas = users.find((u) => u.role === "HUMAS");
const warga = users.filter((u) => u.role === "ANGGOTA" && u.citizenId);
const demo = users.find((u) => u.email === "warga@demo.wargain.id") ?? warga[0];

// Fresh start
const { data: oldFunds } = await supabase.from("fundraisers").select("id").eq("communityId", COMMUNITY_ID);
if (oldFunds?.length) await supabase.from("financial_records").delete().eq("communityId", COMMUNITY_ID).like("notes", "%galang dana fund_%");
await supabase.from("financial_records").delete().eq("communityId", COMMUNITY_ID).like("title", "Sewa inventaris:%");
for (const t of ["polls", "meetings", "fundraisers", "inventory_items", "directory_contacts"]) await supabase.from(t).delete().eq("communityId", COMMUNITY_ID);
await supabase.from("feed_posts").delete().eq("communityId", COMMUNITY_ID).eq("module", "BALAI");
await supabase.from("notifications").delete().eq("communityId", COMMUNITY_ID).like("type", "BALAI_%");

// ───── Kontak penting ─────
const contacts = [
  ["DARURAT", "Polisi", "110", null, "Panggilan darurat nasional"],
  ["DARURAT", "Pemadam Kebakaran Bekasi", "113", null, "Damkar"],
  ["DARURAT", "Ambulans / Gawat Darurat", "119", null, "SPGDT Kemenkes"],
  ["DARURAT", "Pos Satpam Cluster Madrid", "0812-9000-1101", "Gerbang utama Cluster Madrid", "Jaga 24 jam"],
  ["KESEHATAN", "Puskesmas Babelan I", "021-8910-0031", "Jl. Raya Babelan", "Senin–Sabtu 07.30–14.00"],
  ["KESEHATAN", "RS Mitra Keluarga Bekasi Timur", "021-8899-9222", "Jl. HM Joyomartono", "IGD 24 jam"],
  ["KESEHATAN", "Bidan Sri (Posyandu Melati)", "0813-1100-2201", "Blok B3", "Konsultasi ibu & balita"],
  ["PEMERINTAHAN", "Kantor Desa Kedung Pengawas", "021-8910-2100", "Babelan, Kab. Bekasi", "Urusan KTP/KK, surat pengantar"],
  ["PEMERINTAHAN", "Polsek Babelan", "021-8910-0110", "Jl. Raya Babelan", null],
  ["UTILITAS", "PLN (Contact Center)", "123", null, "Gangguan listrik"],
  ["UTILITAS", "PDAM Tirta Bhagasasi", "021-8834-0035", null, "Gangguan air"],
  ["UTILITAS", "Pengelola / Estate MGC", "021-2956-5000", "Marketing Gallery MGC", "Keluhan fasilitas umum"],
  ["LAYANAN", "Sedot WC Pak Udin", "0857-1100-3301", null, "Langganan warga, respon cepat"],
  ["LAYANAN", "Tukang Sampah (Pak Karta)", "0858-2200-4401", null, "Angkut Selasa, Kamis, Sabtu"],
];
for (const [i, [category, name, phone, address, notes]] of contacts.entries()) await call("CONTACT_SAVE", sekretaris.id, { category, name, phone, address, notes, sortOrder: i + 1 });
check("Kontak penting", true, `${contacts.length} kontak`);

// ───── Inventaris ─────
const items = [
  { name: "Tenda Sarnafil 4x6 m", category: "TENDA", quantity: 3, unit: "unit", feePerDay: 50000, maxDays: 3, description: "Lengkap dengan tiang & terpal samping. Disimpan di gudang pos RT." },
  { name: "Kursi Lipat Chitose", category: "KURSI_MEJA", quantity: 100, unit: "kursi", feePerDay: 0, maxDays: 3, description: "Gratis untuk warga, mohon dikembalikan bersih." },
  { name: "Meja Lipat Panjang", category: "KURSI_MEJA", quantity: 10, unit: "meja", feePerDay: 0, maxDays: 3 },
  { name: "Sound System + 2 Mic Wireless", category: "SOUND", quantity: 1, unit: "set", feePerDay: 75000, maxDays: 2, description: "Speaker aktif 15\", mixer, 2 mic wireless. Wajib didampingi Humas." },
  { name: "Proyektor + Layar", category: "SOUND", quantity: 1, unit: "set", feePerDay: 25000, maxDays: 2 },
  { name: "Genset 5.000 W", category: "ALAT_KERJA", quantity: 1, unit: "unit", feePerDay: 100000, maxDays: 2, description: "Bensin ditanggung peminjam." },
  { name: "Paket Kerja Bakti (cangkul, sapu lidi, garu)", category: "ALAT_KERJA", quantity: 5, unit: "paket", feePerDay: 0, maxDays: 2 },
  { name: "Tangga Lipat Aluminium 4 m", category: "ALAT_KERJA", quantity: 2, unit: "unit", feePerDay: 0, maxDays: 2 },
  { name: "Dandang & Kompor Besar", category: "DAPUR", quantity: 2, unit: "set", feePerDay: 20000, maxDays: 3, description: "Untuk hajatan / masak besar." },
  { name: "Keranda & Perlengkapan Jenazah", category: "LAINNYA", quantity: 1, unit: "set", feePerDay: 0, maxDays: 2, description: "Hubungi Ketua RT kapan saja." },
];
const savedItems = [];
for (const it of items) savedItems.push((await call("ITEM_SAVE", sekretaris.id, it)).item);
check("Inventaris RT", savedItems.length === items.length, `${savedItems.length} barang`);

const tenda = savedItems[0];
const sound = savedItems[3];
const loan1 = (await call("LOAN_REQUEST", warga[5].id, { itemId: tenda.id, startDate: wibDate(2), endDate: wibDate(3), qty: 2, purpose: "Syukuran aqiqah" })).loan;
const loan2 = (await call("LOAN_REQUEST", warga[8].id, { itemId: tenda.id, startDate: wibDate(3), endDate: wibDate(3), qty: 1, purpose: "Arisan keluarga" })).loan;
const clash = await call("LOAN_REQUEST", warga[9].id, { itemId: tenda.id, startDate: wibDate(3), endDate: wibDate(4), qty: 1, purpose: "Pengajian" }, true);
check("Tenda penuh di tanggal bentrok ditolak", clash.status === 409, clash.error);
const avail = await get(demo.id, { view: "availability", itemId: tenda.id, start: wibDate(4), end: wibDate(4) });
check("Ketersediaan hari berikutnya kembali 3", avail.available === 3, `tersedia ${avail.available}`);
const tooLong = await call("LOAN_REQUEST", demo.id, { itemId: sound.id, startDate: wibDate(1), endDate: wibDate(5), qty: 1, purpose: "Lomba 17-an" }, true);
check("Melebihi maks hari ditolak", tooLong.status === 400, tooLong.error);
const notMine = await call("LOAN", warga[5].id, { op: "APPROVE", loanId: loan1.id }, true);
check("Warga tidak bisa menyetujui pinjaman", notMine.status === 403);
await call("LOAN", sekretaris.id, { op: "APPROVE", loanId: loan1.id });
await call("LOAN", sekretaris.id, { op: "HANDOVER", loanId: loan1.id });
await call("LOAN", sekretaris.id, { op: "RETURN", loanId: loan1.id, condition: "BAIK" });
const { data: sewa } = await supabase.from("financial_records").select("amount").eq("communityId", COMMUNITY_ID).like("title", "Sewa inventaris:%");
check("Biaya sewa masuk Kas saat dikembalikan", sewa?.[0]?.amount === 2 * 2 * 50000, `Rp ${sewa?.[0]?.amount}`);
await call("LOAN_REQUEST", demo.id, { itemId: savedItems[1].id, startDate: wibDate(5), endDate: wibDate(6), qty: 40, purpose: "Pengajian rutin di rumah" });
void loan2;

// ───── Kabar terbaru ─────
const k1 = await call("KABAR", humas.id, { category: "PEMADAMAN", title: "Pemadaman listrik terjadwal Sabtu 09.00–13.00", content: "PLN UP3 Bekasi melakukan pemeliharaan jaringan. Cluster Madrid blok A–D terdampak. Mohon siapkan penerangan & cabut peralatan elektronik sensitif.", pinDays: 3 });
const duka = await call("KABAR", ketua.id, { category: "DUKA", title: "Kabar duka dari keluarga Blok C", person: "Bpk. H. Suparman bin Wiryo (72 th)", content: "Telah berpulang ke rahmatullah pagi ini pukul 04.15 WIB. Jenazah disemayamkan di rumah duka dan dimakamkan ba'da Dzuhur di TPU Babelan. Mohon doa dan kehadiran bapak/ibu untuk takziah.", eventDate: iso(5 * H), location: "Rumah duka Blok C · TPU Babelan", contactPhone: "0812-7777-3300", openSantunan: true, santunanTarget: 5000000 });
check("Kabar duka + galang dana santunan otomatis", !!duka.fundraiser, duka.fundraiser?.title);
await call("KABAR", warga[12].id, { category: "KELAHIRAN", title: "Alhamdulillah, anak kedua kami lahir 👶", person: "Muhammad Alfatih", content: "Lahir dengan selamat di RS Mitra Keluarga, 3,2 kg / 49 cm. Mohon doanya semoga jadi anak sholeh." });
await call("KABAR", humas.id, { category: "PRESTASI", title: "Selamat! Tim futsal remaja Cluster Madrid juara 1 antar-cluster MGC", content: "Terima kasih atas dukungan warga. Piala dipajang di pos RT. 🏆" });
await call("KABAR", humas.id, { category: "WARGA_BARU", title: "Selamat datang keluarga baru di Blok D", person: "Keluarga Bpk. Andreas", content: "Mari sambut tetangga baru kita dengan hangat. 🏡" });
await call("KABAR", sekretaris.id, { category: "INFO", title: "Jadwal pengangkutan sampah berubah mulai Oktober", content: "Sampah diangkut Selasa, Kamis, dan Sabtu pukul 07.00. Mohon pisahkan sampah organik & anorganik." });
check("Kabar terbaru", !!k1.postId, "6 kabar");

// ───── Polling ─────
const p1 = (await call("POLL_CREATE", ketua.id, { title: "Setuju iuran keamanan naik Rp 10.000 untuk tambah 1 satpam malam?", description: "Saat ini 2 satpam untuk 38 rumah. Usulan: tambah 1 satpam shift malam (22.00–06.00). Iuran keamanan dari Rp 100.000 → Rp 110.000/bulan mulai November.", options: ["Setuju", "Tidak setuju", "Abstain"], voteScope: "HOUSE", closesAt: iso(3 * D) })).poll;
const p2 = (await call("POLL_CREATE", humas.id, { title: "Acara 17-an tahun depan paling seru yang mana?", options: ["Lomba anak & keluarga", "Jalan sehat + doorprize", "Panggung hiburan & bazar", "Turnamen futsal antar-blok"], maxChoices: 2, voteScope: "USER", closesAt: iso(7 * D) })).poll;
const p3 = (await call("POLL_CREATE", sekretaris.id, { title: "Waktu kerja bakti bulan depan?", options: ["Sabtu pagi", "Minggu pagi"], voteScope: "HOUSE", anonymous: true, closesAt: iso(2 * H) })).poll;

// votes: household scope → one vote per house; later family member overwrites
const houses = new Map();
const { data: cits } = await supabase.from("citizens").select("id, houseId").eq("communityId", COMMUNITY_ID);
const houseOfCitizen = new Map(cits.map((c) => [c.id, c.houseId]));
for (const u of warga) {
  const h = houseOfCitizen.get(u.citizenId);
  if (h && !houses.has(h)) houses.set(h, u);
}
const voters = Array.from(houses.values());
let n = 0;
for (const u of voters.slice(0, 22)) await call("POLL_VOTE", u.id, { pollId: p1.id, optionIds: [n++ % 5 === 4 ? "o2" : n % 7 === 0 ? "o3" : "o1"] });
for (const [i, u] of warga.slice(0, 30).entries()) await call("POLL_VOTE", u.id, { pollId: p2.id, optionIds: i % 3 === 0 ? ["o1", "o3"] : i % 3 === 1 ? ["o2"] : ["o4", "o1"] });
for (const [i, u] of voters.slice(0, 15).entries()) await call("POLL_VOTE", u.id, { pollId: p3.id, optionIds: [i % 3 ? "o2" : "o1"] });

// same house, second member → overwrites instead of adding
const firstVoter = voters[0];
const sibling = warga.find((u) => u.id !== firstVoter.id && houseOfCitizen.get(u.citizenId) === houseOfCitizen.get(firstVoter.citizenId));
const r1 = await get(ketua.id, { view: "poll", pollId: p1.id });
if (sibling) {
  const r = await call("POLL_VOTE", sibling.id, { pollId: p1.id, optionIds: ["o1"] });
  check("1 rumah 1 suara (anggota KK lain menimpa, bukan menambah)", r.poll.result.totalVoters === r1.poll.result.totalVoters, `${r.poll.result.totalVoters} rumah memilih dari ${r.poll.result.eligible}`);
}
const tooMany = await call("POLL_VOTE", demo.id, { pollId: p2.id, optionIds: ["o1", "o2", "o3"] }, true);
check("Melebihi maks pilihan ditolak", tooMany.status === 400, tooMany.error);
const anon = await get(demo.id, { view: "poll", pollId: p3.id });
check("Polling anonim tidak mengirim daftar pemilih", anon.poll.anonymous && !anon.poll.result.voters);
const notPengurus = await call("POLL_CREATE", demo.id, { title: "x", options: ["a", "b"], closesAt: iso(D) }, true);
check("Warga biasa tidak bisa membuat polling", notPengurus.status === 403);

// a closed poll with history
const p4 = (await call("POLL_CREATE", ketua.id, { title: "Pemasangan portal otomatis di gerbang belakang?", description: "Biaya Rp 18 juta dari kas pembangunan.", options: ["Setuju", "Tidak setuju"], voteScope: "HOUSE", closesAt: iso(D) })).poll;
for (const [i, u] of voters.slice(0, 27).entries()) await call("POLL_VOTE", u.id, { pollId: p4.id, optionIds: [i % 4 === 3 ? "o2" : "o1"] });
const closed = await call("POLL_CLOSE", ketua.id, { pollId: p4.id });
check("Tutup polling & umumkan hasil", closed.poll.status === "DITUTUP", `${closed.poll.result.counts.o1} setuju / ${closed.poll.result.counts.o2} tidak`);
const late = await call("POLL_VOTE", demo.id, { pollId: p4.id, optionIds: ["o1"] }, true);
check("Tidak bisa memilih setelah ditutup", late.status === 409);

// ───── Musyawarah ─────
const nextSat = (() => {
  const d = new Date(Date.now() + 7 * H);
  const day = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Jakarta" })).getDay();
  const add = ((6 - day + 7) % 7) || 7;
  const date = new Date(Date.now() + add * D).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  return new Date(`${date}T19:30:00+07:00`).toISOString();
})();
const m1 = (await call("MEETING_CREATE", ketua.id, {
  title: "Rapat Warga Bulanan · Oktober", startAt: nextSat, endAt: new Date(new Date(nextSat).getTime() + 2 * H).toISOString(), location: "Balai Warga Cluster Madrid (samping pos satpam)",
  onlineUrl: "https://meet.google.com/", audience: "KEPALA_KELUARGA",
  description: "Mohon kehadiran perwakilan setiap rumah. Keputusan iuran keamanan akan ditetapkan di rapat ini.",
  agenda: [{ title: "Pembukaan & laporan Ketua RT" }, { title: "Laporan kas bulan September", presenter: bendahara.fullName }, { title: "Usulan penambahan satpam malam" }, { title: "Persiapan lomba 17-an & HUT cluster" }, { title: "Lain-lain" }],
})).meeting;
for (const [i, u] of voters.slice(0, 20).entries()) await call("MEETING", u.id, { meetingId: m1.id, op: "RSVP", rsvp: i % 6 === 5 ? "TIDAK" : i % 4 === 3 ? "MUNGKIN" : "HADIR" });
const badCode = await call("MEETING", demo.id, { meetingId: m1.id, op: "CHECKIN", code: "salah" }, true);
check("Absen dengan kode QR palsu ditolak", badCode.status === 403);
const early = await get(ketua.id, { view: "attendees", meetingId: m1.id });
const tooEarly = await call("MEETING", demo.id, { meetingId: m1.id, op: "CHECKIN", code: early.checkinCode }, true);
check("Absen sebelum waktunya ditolak", tooEarly.status === 409);
const warView = await get(demo.id, { view: "attendees", meetingId: m1.id });
check("Kode QR tidak bocor ke warga", warView.checkinCode === null && warView.roster.length === 0);

// A meeting happening now: start, QR check-in, voting, notulen, finish
const m2 = (await call("MEETING_CREATE", ketua.id, {
  title: "Musyawarah Persiapan HUT Cluster Madrid", startAt: iso(-30 * 60_000), location: "Taman bermain Blok B", audience: "SEMUA",
  agenda: [{ title: "Pembentukan panitia" }, { title: "Rencana anggaran & sumber dana" }, { title: "Susunan acara" }],
})).meeting;
await call("MEETING", ketua.id, { meetingId: m2.id, op: "START" });
const { checkinCode } = await get(ketua.id, { view: "attendees", meetingId: m2.id });
for (const u of voters.slice(0, 18)) await call("MEETING", u.id, { meetingId: m2.id, op: "CHECKIN", code: checkinCode });
await call("MEETING", sekretaris.id, { meetingId: m2.id, op: "CHECKIN_USER", targetUserId: voters[19].id });
const vp = (await call("POLL_CREATE", ketua.id, { meetingId: m2.id, title: "Tema HUT Cluster Madrid", options: ["Festival Kuliner Nusantara", "Madrid Fun Run", "Malam Seni & Budaya"], voteScope: "USER", closesAt: iso(H) })).poll;
for (const [i, u] of voters.slice(0, 18).entries()) await call("POLL_VOTE", u.id, { pollId: vp.id, optionIds: [["o1", "o1", "o2", "o3", "o1"][i % 5]] });
await call("MEETING", sekretaris.id, {
  meetingId: m2.id, op: "FINISH",
  minutes: "Musyawarah dibuka Ketua RT pukul 19.35 dan dihadiri perwakilan 19 rumah.\n\n1. Panitia HUT dibentuk: Ketua panitia Humas RT, dibantu karang taruna.\n2. Anggaran disepakati Rp 12.500.000 dari kas RT (Rp 5 jt), iuran sukarela, dan sponsor warung warga.\n3. Voting tema: Festival Kuliner Nusantara terpilih.\n\nMusyawarah ditutup pukul 21.05.",
  decisions: [
    { text: "Tema HUT: Festival Kuliner Nusantara", pic: humas.fullName },
    { text: "Anggaran Rp 12,5 jt (kas RT Rp 5 jt + sukarela + sponsor)", pic: bendahara.fullName, dueDate: wibDate(14) },
    { text: "Proposal sponsor ke UMKM Pasar Warga", pic: "Karang Taruna", dueDate: wibDate(10) },
  ],
});
const ov = await get(ketua.id, { view: "overview" });
const done2 = ov.meetings.find((m) => m.id === m2.id);
const vpDone = ov.polls.find((p) => p.id === vp.id);
check("Musyawarah selesai + notulen + voting ikut ditutup", done2.status === "SELESAI" && vpDone.status === "DITUTUP", `${done2.stats.checkedIn} hadir · ${done2.stats.houses}/${done2.stats.totalHouses} rumah · ${done2.decisions.length} keputusan`);
await call("MEETING", ketua.id, { meetingId: m2.id, op: "TOGGLE_DECISION", decisionId: done2.decisions[0].id });

// ───── Galang dana ─────
const santunan = ov.fundraisers.find((f) => f.category === "DUKA");
const pos = (await call("FUND_CREATE", bendahara.id, { title: "Renovasi Pos Ronda & CCTV Gerbang Belakang", category: "PEMBANGUNAN", beneficiary: "Seluruh warga Cluster Madrid", targetAmount: 15000000, deadline: wibDate(30), story: "Atap pos ronda bocor dan CCTV gerbang belakang mati sejak Agustus. Dana untuk: atap baja ringan (Rp 6 jt), 2 kamera CCTV + DVR (Rp 7 jt), cat & listrik (Rp 2 jt). Laporan penggunaan dana dibagikan di Balai Warga.", paymentInfo: "BCA 1234567890 a.n. Kas RT 02 Cluster Madrid\natau tunai ke Bendahara RT" })).fundraiser;
const proof = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const donate = async (fund, u, amount, extra = {}) => (await call("FUND", u.id, { op: "DONATE", fundraiserId: fund.id, amount, method: "TRANSFER", proofUrl: proof, ...extra })).donation;
const dons = [];
for (const [i, u] of warga.slice(0, 16).entries()) dons.push(await donate(pos, u, [100000, 250000, 50000, 500000][i % 4], { message: i % 3 === 0 ? "Semoga cepat selesai 🙏" : undefined, anonymous: i % 5 === 0 }));
for (const [i, u] of warga.slice(16, 30).entries()) dons.push(await donate(santunan, u, [100000, 200000, 50000][i % 3], { message: i % 2 ? "Turut berduka cita, semoga husnul khotimah" : undefined }));
const noProof = await call("FUND", demo.id, { op: "DONATE", fundraiserId: pos.id, amount: 50000, method: "TRANSFER" }, true);
check("Transfer tanpa bukti ditolak", noProof.status === 400);
await call("FUND", demo.id, { op: "DONATE", fundraiserId: pos.id, amount: 75000, method: "TUNAI", message: "Titip lewat Bu Bendahara" });
const selfVerify = await call("FUND", demo.id, { op: "VERIFY", donationId: dons[0].id }, true);
check("Warga tidak bisa memverifikasi donasi", selfVerify.status === 403);
for (const d of dons.slice(0, -3)) await call("FUND", bendahara.id, { op: "VERIFY", donationId: d.id });
const twice = await call("FUND", bendahara.id, { op: "VERIFY", donationId: dons[0].id }, true);
check("Verifikasi ganda ditolak (tidak dobel di Kas)", twice.status === 409);
await call("FUND", bendahara.id, { op: "REJECT", donationId: dons.at(-1).id, note: "Bukti transfer tidak terbaca, mohon kirim ulang." });
const { data: kasRows } = await supabase.from("financial_records").select("amount").eq("communityId", COMMUNITY_ID).like("notes", "%galang dana fund_%");
const kasTotal = kasRows.reduce((a, r) => a + r.amount, 0);
const ov2 = await get(bendahara.id, { view: "overview" });
const fundTotal = ov2.fundraisers.reduce((a, f) => a + f.collected, 0);
check("Donasi diterima = pemasukan Kas RT", kasTotal === fundTotal, `Rp ${kasTotal.toLocaleString("id-ID")} · ${ov2.counts.pendingDonations} menunggu verifikasi`);

const { count: notifCount } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("communityId", COMMUNITY_ID).like("type", "BALAI_%");
const { count: feedCount } = await supabase.from("feed_posts").select("id", { count: "exact", head: true }).eq("communityId", COMMUNITY_ID).eq("module", "BALAI");
console.log(`\nSelesai: ${feedCount} post Balai di Feed, ${notifCount} notifikasi Balai.`);
