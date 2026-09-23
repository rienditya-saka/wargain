import { NextResponse } from "next/server";
import { loadCommunityCitizens } from "@/lib/sosial/server";

// GET ?communityId&q -> quick resident search for pengurus adding participants
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const communityId = searchParams.get("communityId");
    const q = (searchParams.get("q") ?? "").trim().toLowerCase();
    if (!communityId) return NextResponse.json({ error: "communityId wajib disertakan." }, { status: 400 });
    const citizens = await loadCommunityCitizens(communityId);
    const result = citizens
      .filter((c) => !q || c.fullName.toLowerCase().includes(q) || (c.houseBlock ?? "").toLowerCase().includes(q))
      .sort((a, b) => (a.houseBlock ?? "").localeCompare(b.houseBlock ?? "", "id", { numeric: true }) || a.fullName.localeCompare(b.fullName))
      .slice(0, 30);
    return NextResponse.json({ citizens: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
