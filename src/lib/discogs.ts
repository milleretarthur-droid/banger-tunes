import { safeHttpsUrl } from "./urls";

/**
 * Lecture (sans écriture) de l'API Discogs : inventaire public d'un vendeur et vidéos des disques.
 * Conditions Discogs : données jamais conservées au-delà de 6 h (cache serveur d'1 h ici),
 * aucune image Discogs utilisée, mention « Data provided by Discogs » affichée par l'écran d'écoute.
 */
const BASE = process.env.DISCOGS_API_BASE || "https://api.discogs.com";
const CACHE_SECONDS = 3600;

export const discogsConfigured = () => Boolean(process.env.DISCOGS_KEY && process.env.DISCOGS_SECRET);

export { parseSellerUsername } from "./discogs-url";

export class DiscogsError extends Error {
  constructor(public code: "not_configured" | "not_found" | "rate_limited" | "unavailable", public detail?: string) {
    super(code);
  }
}

async function get<T>(path: string): Promise<T> {
  if (!discogsConfigured()) throw new DiscogsError("not_configured");
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: {
        Authorization: `Discogs key=${process.env.DISCOGS_KEY!.trim()}, secret=${process.env.DISCOGS_SECRET!.trim()}`,
        "User-Agent": "BangerTunes/1.0 +https://banger-tunes.com",
        Accept: "application/vnd.discogs.v2.discogs+json",
      },
      next: { revalidate: CACHE_SECONDS },
      signal: AbortSignal.timeout(9000),
    });
  } catch (e) {
    const detail = `réseau : ${e instanceof Error ? e.name + " " + e.message : "inconnu"}`.slice(0, 200);
    console.error("[discogs]", path.split("?")[0], detail);
    throw new DiscogsError("unavailable", detail);
  }
  if (res.status === 404) throw new DiscogsError("not_found");
  if (res.status === 429) throw new DiscogsError("rate_limited");
  if (!res.ok) {
    console.error("[discogs]", path.split("?")[0], "HTTP", res.status);
    throw new DiscogsError("unavailable", `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export type BacItem = {
  listingId: number;
  releaseId: number;
  artist: string;
  title: string;
  label: string | null;
  year: number | null;
  format: string | null;
  price: number | null;
  currency: string;
  condition: string | null;
  url: string;
};

type RawListing = {
  id: number;
  status?: string;
  uri?: string;
  condition?: string;
  price?: { value?: number; currency?: string };
  release?: { id?: number; artist?: string; title?: string; label?: string; year?: number; format?: string; description?: string };
};

const str = (v: unknown, max = 200): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export async function getInventory(username: string, page: number): Promise<{ total: number; pages: number; items: BacItem[] }> {
  const p = Math.min(Math.max(1, Math.floor(page) || 1), 200);
  const data = await get<{ pagination?: { items?: number; pages?: number }; listings?: RawListing[] }>(
    `/users/${encodeURIComponent(username)}/inventory?status=${encodeURIComponent("For Sale")}&sort=posted&sort_order=desc&per_page=100&page=${p}`,
  );
  const items: BacItem[] = [];
  for (const l of data.listings ?? []) {
    const r = l.release;
    const url = safeHttpsUrl(l.uri ?? null);
    if (!r || typeof r.id !== "number" || !url || !/(^|\.)discogs\.com$/.test(new URL(url).hostname)) continue;
    if (l.status && l.status !== "For Sale") continue;
    items.push({
      listingId: l.id,
      releaseId: r.id,
      artist: str(r.artist) ?? "—",
      title: str(r.title) ?? str(r.description) ?? "—",
      label: str(r.label, 100),
      year: typeof r.year === "number" && r.year > 1800 ? r.year : null,
      format: str(r.format, 100),
      price: typeof l.price?.value === "number" ? l.price.value : null,
      currency: str(l.price?.currency, 3) ?? "EUR",
      condition: str(l.condition, 60),
      url,
    });
  }
  return { total: data.pagination?.items ?? items.length, pages: data.pagination?.pages ?? 1, items };
}

export type ReleaseMedia = {
  videos: { id: string; title: string }[];
  tracks: { position: string; title: string }[];
  styles: string[];
};

const YT_ID = /^[\w-]{11}$/;

function youtubeId(uri: unknown): string | null {
  if (typeof uri !== "string") return null;
  try {
    const u = new URL(uri);
    const host = u.hostname.replace(/^(www|m)\./, "");
    const id = host === "youtu.be" ? u.pathname.slice(1) : host === "youtube.com" ? u.searchParams.get("v") : null;
    return id && YT_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

export async function getReleaseMedia(releaseId: number): Promise<ReleaseMedia> {
  const d = await get<{
    videos?: { uri?: string; title?: string }[];
    tracklist?: { position?: string; title?: string }[];
    styles?: string[];
  }>(`/releases/${releaseId}`);
  const seen = new Set<string>();
  const videos: ReleaseMedia["videos"] = [];
  for (const v of d.videos ?? []) {
    const id = youtubeId(v.uri);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    videos.push({ id, title: str(v.title, 120) ?? "" });
    if (videos.length >= 12) break;
  }
  return {
    videos,
    tracks: (d.tracklist ?? []).slice(0, 40).map((t) => ({ position: str(t.position, 8) ?? "", title: str(t.title, 120) ?? "" })).filter((t) => t.title),
    styles: (d.styles ?? []).filter((s) => typeof s === "string").slice(0, 6),
  };
}
