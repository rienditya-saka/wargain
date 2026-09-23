// Copies citizenId / houseBlock from Supabase Auth user_metadata into public.users.
// Usage: node --env-file=.env.local scratch/backfill-user-links.mjs
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const authUsers = [];
for (let page = 1; ; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  authUsers.push(...data.users);
  if (data.users.length < 1000) break;
}

let updated = 0;
for (const u of authUsers) {
  const { citizenId, houseBlock } = u.user_metadata ?? {};
  if (!citizenId && !houseBlock) continue;
  const { error, count } = await supabase
    .from("users")
    .update({ citizenId: citizenId ?? null, houseBlock: houseBlock ?? null }, { count: "exact" })
    .eq("id", u.id);
  if (error) throw new Error(`${u.email}: ${error.message}`);
  updated += count ?? 0;
}
console.log(`users diperbarui: ${updated} dari ${authUsers.length} akun auth`);
