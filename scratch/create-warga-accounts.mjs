// Creates a Supabase Auth login (role ANGGOTA) for every adult resident (age >= 17) of a
// community and writes all credentials to credentials/<slug>-akun-warga.csv (git-ignored).
// Usage: node --env-file=.env.local scratch/create-warga-accounts.mjs [communityId] [--reset-passwords]
// Re-running keeps existing passwords (read back from the CSV) unless --reset-passwords is given.
import { createClient } from "@supabase/supabase-js";
import { randomInt } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const COMMUNITY_ID = process.argv.find((a) => a.startsWith("comm_")) ?? "comm_1789889738300";
const RESET = process.argv.includes("--reset-passwords");
const EMAIL_DOMAIN = "demo.wargain.id";
const MIN_AGE = 17;
// Only the Cluster Madrid seed residents (placeholder rows from the old demo are skipped).
const CITIZEN_PREFIX = "mdr_cit_";
const OFFICER_DEMO_PASSWORD = "MadridMGC2026!"; // set by seed-cluster-madrid.mjs

const supabase = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Readable random password: no look-alike characters (0/O, 1/l/I).
function makePassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const pickFrom = (set, n) => Array.from({ length: n }, () => set[randomInt(set.length)]).join("");
  return `${pickFrom(upper, 1)}${pickFrom(lower, 4)}-${pickFrom(digits, 4)}-${pickFrom(upper + lower, 3)}`;
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/^(bpk|ibu|h|hj)\.?\s+/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
}

const csvCell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function readExistingPasswords(path) {
  const map = new Map();
  if (!existsSync(path)) return map;
  const lines = readFileSync(path, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
  const header = lines.find((l) => l.startsWith("No,"));
  if (!header) return map;
  const cols = header.split(",");
  const emailIdx = cols.indexOf("Email");
  const pwIdx = cols.indexOf("Password");
  for (const line of lines.slice(lines.indexOf(header) + 1)) {
    const cells = line.split(",");
    if (cells[emailIdx] && cells[pwIdx]) map.set(cells[emailIdx], cells[pwIdx]);
  }
  return map;
}

// ---------- Load community + residents ----------
const { data: community, error: commErr } = await supabase.from("communities").select("*").eq("id", COMMUNITY_ID).single();
if (commErr) throw commErr;

const [{ data: citizens, error: citErr }, { data: houses, error: houseErr }] = await Promise.all([
  supabase.from("citizens").select("*").eq("communityId", COMMUNITY_ID).like("id", `${CITIZEN_PREFIX}%`).gte("age", MIN_AGE).order("houseId").order("id"),
  supabase.from("houses").select("id, blockNumber, address").eq("communityId", COMMUNITY_ID),
]);
if (citErr) throw citErr;
if (houseErr) throw houseErr;
const houseById = new Map(houses.map((h) => [h.id, h]));

const authUsers = [];
for (let page = 1; ; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  authUsers.push(...data.users);
  if (data.users.length < 1000) break;
}
const authByEmail = new Map(authUsers.map((u) => [u.email, u]));
const authByCitizen = new Map(
  authUsers.filter((u) => u.user_metadata?.communityId === COMMUNITY_ID && u.user_metadata?.citizenId).map((u) => [u.user_metadata.citizenId, u])
);

mkdirSync("credentials", { recursive: true });
const csvPath = `credentials/${community.slug}-akun-warga.csv`;
const knownPasswords = RESET ? new Map() : readExistingPasswords(csvPath);

// ---------- Create / update accounts ----------
const rows = [];
const usedEmails = new Set();
let created = 0;
let updated = 0;
let kept = 0;

for (const c of citizens) {
  const house = houseById.get(c.houseId);
  const houseBlock = house?.blockNumber ?? "-";
  const existingForCitizen = authByCitizen.get(c.id);

  // Officers (and the demo warga) already have accounts from the seed script: list them, don't touch them.
  if (existingForCitizen && !existingForCitizen.user_metadata?.autoWargaAccount) {
    usedEmails.add(existingForCitizen.email);
    rows.push({
      citizen: c,
      houseBlock,
      email: existingForCitizen.email,
      password: OFFICER_DEMO_PASSWORD,
      role: existingForCitizen.user_metadata?.role ?? "ANGGOTA",
      note: "Akun pengurus/demo (password bersama)",
    });
    kept++;
    continue;
  }

  const blockSlug = houseBlock.replace(/^Blok\s*/i, "").replace(/[^A-Za-z0-9]/g, "").toLowerCase();
  let email = existingForCitizen?.email ?? `${slugify(c.fullName)}.${blockSlug}@${EMAIL_DOMAIN}`;
  for (let n = 2; usedEmails.has(email) && !existingForCitizen; n++) email = `${slugify(c.fullName)}.${blockSlug}${n}@${EMAIL_DOMAIN}`;
  usedEmails.add(email);

  const password = knownPasswords.get(email) ?? makePassword();
  const metadata = {
    fullName: c.fullName,
    phone: c.phone,
    role: "ANGGOTA",
    communityId: COMMUNITY_ID,
    communityName: community.name,
    communitySlug: community.slug,
    planTier: community.planTier,
    isTenantActive: community.isActive,
    planStatus: community.planStatus,
    houseBlock,
    citizenId: c.id,
    autoWargaAccount: true,
  };

  const existing = existingForCitizen ?? authByEmail.get(email);
  let userId;
  if (existing) {
    const payload = { user_metadata: metadata, email_confirm: true };
    if (!knownPasswords.has(email)) payload.password = password;
    const { error } = await supabase.auth.admin.updateUserById(existing.id, payload);
    if (error) throw new Error(`auth ${email}: ${error.message}`);
    userId = existing.id;
    updated++;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: metadata });
    if (error) throw new Error(`auth ${email}: ${error.message}`);
    userId = data.user.id;
    created++;
  }

  const now = new Date().toISOString();
  const { error: userErr } = await supabase.from("users").upsert(
    {
      id: userId,
      email,
      passwordHash: "SUPABASE_AUTH_MANAGED",
      fullName: c.fullName,
      phone: c.phone ?? "-",
      role: "ANGGOTA",
      communityId: COMMUNITY_ID,
      citizenId: c.id,
      houseBlock,
      createdAt: now,
      updatedAt: now,
    },
    { onConflict: "id" }
  );
  if (userErr) throw new Error(`users ${email}: ${userErr.message}`);

  rows.push({ citizen: c, houseBlock, email, password, role: "ANGGOTA", note: "" });
  process.stdout.write(".");
}

// ---------- Write credential document ----------
rows.sort((a, b) => a.houseBlock.localeCompare(b.houseBlock, "id", { numeric: true }) || a.citizen.id.localeCompare(b.citizen.id));
const ROLE_LABEL = { KETUA: "Ketua RT", SEKRETARIS: "Sekretaris", BENDAHARA: "Bendahara", HUMAS: "Humas", TENANT_ADMIN: "Admin", ANGGOTA: "Warga" };
const FAMILY_ROLE = { KEPALA_KELUARGA: "Kepala Keluarga", ISTRI: "Istri", ANAK: "Anak", FAMILI_LAIN: "Famili Lain" };
const header = ["No", "Nama Lengkap", "Blok Rumah", "Status Keluarga", "Jabatan", "No HP", "Email", "Password", "Catatan"];
const lines = [
  "sep=,",
  header.join(","),
  ...rows.map((r, i) =>
    [
      i + 1,
      r.citizen.fullName,
      r.houseBlock,
      FAMILY_ROLE[r.citizen.role] ?? r.citizen.role,
      ROLE_LABEL[r.role] ?? r.role,
      // ="0812..." keeps the leading zero when opened in Excel.
      r.citizen.phone ? `="${r.citizen.phone}"` : "",
      r.email,
      r.password,
      r.note,
    ].map(csvCell).join(",")
  ),
];
// BOM so Excel opens it as UTF-8.
writeFileSync(csvPath, "﻿" + lines.join("\r\n") + "\r\n", "utf8");

console.log(`\n\nKomunitas: ${community.name} (${COMMUNITY_ID})`);
console.log(`Akun baru: ${created} · diperbarui: ${updated} · akun pengurus/demo dicantumkan: ${kept} · total: ${rows.length}`);
console.log(`Dokumen kredensial: ${csvPath}`);
