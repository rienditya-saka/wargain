// Dummy data: 150 warga Cluster Madrid, Mutiara Gading City (Babelan, Kab. Bekasi)
// Usage: node --env-file=.env.local scratch/seed-cluster-madrid.mjs [communityId] [--dry-run]
// Idempotent: fixed ids (prefix "mdr_") are upserted, so re-running updates instead of duplicating.
import { createClient } from "@supabase/supabase-js";

const COMMUNITY_ID = process.argv.find((a) => a.startsWith("comm_")) ?? "comm_1789889738300";
const DRY_RUN = process.argv.includes("--dry-run");
const TARGET_CITIZENS = 150;
const DEMO_PASSWORD = "MadridMGC2026!";
const EMAIL_DOMAIN = "demo.wargain.id";

const supabase = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Deterministic PRNG so every run produces the same people.
let seed = 20260923;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));
const chance = (p) => rand() < p;
function weighted(pairs) {
  const total = pairs.reduce((n, [, w]) => n + w, 0);
  let r = rand() * total;
  for (const [v, w] of pairs) if ((r -= w) <= 0) return v;
  return pairs[pairs.length - 1][0];
}

// Cluster Madrid outline from OpenStreetMap (way 1472430545): SW, SE, NE, NW corners.
const CORNERS = {
  sw: [-6.1386507, 107.0162451],
  se: [-6.1388853, 107.0177793],
  ne: [-6.1350984, 107.0183051],
  nw: [-6.1348531, 107.0167494],
};
function pointInCluster(u, v) {
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const south = lerp(CORNERS.sw, CORNERS.se, u);
  const north = lerp(CORNERS.nw, CORNERS.ne, u);
  const [lat, lng] = lerp(south, north, v);
  return { lat: +(lat + (rand() - 0.5) * 0.00003).toFixed(7), lng: +(lng + (rand() - 0.5) * 0.00003).toFixed(7) };
}

const MALE = ["Ahmad", "Budi", "Dedi", "Eko", "Fajar", "Gilang", "Hendra", "Irfan", "Joko", "Kurniawan", "Lukman", "Muhammad", "Nur", "Oki", "Putra", "Rizky", "Slamet", "Taufik", "Udin", "Wahyu", "Yusuf", "Zainal", "Agus", "Bayu", "Dimas", "Galih", "Hadi", "Iwan", "Rahmat", "Teguh", "Andi", "Arif", "Doni", "Rudi", "Sigit", "Yoga", "Reza", "Fikri", "Aditya", "Bambang", "Heru", "Imam", "Rendra", "Yudi", "Asep", "Ujang", "Dadang", "Cecep"];
const FEMALE = ["Ani", "Dewi", "Fitri", "Indah", "Lestari", "Maya", "Nurul", "Putri", "Rina", "Siti", "Tuti", "Wulan", "Yuni", "Ayu", "Citra", "Eka", "Hana", "Intan", "Kartika", "Lina", "Mega", "Novi", "Ratna", "Sari", "Tika", "Vina", "Winda", "Yanti", "Nabila", "Aisyah", "Salsabila", "Anisa", "Rahma", "Dian", "Euis", "Neng", "Imas", "Nining"];
const SURNAME = ["Saputra", "Wijaya", "Pratama", "Hidayat", "Nugroho", "Santoso", "Setiawan", "Kusuma", "Permana", "Siregar", "Nasution", "Harahap", "Simanjuntak", "Gunawan", "Hakim", "Ramadhan", "Firmansyah", "Maulana", "Sutanto", "Purnomo", "Wibowo", "Susanto", "Hermawan", "Sulistyo", "Lubis", "Tanjung", "Daulay", "Pane", "Rangkuti", "Suryadi", "Kurnia", "Fauzi", "Syahputra", "Munandar", "Sopandi"];
const BIRTH_PLACES = ["Bekasi", "Jakarta", "Bandung", "Bogor", "Karawang", "Cirebon", "Tegal", "Semarang", "Yogyakarta", "Surabaya", "Medan", "Padang", "Palembang", "Garut", "Tasikmalaya", "Solo", "Lampung", "Makassar"];
const JOBS_MALE = ["Karyawan Swasta", "Wiraswasta", "PNS", "TNI", "POLRI", "Pedagang", "Sopir Online", "Guru", "Buruh Pabrik", "Teknisi", "Programmer", "Perawat", "Satpam", "Kontraktor"];
const JOBS_FEMALE = ["Mengurus Rumah Tangga", "Karyawan Swasta", "Guru", "Wiraswasta", "PNS", "Perawat", "Pedagang Online", "Bidan", "Admin Kantor"];
const RELIGIONS = [["ISLAM", 85], ["KRISTEN", 7], ["KATOLIK", 5], ["BUDDHA", 2], ["HINDU", 1]];
const STREETS = ["Jl. Madrid 1", "Jl. Madrid 2", "Jl. Madrid 3"];
const ADDRESS_SUFFIX = "Cluster Madrid, Mutiara Gading City, Kel. Kebalen, Kec. Babelan, Kab. Bekasi 17610";
const KEC_CODE = "321606"; // Kab. Bekasi (3216), Kec. Babelan

const today = new Date("2026-09-23T00:00:00+07:00");
function birthDateFor(age) {
  const d = new Date(today);
  d.setFullYear(d.getFullYear() - age);
  d.setDate(d.getDate() - int(1, 360));
  return d;
}
const iso = (d) => d.toISOString().slice(0, 10);
function makeNik(birth, gender, seq) {
  const dd = String(birth.getDate() + (gender === "P" ? 40 : 0)).padStart(2, "0");
  const mm = String(birth.getMonth() + 1).padStart(2, "0");
  const yy = String(birth.getFullYear()).slice(-2);
  return `${KEC_CODE}${dd}${mm}${yy}${String(seq).padStart(4, "0")}`;
}
const phone = () => `08${pick(["12", "13", "21", "22", "52", "53", "56", "57", "77", "78", "81", "82", "95", "96"])}${String(int(10000000, 99999999))}`;
const personName = (gender, surname) => `${pick(gender === "L" ? MALE : FEMALE)}${chance(0.6) ? " " + pick(gender === "L" ? MALE : FEMALE) : ""} ${surname}`;

// ---------- Build families until exactly 150 people ----------
const families = [];
let people = 0;
let nikSeq = 1;
while (people < TARGET_CITIZENS) {
  let size = weighted([[1, 5], [2, 14], [3, 24], [4, 30], [5, 19], [6, 8]]);
  size = Math.min(size, TARGET_CITIZENS - people);
  const surname = pick(SURNAME);
  const religion = weighted(RELIGIONS);
  const members = [];

  if (size === 1) {
    const elderly = chance(0.4);
    const gender = elderly ? (chance(0.7) ? "P" : "L") : pick(["L", "P"]);
    const age = elderly ? int(63, 82) : int(23, 34);
    members.push({ role: "KEPALA_KELUARGA", gender, age, marital: elderly ? "CERAI MATI" : "BELUM KAWIN" });
  } else {
    const headAge = int(27, 68);
    members.push({ role: "KEPALA_KELUARGA", gender: "L", age: headAge, marital: "KAWIN" });
    members.push({ role: "ISTRI", gender: "P", age: Math.max(22, headAge - int(0, 7)), marital: "KAWIN" });
    let slots = size - 2;
    // Some bigger families live with a grandparent.
    if (slots > 0 && headAge < 50 && chance(0.18)) {
      members.push({ role: "FAMILI_LAIN", gender: chance(0.65) ? "P" : "L", age: int(64, 85), marital: "CERAI MATI" });
      slots--;
    }
    const maxChildAge = Math.max(0, Math.min(headAge - 22, 26));
    for (let i = 0; i < slots; i++) {
      const age = headAge < 32 ? int(0, 5) : int(0, maxChildAge);
      members.push({ role: "ANAK", gender: pick(["L", "P"]), age, marital: age >= 24 && chance(0.2) ? "KAWIN" : "BELUM KAWIN" });
    }
  }

  const familyIndex = families.length + 1;
  for (const m of members) {
    const birth = birthDateFor(m.age);
    m.fullName = m.role === "ANAK" || m.role === "FAMILI_LAIN" || m.role === "ISTRI" || m.gender === "P"
      ? personName(m.gender, m.role === "ISTRI" || m.role === "FAMILI_LAIN" ? pick(SURNAME) : surname)
      : personName(m.gender, surname);
    m.birthDate = iso(birth);
    m.birthPlace = pick(BIRTH_PLACES);
    m.nik = makeNik(birth, m.gender, nikSeq++);
    m.religion = religion;
    m.occupation =
      m.age < 6 ? "Belum Sekolah" :
      m.age < 18 ? "Pelajar" :
      m.age < 23 && m.role === "ANAK" ? "Mahasiswa" :
      m.age >= 62 ? "Pensiunan" :
      pick(m.gender === "L" ? JOBS_MALE : JOBS_FEMALE);
    m.phone = m.age >= 17 ? phone() : null;
  }

  const hasElder = members.some((m) => m.age >= 60);
  const hasToddler = members.some((m) => m.age < 5);
  const socialCategory =
    chance(0.04) ? "DISABILITAS" :
    hasElder && chance(0.8) ? "LANSIA" :
    hasToddler && chance(0.7) ? "BALITA" :
    chance(0.08) ? "PRA_SEJAHTERA" :
    chance(0.04) ? "BANSOS_RECIPIENT" :
    "SEJAHTERA";

  families.push({ index: familyIndex, surname, members, socialCategory });
  people += members.length;
}

// ---------- Houses: all families + some empty/renovating ----------
const EXTRA_VACANT = 3;
const EXTRA_RENOVATION = 2;
const totalHouses = families.length + EXTRA_VACANT + EXTRA_RENOVATION;
const PER_BLOCK = 8;
const blocks = Math.ceil(totalHouses / PER_BLOCK);
const BLOCK_LETTERS = "ABCDEFGHIJ".split("");

const houseSlots = [];
for (let b = 0; b < blocks; b++) {
  for (let n = 0; n < PER_BLOCK && houseSlots.length < totalHouses; n++) {
    const letter = BLOCK_LETTERS[b];
    const no = String(n + 1).padStart(2, "0");
    houseSlots.push({
      letter,
      no,
      blockNumber: `Blok ${letter}-${no}`,
      street: STREETS[Math.floor(b / 2) % STREETS.length],
      point: pointInCluster((n + 0.5) / PER_BLOCK, (b + 0.5) / blocks),
    });
  }
}

// Spread the empty/renovating houses across the cluster instead of bunching them at the end.
const specialIdx = new Set();
while (specialIdx.size < EXTRA_VACANT + EXTRA_RENOVATION) specialIdx.add(int(0, totalHouses - 1));
const specialList = [...specialIdx];
const vacantSet = new Set(specialList.slice(0, EXTRA_VACANT));

const houses = [];
const familyCards = [];
const citizens = [];
const now = new Date().toISOString();
let familyCursor = 0;

houseSlots.forEach((slot, i) => {
  const houseId = `mdr_house_${slot.letter}${slot.no}`;
  const address = `${slot.street} ${slot.blockNumber.replace("Blok ", "Blok ")}, ${ADDRESS_SUFFIX}`;
  const ownerSurname = pick(SURNAME);

  if (specialIdx.has(i)) {
    const vacant = vacantSet.has(i);
    houses.push({
      id: houseId,
      communityId: COMMUNITY_ID,
      blockNumber: slot.blockNumber,
      address,
      rtRw: "002/003",
      occupancyStatus: vacant ? "KOSONG" : "RENOVASI",
      ownerName: `Bpk. ${pick(MALE)} ${ownerSurname}`,
      ownerPhone: phone(),
      ownerAddress: vacant ? "Jakarta Timur (pemilik tidak menetap)" : null,
      currentKKId: null,
      occupantName: null,
      occupantPhone: null,
      totalResidents: 0,
      lat: slot.point.lat,
      lng: slot.point.lng,
      notes: vacant ? "Rumah kosong, belum dihuni sejak serah terima." : "Sedang renovasi dapur & lantai 2.",
      createdAt: now,
      updatedAt: now,
    });
    return;
  }

  const fam = families[familyCursor++];
  const head = fam.members[0];
  const rented = chance(0.12);
  const kkId = `mdr_kk_${String(fam.index).padStart(3, "0")}`;
  const noKK = `${KEC_CODE}${String(int(10, 28)).padStart(2, "0")}${String(int(1, 12)).padStart(2, "0")}${String(int(10, 24))}${String(fam.index).padStart(4, "0")}`;
  const ownerName = rented ? `Bpk. ${pick(MALE)} ${ownerSurname}` : head.fullName;

  houses.push({
    id: houseId,
    communityId: COMMUNITY_ID,
    blockNumber: slot.blockNumber,
    address,
    rtRw: "002/003",
    occupancyStatus: rented ? "DISEWAKAN" : "DITEMPATI",
    ownerName,
    ownerPhone: rented ? phone() : head.phone ?? phone(),
    ownerAddress: rented ? "Bekasi Barat" : null,
    currentKKId: kkId,
    occupantName: head.fullName,
    occupantPhone: head.phone,
    totalResidents: fam.members.length,
    lat: slot.point.lat,
    lng: slot.point.lng,
    notes: rented ? "Dikontrakkan, kontrak 1 tahun." : null,
    createdAt: now,
    updatedAt: now,
  });

  familyCards.push({
    id: kkId,
    communityId: COMMUNITY_ID,
    houseId,
    noKK,
    headName: head.fullName,
    blockNumber: slot.blockNumber,
    address,
    phone: head.phone ?? phone(),
    residencyType: rented ? "TIDAK_TETAP" : "TETAP",
    socialCategory: fam.socialCategory,
    occupancyStatus: rented ? "SEWA_KONTRAK" : "MILIK_SENDIRI",
    lat: slot.point.lat,
    lng: slot.point.lng,
    createdAt: now,
    updatedAt: now,
  });

  fam.houseId = houseId;
  fam.kkId = kkId;
  fam.blockNumber = slot.blockNumber;
  fam.members.forEach((m, j) => {
    m.id = `mdr_cit_${String(fam.index).padStart(3, "0")}_${j + 1}`;
    citizens.push({
      id: m.id,
      communityId: COMMUNITY_ID,
      familyCardId: kkId,
      houseId,
      nik: m.nik,
      fullName: m.fullName,
      role: m.role,
      gender: m.gender,
      age: m.age,
      birthPlace: m.birthPlace,
      birthDate: m.birthDate,
      religion: m.religion,
      maritalStatus: m.marital,
      occupation: m.occupation,
      phone: m.phone,
      createdAt: now,
      updatedAt: now,
    });
  });
});

// ---------- Pengurus RT + one warga login ----------
// One officer per family, each from a different block, so the pengurus are spread across the cluster.
const blockOf = (fam) => fam.blockNumber.split("-")[0];
function findMember(predicate, taken) {
  const housed = families.filter((f) => f.houseId && !taken.families.has(f.index) && !taken.blocks.has(blockOf(f)));
  const start = int(0, Math.max(0, housed.length - 1));
  for (let k = 0; k < housed.length; k++) {
    const fam = housed[(start + k) % housed.length];
    const m = fam.members.find((x) => predicate(x, fam));
    if (m) {
      taken.families.add(fam.index);
      taken.blocks.add(blockOf(fam));
      return { member: m, fam };
    }
  }
  throw new Error("Tidak ada warga yang cocok untuk jabatan");
}
const taken = { families: new Set(), blocks: new Set() };
const adult = (min, max) => (m) => m.age >= min && m.age <= max && m.phone;
const officers = [
  { role: "KETUA", title: "Ketua RT", email: `ketua.rt@${EMAIL_DOMAIN}`, ...findMember((m) => m.role === "KEPALA_KELUARGA" && adult(40, 60)(m), taken) },
  { role: "SEKRETARIS", title: "Sekretaris RT", email: `sekretaris.rt@${EMAIL_DOMAIN}`, ...findMember((m) => m.role === "KEPALA_KELUARGA" && adult(30, 50)(m), taken) },
  { role: "BENDAHARA", title: "Bendahara RT", email: `bendahara.rt@${EMAIL_DOMAIN}`, ...findMember((m) => m.role === "ISTRI" && adult(30, 55)(m), taken) },
  { role: "HUMAS", title: "Humas RT", email: `humas.rt@${EMAIL_DOMAIN}`, ...findMember((m) => m.role === "KEPALA_KELUARGA" && adult(28, 45)(m), taken) },
  { role: "ANGGOTA", title: "Warga (akun demo)", email: `warga@${EMAIL_DOMAIN}`, ...findMember((m) => adult(25, 60)(m), taken) },
];

// ---------- Report ----------
const byRole = citizens.reduce((acc, c) => ((acc[c.role] = (acc[c.role] ?? 0) + 1), acc), {});
const bySocial = familyCards.reduce((acc, c) => ((acc[c.socialCategory] = (acc[c.socialCategory] ?? 0) + 1), acc), {});
const byOccupancy = houses.reduce((acc, h) => ((acc[h.occupancyStatus] = (acc[h.occupancyStatus] ?? 0) + 1), acc), {});
console.log(`Komunitas: ${COMMUNITY_ID}${DRY_RUN ? " (DRY RUN)" : ""}`);
console.log(`Warga: ${citizens.length} · KK: ${familyCards.length} · Rumah: ${houses.length}`);
console.log("Peran keluarga:", byRole);
console.log("Kategori sosial KK:", bySocial);
console.log("Status rumah:", byOccupancy);
console.log("Pengurus:");
officers.forEach((o) => console.log(`  ${o.title.padEnd(18)} ${o.member.fullName.padEnd(32)} ${o.fam.blockNumber}  ${o.email}`));

if (DRY_RUN) process.exit(0);

// ---------- Write ----------
async function upsert(table, rows) {
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await supabase.from(table).upsert(rows.slice(i, i + 100), { onConflict: "id" });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  console.log(`✓ ${table}: ${rows.length}`);
}

// houses.currentKKId references family_cards and family_cards.houseId references houses:
// insert houses without KK first, then KK, then link.
await upsert("houses", houses.map((h) => ({ ...h, currentKKId: null })));
await upsert("family_cards", familyCards);
await upsert("houses", houses);
await upsert("citizens", citizens);

const { data: community, error: commErr } = await supabase.from("communities").select("*").eq("id", COMMUNITY_ID).single();
if (commErr) throw commErr;

const { data: authList, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listErr) throw listErr;

for (const o of officers) {
  const metadata = {
    fullName: o.member.fullName,
    phone: o.member.phone,
    role: o.role,
    communityId: COMMUNITY_ID,
    communityName: community.name,
    communitySlug: community.slug,
    planTier: community.planTier,
    isTenantActive: community.isActive,
    planStatus: community.planStatus,
    houseBlock: o.fam.blockNumber,
    citizenId: o.member.id,
  };
  const existing = authList.users.find((u) => u.email === o.email);
  let userId;
  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, { password: DEMO_PASSWORD, user_metadata: metadata, email_confirm: true });
    if (error) throw new Error(`auth ${o.email}: ${error.message}`);
    userId = existing.id;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({ email: o.email, password: DEMO_PASSWORD, email_confirm: true, user_metadata: metadata });
    if (error) throw new Error(`auth ${o.email}: ${error.message}`);
    userId = data.user.id;
  }
  const { error: userErr } = await supabase.from("users").upsert(
    {
      id: userId,
      email: o.email,
      passwordHash: "SUPABASE_AUTH_MANAGED",
      fullName: o.member.fullName,
      phone: o.member.phone,
      role: o.role,
      communityId: COMMUNITY_ID,
      citizenId: o.member.id,
      houseBlock: o.fam.blockNumber,
      createdAt: now,
      updatedAt: now,
    },
    { onConflict: "id" }
  );
  if (userErr) throw new Error(`users ${o.email}: ${userErr.message}`);
  console.log(`✓ akun ${o.title}: ${o.email}`);
}

console.log(`\nSelesai. Password semua akun demo: ${DEMO_PASSWORD}`);
