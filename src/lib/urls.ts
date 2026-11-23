/** Les liens saisis par les DJ ne sont affichés que s'ils sont en https. */
export function safeHttpsUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const u = new URL(value.trim());
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Idem, et le lien doit pointer vers discogs.com. */
export function safeDiscogsUrl(value?: string | null): string | null {
  const url = safeHttpsUrl(value);
  if (!url) return null;
  const host = new URL(url).hostname;
  return host === "discogs.com" || host.endsWith(".discogs.com") ? url : null;
}
