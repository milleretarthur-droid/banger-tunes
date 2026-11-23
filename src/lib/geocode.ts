export type Place = { lat: number; lng: number; label: string };

/**
 * Trouve les coordonnées d'une ville via OpenStreetMap (Nominatim), depuis le navigateur.
 * Renvoie null si la ville est introuvable ou si le service ne répond pas.
 */
export async function geocodeCity(query: string): Promise<Place | null> {
  const q = query.trim();
  if (!q) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=fr&q=${encodeURIComponent(q)}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { lat: string; lon: string; display_name: string }[];
    const first = rows[0];
    if (!first) return null;
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, label: first.display_name };
  } catch {
    return null;
  }
}
