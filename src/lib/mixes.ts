import type { MixPlatform } from "./types";

export const PLATFORM_LABEL: Record<MixPlatform, string> = { youtube: "YouTube", mixcloud: "Mixcloud", soundcloud: "SoundCloud" };

const YT_ID = /^[\w-]{11}$/;

/**
 * Reconnaît un lien de mix Mixcloud, SoundCloud ou YouTube et renvoie son adresse « propre ».
 * Renvoie null si le lien n'est pas pris en charge (les liens courts on.soundcloud.com ne le sont pas).
 */
export function parseMixUrl(input: string): { platform: MixPlatform; url: string } | null {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^(www|m)\./, "");
  const parts = u.pathname.split("/").filter(Boolean);

  if (host === "youtu.be" || host === "youtube.com") {
    let id: string | null = null;
    if (host === "youtu.be") id = parts[0] ?? null;
    else if (u.pathname === "/watch") id = u.searchParams.get("v");
    else if (["live", "embed", "shorts"].includes(parts[0] ?? "")) id = parts[1] ?? null;
    return id && YT_ID.test(id) ? { platform: "youtube", url: `https://www.youtube.com/watch?v=${id}` } : null;
  }
  if (host === "mixcloud.com") {
    // /utilisateur/nom-du-mix/
    if (parts.length !== 2 || !parts.every((p) => /^[\w%.-]+$/.test(p))) return null;
    return { platform: "mixcloud", url: `https://www.mixcloud.com/${parts[0]}/${parts[1]}/` };
  }
  if (host === "soundcloud.com") {
    // /utilisateur/titre ou /utilisateur/sets/nom
    const ok = parts.length === 2 || (parts.length === 3 && parts[1] === "sets");
    if (!ok || !parts.every((p) => /^[\w%.-]+$/.test(p))) return null;
    return { platform: "soundcloud", url: `https://soundcloud.com/${parts.join("/")}` };
  }
  return null;
}

/** Adresse d'intégration du lecteur de la plateforme (null si le lien enregistré n'est plus valide). */
export function mixEmbedUrl(platform: MixPlatform, url: string, opts: { start?: number; autoplay?: boolean } = {}): string | null {
  const parsed = parseMixUrl(url);
  if (!parsed || parsed.platform !== platform) return null;
  if (platform === "youtube") {
    const id = new URL(parsed.url).searchParams.get("v");
    let src = `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
    if (opts.start && opts.start > 0) src += `&start=${Math.floor(opts.start)}`;
    if (opts.autoplay) src += "&autoplay=1";
    return src;
  }
  if (platform === "mixcloud") {
    const feed = new URL(parsed.url).pathname;
    return `https://player-widget.mixcloud.com/widget/iframe/?hide_cover=1&light=0&feed=${encodeURIComponent(feed)}`;
  }
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(parsed.url)}&color=%23ff3b24&auto_play=false&hide_related=true&show_comments=false&visual=false`;
}

/** « 12:30 » ou « 1:02:10 » → secondes. Vide → null. Renvoie undefined si le format est invalide. */
export function parseTimestamp(input: string): number | null | undefined {
  const v = input.trim();
  if (!v) return null;
  const m = /^(?:(\d{1,2}):)?(\d{1,3}):(\d{2})$/.exec(v);
  if (!m) return undefined;
  const h = m[1] ? Number(m[1]) : 0;
  const min = Number(m[2]);
  const s = Number(m[3]);
  if (s > 59 || (m[1] && min > 59)) return undefined;
  const total = h * 3600 + min * 60 + s;
  return total <= 86400 ? total : undefined;
}

export function formatTimestamp(seconds: number | null | undefined): string {
  if (seconds == null) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
