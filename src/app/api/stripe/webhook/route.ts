import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getStripe, planForPriceId } from "@/lib/stripe";

export const runtime = "nodejs";

const iso = (unixSeconds: number) => new Date(unixSeconds * 1000).toISOString();

/** Achat à l'unité : ajoute autant de crédits de live que la quantité payée. */
async function grantCredits(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return;
  const userId = session.client_reference_id ?? session.metadata?.user_id;
  if (!userId) {
    console.error("webhook: achat sans utilisateur", session.id);
    return;
  }

  const items = await getStripe().checkout.sessions.listLineItems(session.id, { limit: 10 });
  const quantity = items.data
    .filter((i) => i.price && planForPriceId(i.price.id) === "live")
    .reduce((sum, i) => sum + (i.quantity ?? 0), 0);
  if (quantity <= 0) return;

  const rows = Array.from({ length: quantity }, (_, unit_index) => ({
    user_id: userId,
    source: "purchase",
    stripe_session_id: session.id,
    unit_index,
  }));

  // Idempotent : Stripe peut renvoyer le même événement plusieurs fois.
  const { error } = await getSupabaseAdmin()
    .from("live_credits")
    .upsert(rows, { onConflict: "stripe_session_id,unit_index", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

/** Abonnement : recopie l'état Stripe (offre, statut, dates de période) dans Supabase. */
async function syncSubscription(sub: Stripe.Subscription) {
  const item = sub.items.data[0];
  if (!item) return;

  const plan = planForPriceId(item.price.id);
  if (plan !== "monthly" && plan !== "annual") {
    console.warn("webhook: abonnement avec un prix inconnu", sub.id, item.price.id);
    return;
  }

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const admin = getSupabaseAdmin();

  let userId: string | null = sub.metadata?.user_id ?? null;
  if (!userId) {
    const { data } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .limit(1)
      .maybeSingle();
    userId = data?.user_id ?? null;
  }
  if (!userId) {
    console.error("webhook: abonnement sans utilisateur", sub.id);
    return;
  }

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      plan,
      status: sub.status,
      current_period_start: iso(item.current_period_start),
      current_period_end: iso(item.current_period_end),
      cancel_at_period_end: sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
  if (error) throw new Error(error.message);
}

async function handle(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "payment") {
        await grantCredits(session);
      } else if (session.mode === "subscription" && session.subscription) {
        const id = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        await syncSubscription(await getStripe().subscriptions.retrieve(id));
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;
    default:
      break;
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Webhook non configuré." }, { status: 503 });
  }
  if (!signature) {
    return NextResponse.json({ error: "Signature manquante." }, { status: 400 });
  }

  // Le corps brut est nécessaire pour vérifier la signature.
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  try {
    await handle(event);
  } catch (err) {
    console.error("webhook", event.type, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Traitement impossible." }, { status: 500 }); // Stripe réessaiera
  }
  return NextResponse.json({ received: true });
}
