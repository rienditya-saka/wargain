import { supabaseAdmin } from "@/lib/supabase-admin";

// Server-side view of a community: residents, login accounts and which accounts live in which house.

export interface CitizenRow {
  id: string;
  fullName: string;
  age: number;
  gender: string;
  role: string;
  birthDate: string | null;
  houseId: string | null;
  houseBlock: string | null;
}

export interface UserRow {
  id: string;
  role: string;
  fullName: string;
  citizenId: string | null;
  houseBlock: string | null;
  houseKey: string | null;
}

export interface CommunityContext {
  citizens: CitizenRow[];
  users: UserRow[];
  citizenById: Map<string, CitizenRow>;
  usersByHouse: Map<string, UserRow[]>;
}

export const blockKey = (b?: string | null) => (b ?? "").toUpperCase().replace(/^BLOK\s*/, "").replace(/\s+/g, "");

// Households are matched by house id (via the linked resident). Block text is only a fallback,
// because different house records can share the same block label.
export function houseKeyOf(c: { houseId?: string | null; houseBlock?: string | null } | undefined | null) {
  if (!c) return null;
  if (c.houseId) return `id:${c.houseId}`;
  const b = blockKey(c.houseBlock);
  return b ? `block:${b}` : null;
}

export async function loadCommunityCitizens(communityId: string): Promise<CitizenRow[]> {
  const { data, error } = await supabaseAdmin
    .from("citizens")
    .select("id, fullName, age, gender, role, birthDate, houseId, house:houses(blockNumber)")
    .eq("communityId", communityId);
  if (error) throw new Error(`citizens: ${error.message}`);
  return (data ?? []).map((c: any) => ({
    id: c.id,
    fullName: c.fullName,
    age: c.age,
    gender: c.gender,
    role: c.role,
    birthDate: c.birthDate,
    houseId: c.houseId,
    houseBlock: c.house?.blockNumber ?? null,
  }));
}

export async function loadCommunityContext(communityId: string): Promise<CommunityContext> {
  const [citizens, { data: rawUsers, error }] = await Promise.all([
    loadCommunityCitizens(communityId),
    supabaseAdmin.from("users").select("id, role, fullName, citizenId, houseBlock").eq("communityId", communityId),
  ]);
  if (error) throw new Error(`users: ${error.message}`);
  const citizenById = new Map(citizens.map((c) => [c.id, c]));
  const users: UserRow[] = (rawUsers ?? []).map((u) => {
    const linked = u.citizenId ? citizenById.get(u.citizenId) : undefined;
    return { ...u, houseKey: linked ? houseKeyOf(linked) : houseKeyOf({ houseBlock: u.houseBlock }) };
  });
  const usersByHouse = new Map<string, UserRow[]>();
  users.forEach((u) => {
    if (!u.houseKey) return;
    usersByHouse.set(u.houseKey, [...(usersByHouse.get(u.houseKey) ?? []), u]);
  });
  return { citizens, users, citizenById, usersByHouse };
}

// House key of a registration/record: through its resident when known, else its stored block.
export function recordHouseKey(ctx: CommunityContext, r: { citizenId?: string | null; houseBlock?: string | null }) {
  const c = r.citizenId ? ctx.citizenById.get(r.citizenId) : undefined;
  return c ? houseKeyOf(c) : houseKeyOf({ houseBlock: r.houseBlock });
}
