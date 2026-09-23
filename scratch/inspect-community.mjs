// Usage: node --env-file=.env.local scratch/inspect-community.mjs <communityId>
import { createClient } from "@supabase/supabase-js";

const communityId = process.argv[2];
if (!communityId) throw new Error("communityId wajib");

const supabase = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: community, error } = await supabase.from("communities").select("*").eq("id", communityId).maybeSingle();
if (error) throw error;
console.log("community:", community ? {
  id: community.id, name: community.name, type: community.type, address: community.address,
  urban: community.urban, district: community.district, regency: community.regency, neighborhood: community.neighborhood,
  lat: community.lat, long: community.long, planStatus: community.planStatus, isActive: community.isActive, planTier: community.planTier, slug: community.slug,
} : null);

for (const table of ["houses", "family_cards", "citizens", "users"]) {
  const { count, error: e } = await supabase.from(table).select("id", { count: "exact", head: true }).eq("communityId", communityId);
  console.log(table, e ? e.message : count);
}

const { data: users } = await supabase.from("users").select("id, email, fullName, role").eq("communityId", communityId);
console.log("users:", users);

const { data: sampleHouse } = await supabase.from("houses").select("*").eq("communityId", communityId).limit(2);
console.log("sample houses:", sampleHouse);
