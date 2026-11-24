/** Transforme un titre en adresse lisible : « Deep house sunset mix » → « deep-house-sunset-mix ». */
export function slugify(value: string, fallback = "live"): string {
  const base = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return base || fallback;
}

export function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}
