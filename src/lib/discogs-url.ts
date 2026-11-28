// Partie sans dépendance serveur : utilisable aussi dans le navigateur.

/** Accepte « zipomax » ou un lien du type https://www.discogs.com/seller/zipomax/profile. */
export function parseSellerUsername(input: string): string | null {
  const v = input.trim();
  if (!v) return null;
  if (/^[A-Za-z0-9._-]{1,40}$/.test(v)) return v;
  try {
    const u = new URL(v);
    if (!/(^|\.)discogs\.com$/.test(u.hostname)) return null;
    const m = /\/(?:seller|user)\/([A-Za-z0-9._-]{1,40})(?:\/|$)/.exec(u.pathname);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}
