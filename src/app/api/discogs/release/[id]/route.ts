import { NextResponse, type NextRequest } from "next/server";
import { DiscogsError, getReleaseMedia } from "@/lib/discogs";
import { clientIp, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";

const STATUS: Record<DiscogsError["code"], number> = { not_configured: 503, not_found: 404, rate_limited: 429, unavailable: 502 };

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (tooManyRequests(clientIp(req))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0 || id > 1_000_000_000) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try {
    return NextResponse.json(await getReleaseMedia(id), { headers: { "Cache-Control": "public, s-maxage=3600" } });
  } catch (e) {
    const code = e instanceof DiscogsError ? e.code : "unavailable";
    return NextResponse.json({ error: code, detail: e instanceof DiscogsError ? e.detail : undefined }, { status: STATUS[code] });
  }
}
