import Stripe from "stripe";

export type Plan = "live" | "monthly" | "annual";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY manquante");
  client ??= new Stripe(key);
  return client;
}

export function priceIdFor(plan: Plan): string | null {
  const id =
    plan === "live"
      ? process.env.STRIPE_PRICE_LIVE
      : plan === "monthly"
        ? process.env.STRIPE_PRICE_MONTHLY
        : process.env.STRIPE_PRICE_ANNUAL;
  return id || null;
}

export function planForPriceId(priceId: string): Plan | null {
  if (priceId === process.env.STRIPE_PRICE_LIVE) return "live";
  if (priceId === process.env.STRIPE_PRICE_MONTHLY) return "monthly";
  if (priceId === process.env.STRIPE_PRICE_ANNUAL) return "annual";
  return null;
}

export function isPlan(value: unknown): value is Plan {
  return value === "live" || value === "monthly" || value === "annual";
}
