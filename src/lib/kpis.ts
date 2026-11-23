import { PRICING } from "./pricing";

export type KpiUser = { id: string; email: string | null; created_at: string; last_sign_in_at?: string | null };
export type KpiDj = {
  id: string;
  user_id: string | null;
  name: string;
  slug: string;
  kind: "dj" | "store";
  genre: string | null;
  city: string | null;
  suspended: boolean;
  created_at: string;
};
export type KpiLive = { id: string; dj_id: string; title: string; slug: string; status: string; scheduled_at: string | null; created_at: string };
export type KpiSub = { user_id: string; stripe_subscription_id: string; plan: "monthly" | "annual"; status: string; current_period_end: string; cancel_at_period_end: boolean };
export type KpiCredit = { user_id: string; source: string; used_at: string | null };

export type WeekPoint = { week: string; dj: number; store: number; none: number };

const DAY = 86_400_000;

/** Lundi (UTC) de la semaine d'une date, au format AAAA-MM-JJ. */
export function weekStart(d: Date): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}

export function computeKpis(input: {
  now: Date;
  users: KpiUser[];
  djs: KpiDj[];
  lives: KpiLive[];
  subs: KpiSub[];
  credits: KpiCredit[];
  weeks?: number;
}) {
  const { now, users, djs, lives, subs, credits } = input;
  const weeks = input.weeks ?? 12;
  const kindByUser = new Map<string, "dj" | "store">();
  for (const d of djs) if (d.user_id) kindByUser.set(d.user_id, d.kind);
  const kindOf = (userId: string) => kindByUser.get(userId) ?? "none";

  const since = (days: number) => new Date(now.getTime() - days * DAY).toISOString();
  const count = (list: KpiUser[], from: string) => {
    const out = { dj: 0, store: 0, none: 0 };
    for (const u of list) if (u.created_at >= from) out[kindOf(u.id)]++;
    return out;
  };

  // Séries hebdomadaires sur les N dernières semaines (la semaine en cours incluse).
  const current = new Date(weekStart(now) + "T00:00:00Z");
  const series: WeekPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    series.push({ week: new Date(current.getTime() - i * 7 * DAY).toISOString().slice(0, 10), dj: 0, store: 0, none: 0 });
  }
  const bucket = new Map(series.map((p) => [p.week, p]));
  for (const u of users) {
    const p = bucket.get(weekStart(new Date(u.created_at)));
    if (p) p[kindOf(u.id)]++;
  }

  const activeSubs = subs.filter((s) => ["active", "trialing"].includes(s.status));
  const purchases = credits.filter((c) => c.source === "purchase");
  const payingUsers = new Set([...activeSubs.map((s) => s.user_id), ...purchases.map((c) => c.user_id)]);
  const livesByDj = new Map<string, number>();
  for (const l of lives) livesByDj.set(l.dj_id, (livesByDj.get(l.dj_id) ?? 0) + 1);
  const creatorsWithLive = djs.filter((d) => (livesByDj.get(d.id) ?? 0) > 0).length;

  const monthly = activeSubs.filter((s) => s.plan === "monthly").length;
  const annual = activeSubs.filter((s) => s.plan === "annual").length;
  const mrrCents = Math.round(monthly * PRICING.monthlyCents + (annual * PRICING.annualCents) / 12);

  return {
    accounts: users.length,
    withProfile: djs.length,
    byKind: {
      dj: djs.filter((d) => d.kind === "dj").length,
      store: djs.filter((d) => d.kind === "store").length,
      none: users.filter((u) => !kindByUser.has(u.id)).length,
    },
    signups: { last7: count(users, since(7)), last30: count(users, since(30)) },
    weekly: series,
    lives: {
      total: lives.length,
      en_cours: lives.filter((l) => l.status === "en_cours").length,
      a_venir: lives.filter((l) => l.status === "a_venir").length,
      termine: lives.filter((l) => l.status === "termine").length,
      last30: lives.filter((l) => l.created_at >= since(30)).length,
    },
    creators: {
      withLive: creatorsWithLive,
      liveRate: djs.length ? Math.round((creatorsWithLive / djs.length) * 100) : 0,
      paying: payingUsers.size,
      payingRate: djs.length ? Math.round((payingUsers.size / djs.length) * 100) : 0,
      suspended: djs.filter((d) => d.suspended).length,
    },
    revenue: {
      monthlySubs: monthly,
      annualSubs: annual,
      purchasedLives: purchases.length,
      mrrCents,
      purchasesCents: purchases.length * PRICING.liveCents,
    },
  };
}

export type Kpis = ReturnType<typeof computeKpis>;
