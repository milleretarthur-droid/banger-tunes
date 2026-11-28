import { NextResponse, type NextRequest } from "next/server";
import { DiscogsError, getInventory, parseSellerUsername } from "@/lib/discogs";
import { clientIp, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";

const STATUS: Record<DiscogsError["code"], number> = { not_configured: 503, not_found: 404, rate_limited: 429, unavailable: 502 };

export async function GET(req: NextRequest) {
  if (tooManyRequests(clientIp(req))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const username = parseSellerUsername(req.nextUrl.searchParams.get("username") ?? "");
  if (!username) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try {
    const out = await getInventory(username, Number(req.nextUrl.searchParams.get("page") ?? "1"));
    return NextResponse.json(out, { headers: { "Cache-Control": "public, s-maxage=3600" } });
  } catch (e) {
    const code = e instanceof DiscogsError ? e.code : "unavailable";
    return NextResponse.json({ error: code }, { status: STATUS[code] });
  }
}
