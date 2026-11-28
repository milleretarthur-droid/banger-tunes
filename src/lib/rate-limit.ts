const buckets = new Map<string, { count: number; reset: number }>();

/** Limite simple par adresse IP (en mémoire : suffit contre les abus occasionnels). */
export function tooManyRequests(ip: string, max = 90, windowMs = 60_000): boolean {
  const now = Date.now();
  if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  const b = buckets.get(ip);
  if (!b || b.reset < now) {
    buckets.set(ip, { count: 1, reset: now + windowMs });
    return false;
  }
  b.count++;
  return b.count > max;
}

export function clientIp(req: { headers: Headers }): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
