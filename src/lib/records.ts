import { cache } from "react";
import { getSupabase } from "./supabase";
import { safeHttpsUrl } from "./urls";
import { safeImageUrl } from "./images";

/** Un passage du disque : dans un live (replay compris) ou dans un mix. */
export type RecordPlay = { kind: "live" | "mix"; id: string; href: string; title: string; status: string; djName: string; djSlug: string; playedAt: string };

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

type LiveRow = {
  live_id: string; title: string; artist: string; cover_url: string | null; discogs_url: string | null; played_at: string;
  live: { id: string; title: string; status: string; dj: { name: string; slug: string; suspended: boolean } | null } | null;
};
type MixRow = {
  mix_id: string; title: string; artist: string; cover_url: string | null; discogs_url: string | null;
  mix: { id: string; slug: string; title: string; created_at: string; dj: { name: string; slug: string; suspended: boolean } | null } | null;
};

/**
 * Tous les disques réellement passés (en live avec played_at renseigné, ou présents dans un mix), regroupés par artiste + titre.
 * Les créateurs suspendus sont exclus. Un mix compte à sa date de publication.
 */
export const getPlayedRecords = cache(async (): Promise<PlayedRecord[]> => {
  const sb = getSupabase();
  if (!sb) return [];
  const [liveRes, mixRes] = await Promise.all([
    sb
      .from("tracklist")
      .select("live_id,title,artist,cover_url,discogs_url,played_at,live:lives(id,title,status,dj:djs(name,slug,suspended))")
      .not("played_at", "is", null)
      .order("played_at", { ascending: false })
      .limit(5000),
    sb.from("mix_tracks").select("mix_id,title,artist,cover_url,discogs_url,mix:mixes(id,slug,title,created_at,dj:djs(name,slug,suspended))").limit(5000),
  ]);
  if (liveRes.error) console.error("getPlayedRecords", liveRes.error.message);
  // Avant le SQL du lot 18, la table des mixes n'existe pas : on ignore simplement les mixes.
  const mixRows = mixRes.error ? [] : ((mixRes.data ?? []) as unknown as MixRow[]);

  const plays: { r: { title: string; artist: string; cover_url: string | null; discogs_url: string | null }; play: RecordPlay }[] = [];
  for (const r of (liveRes.data ?? []) as unknown as LiveRow[]) {
    if (!r.live || !r.live.dj || r.live.dj.suspended) continue;
    plays.push({ r, play: { kind: "live", id: r.live.id, href: `/live/${r.live.id}`, title: r.live.title, status: r.live.status, djName: r.live.dj.name, djSlug: r.live.dj.slug, playedAt: r.played_at } });
  }
  for (const r of mixRows) {
    if (!r.mix || !r.mix.dj || r.mix.dj.suspended) continue;
    plays.push({ r, play: { kind: "mix", id: r.mix.id, href: `/mix/${r.mix.slug}`, title: r.mix.title, status: "mix", djName: r.mix.dj.name, djSlug: r.mix.dj.slug, playedAt: r.mix.created_at } });
  }

  const map = new Map<string, PlayedRecord>();
  for (const { r, play } of plays) {
    const key = recordKey(r.artist, r.title);
    if (key === "~") continue;
    const cur = map.get(key);
    if (!cur) {
      map.set(key, {
        key, title: r.title, artist: r.artist, coverUrl: safeImageUrl(r.cover_url), discogsUrl: safeHttpsUrl(r.discogs_url),
        plays: 1, lastPlayedAt: play.playedAt, appearances: [play],
      });
      continue;
    }
    cur.coverUrl ??= safeImageUrl(r.cover_url);
    cur.discogsUrl ??= safeHttpsUrl(r.discogs_url);
    if (play.playedAt > cur.lastPlayedAt) cur.lastPlayedAt = play.playedAt;
    // Un disque rejoué dans le même live ou le même mix ne compte qu'une fois.
    if (!cur.appearances.some((a) => a.kind === play.kind && a.id === play.id)) {
      cur.appearances.push(play);
      cur.plays++;
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
