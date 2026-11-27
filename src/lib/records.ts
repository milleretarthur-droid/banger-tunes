import { cache } from "react";
import { getSupabase } from "./supabase";
import { safeHttpsUrl } from "./urls";
import { safeImageUrl } from "./images";

export type RecordPlay = { liveId: string; liveTitle: string; liveStatus: string; djName: string; djSlug: string; playedAt: string };

/** Un disque (même artiste + même titre), tous lives confondus. */
export type PlayedRecord = {
  key: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  discogsUrl: string | null;
  /** Nombre de lives différents où il a été joué. */
  plays: number;
  lastPlayedAt: string;
  appearances: RecordPlay[];
};

/** « Daft Punk » et « daft  punk » (ou « Café » / « Cafe ») désignent le même disque. */
function norm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function recordKey(artist: string, title: string): string {
  return `${norm(artist)}~${norm(title)}`.replace(/ /g, "-");
}

type Row = {
  live_id: string; title: string; artist: string; cover_url: string | null; discogs_url: string | null; played_at: string;
  live: { id: string; title: string; status: string; dj: { name: string; slug: string; suspended: boolean } | null } | null;
};

/**
 * Tous les disques réellement passés en live (played_at renseigné), regroupés par artiste + titre.
 * Les créateurs suspendus sont exclus. Trié du plus récent au plus ancien.
 */
export const getPlayedRecords = cache(async (): Promise<PlayedRecord[]> => {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("tracklist")
    .select("live_id,title,artist,cover_url,discogs_url,played_at,live:lives(id,title,status,dj:djs(name,slug,suspended))")
    .not("played_at", "is", null)
    .order("played_at", { ascending: false })
    .limit(5000);
  if (error) {
    console.error("getPlayedRecords", error.message);
    return [];
  }
  const map = new Map<string, PlayedRecord>();
  for (const r of (data ?? []) as unknown as Row[]) {
    if (!r.live || !r.live.dj || r.live.dj.suspended) continue;
    const key = recordKey(r.artist, r.title);
    if (key === "~") continue;
    const play: RecordPlay = { liveId: r.live.id, liveTitle: r.live.title, liveStatus: r.live.status, djName: r.live.dj.name, djSlug: r.live.dj.slug, playedAt: r.played_at };
    const cur = map.get(key);
    if (!cur) {
      map.set(key, {
        key, title: r.title, artist: r.artist, coverUrl: safeImageUrl(r.cover_url), discogsUrl: safeHttpsUrl(r.discogs_url),
        plays: 1, lastPlayedAt: r.played_at, appearances: [play],
      });
    } else {
      cur.coverUrl ??= safeImageUrl(r.cover_url);
      cur.discogsUrl ??= safeHttpsUrl(r.discogs_url);
      // Un disque rejoué dans le même live ne compte qu'une fois.
      if (!cur.appearances.some((a) => a.liveId === play.liveId)) {
        cur.appearances.push(play);
        cur.plays++;
      }
    }
  }
  return [...map.values()];
});

export function topPlayed(records: PlayedRecord[], n = 20): PlayedRecord[] {
  return [...records].sort((a, b) => b.plays - a.plays || b.lastPlayedAt.localeCompare(a.lastPlayedAt)).slice(0, n);
}

export function recentlyPlayed(records: PlayedRecord[], n = 20): PlayedRecord[] {
  return [...records].sort((a, b) => b.lastPlayedAt.localeCompare(a.lastPlayedAt)).slice(0, n);
}
