const ID = /^[\w-]{11}$/;

/**
 * Transforme n'importe quel lien YouTube (watch, youtu.be, /live/, /embed/)
 * en URL d'intégration. Renvoie null si le lien n'est pas reconnu.
 */
export function youtubeEmbedUrl(
  input?: string | null,
  opts: { start?: number; autoplay?: boolean } = {},
): string | null {
  if (!input) return null;
  try {
    const u = new URL(input.trim());
    let id: string | null = null;

    if (u.hostname === "youtu.be") {
      id = u.pathname.slice(1);
    } else if (u.hostname === "youtube.com" || u.hostname.endsWith(".youtube.com")) {
      if (u.pathname === "/watch") {
        id = u.searchParams.get("v");
      } else {
        id = u.pathname.match(/^\/(?:live|embed|shorts)\/([\w-]{11})/)?.[1] ?? null;
      }
    }

    if (!id || !ID.test(id)) return null;
    let url = `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
    if (opts.start && opts.start > 0) url += `&start=${Math.floor(opts.start)}`;
    if (opts.autoplay) url += "&autoplay=1";
    return url;
  } catch {
    return null;
  }
}
