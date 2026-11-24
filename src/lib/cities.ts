export type City = { label: string; name: string; lat: number; lng: number };

type Row = { name: string; admin1?: string; country?: string; latitude: number; longitude: number };

/** Propose des villes (monde entier) à partir de quelques lettres, via l'API gratuite Open-Meteo. */
export async function searchCities(query: string, signal?: AbortSignal): Promise<City[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=fr&format=json`,
    { signal },
  );
  if (!res.ok) return [];
  const json = (await res.json()) as { results?: Row[] };
  const seen = new Set<string>();
  const out: City[] = [];
  for (const r of json.results ?? []) {
    const label = [r.name, r.admin1 && r.admin1 !== r.name ? r.admin1 : null, r.country].filter(Boolean).join(", ");
    if (seen.has(label) || !Number.isFinite(r.latitude) || !Number.isFinite(r.longitude)) continue;
    seen.add(label);
    out.push({ label, name: r.name, lat: r.latitude, lng: r.longitude });
  }
  return out;
}
