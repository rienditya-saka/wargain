// Sample social events for Cluster Madrid via the app API (exercises auto-enroll + notifications).
// Usage (dev server running): node --env-file=.env.local scratch/seed-social-events.mjs [baseUrl]
import { createClient } from "@supabase/supabase-js";

const BASE = process.argv[2] ?? "http://localhost:4001";
const COMMUNITY_ID = "comm_1789889738300";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

async function api(path, method, body) {
  const res = await fetch(`${BASE}${path}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json();
  if (!res.ok) throw new Error(`${method} ${path}: ${json.error}`);
  return json;
}

// Jakarta local date `offsetDays` from today at HH:MM.
function at(offsetDays, time) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const d = new Date(`${today}T${time}:00+07:00`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString();
}
const plus = (iso, min) => new Date(new Date(iso).getTime() + min * 60_000).toISOString();

const { data: users } = await supabase.from("users").select("id, email, role, fullName, houseBlock").eq("communityId", COMMUNITY_ID);
const ketua = users.find((u) => u.role === "KETUA");
if (!ketua) throw new Error("Akun Ketua RT tidak ditemukan");

const base = { organizerName: `${ketua.fullName} (Ketua RT)`, contactPhone: "081234560001" };
const plans = [
  {
    event: {
      ...base, title: "Posyandu Balita Melati", category: "POSYANDU_BALITA", audience: "BALITA", autoEnroll: true,
      location: "Balai Warga Cluster Madrid", startAt: at(1, "08:00"), endAt: at(1, "11:00"),
      services: ["Timbang BB", "Ukur TB", "Lingkar Kepala", "Imunisasi", "Vitamin A", "PMT"],
      description: "Bawa buku KIA/KMS. PMT: bubur kacang hijau & telur rebus. Bidan Puskesmas Babelan hadir untuk imunisasi.",
      organizerName: "Kader Posyandu Melati", lat: -6.13695, lng: 107.01725,
    },
    repeat: { frequency: "MONTHLY", count: 3 },
  },
  {
    event: {
      ...base, title: "Posyandu Lansia Sehat Bahagia", category: "POSYANDU_LANSIA", audience: "LANSIA", autoEnroll: true,
      location: "Balai Warga Cluster Madrid", startAt: at(3, "07:30"), endAt: at(3, "10:30"),
      services: ["Cek Tensi", "Gula Darah", "Kolesterol", "Asam Urat", "Senam Lansia"],
      description: "Diawali senam lansia 30 menit. Mohon puasa 8 jam sebelum cek gula darah & kolesterol.",
      organizerName: "Kader Posyandu Lansia",
    },
    repeat: { frequency: "MONTHLY", count: 3 },
  },
  {
    event: {
      ...base, title: "Kerja Bakti Bersih Saluran Air", category: "KERJA_BAKTI", audience: "KEPALA_KELUARGA", autoEnroll: false,
      location: "Kumpul di Pos Satpam Jl. Madrid 1", startAt: at(4, "07:00"), endAt: at(4, "10:00"), capacity: 40,
      description: "Persiapan musim hujan: bersihkan got Jl. Madrid 1–3. Bawa cangkul/sapu lidi. Konsumsi disediakan RT.",
    },
  },
  {
    event: {
      ...base, title: "Pengajian Rutin Ibu-Ibu", category: "PENGAJIAN", audience: "IBU", autoEnroll: false,
      location: "Musholla Cluster Madrid", startAt: at(2, "15:30"), endAt: at(2, "17:00"),
      description: "Kajian rutin & arisan. Tuan rumah konsumsi bergilir.",
    },
    repeat: { frequency: "WEEKLY", count: 4 },
  },
  {
    event: {
      ...base, title: "Donor Darah PMI Kab. Bekasi", category: "DONOR_DARAH", audience: "SEMUA", autoEnroll: false,
      location: "Balai Warga Cluster Madrid", startAt: at(10, "08:00"), endAt: at(10, "12:00"), capacity: 60,
      services: ["Cek Hb", "Cek Tensi"], description: "Syarat: usia 17–60 th, BB ≥ 45 kg, sehat, tidur cukup. Dapat snack & sertifikat.",
    },
  },
];

const created = [];
for (const p of plans) {
  const res = await api("/api/sosial/events", "POST", { communityId: COMMUNITY_ID, userId: ketua.id, event: p.event, repeat: p.repeat });
  created.push(res.events[0]);
  console.log(`✓ ${p.event.title}: ${res.events.length} jadwal, auto-enroll ${res.enrolled}${res.eligible != null ? ` (sasaran ${res.eligible})` : ""}`);
}

// A warga registers his household for the kerja bakti.
const warga = users.find((u) => u.email === "warga@demo.wargain.id");
const kerjaBakti = created.find((e) => e.category === "KERJA_BAKTI");
const { data: wargaHouse } = await supabase
  .from("citizens")
  .select("id, fullName, role, houses!inner(blockNumber)")
  .eq("communityId", COMMUNITY_ID)
  .eq("houses.blockNumber", warga.houseBlock);
const head = wargaHouse.find((c) => c.role === "KEPALA_KELUARGA") ?? wargaHouse[0];
const reg = await api("/api/sosial/registrations", "POST", { eventId: kerjaBakti.id, userId: warga.id, citizenIds: [head.id] });
console.log(`✓ ${warga.fullName} mendaftarkan ${head.fullName} ke kerja bakti (+${reg.added})`);

// Kader records a measurement for the first auto-enrolled toddler.
const posyandu = created.find((e) => e.category === "POSYANDU_BALITA");
const { registrations } = await api(`/api/sosial/registrations?eventId=${posyandu.id}`, "GET");
// Pick a 1-year-old so the sample values (WHO median-ish for ~18 months) are plausible.
const r = registrations.find((x) => x.age === 1) ?? registrations[0];
if (r) {
  await api("/api/sosial/registrations", "PATCH", { id: r.id, userId: ketua.id, measurements: { beratKg: 10.6, tinggiCm: 81.2, lingkarKepalaCm: 46.5, vaksin: ["MR2", "DPT4"], vitaminA: true } });
  console.log(`✓ hasil posyandu dicatat untuk ${r.participantName} (${r.houseBlock})`);

  const parent = users.find((u) => u.houseBlock === r.houseBlock);
  if (parent) {
    const n = await api(`/api/notifications?userId=${parent.id}`, "GET");
    console.log(`\nNotifikasi ${parent.fullName} (${parent.email}), ${n.unread} belum dibaca:`);
    n.notifications.slice(0, 6).forEach((x) => console.log(`  • [${x.type}] ${x.title}`));
  }
}
