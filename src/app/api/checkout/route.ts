import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getUserFromRequest } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getStripe, isPlan, priceIdFor } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { plan?: unknown };
  if (!isPlan(body.plan)) {
    return NextResponse.json({ error: "Offre inconnue." }, { status: 400 });
  }
  const plan = body.plan;

  const price = priceIdFor(plan);
  if (!price || !process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Le paiement n'est pas encore configuré." }, { status: 503 });
  }

  try {
    const admin = getSupabaseAdmin();

    // Un seul abonnement actif à la fois : on évite de facturer deux fois.
    const { data: subs } = await admin
      .from("subscriptions")
      .select("stripe_customer_id, status")
      .eq("user_id", user.id);
    const hasActiveSub = (subs ?? []).some((s) => ["active", "trialing", "past_due"].includes(s.status));
    if (plan !== "live" && hasActiveSub) {
      return NextResponse.json(
        { error: "Tu as déjà un abonnement. Gère-le depuis ton espace créateur." },
        { status: 409 },
      );
    }
    const customerId = (subs ?? []).find((s) => s.stripe_customer_id)?.stripe_customer_id ?? null;

    const origin = req.nextUrl.origin;
    const common: Stripe.Checkout.SessionCreateParams = {
      client_reference_id: user.id,
      metadata: { user_id: user.id },
      success_url: `${origin}/regie?paiement=ok`,
      cancel_url: `${origin}/tarifs?paiement=annule`,
      locale: "fr",
      allow_promotion_codes: true,
      ...(customerId ? { customer: customerId } : { customer_email: user.email ?? undefined }),
    };

    const stripe = getStripe();
    const session =
      plan === "live"
        ? await stripe.checkout.sessions.create({
            ...common,
            mode: "payment",
            line_items: [
              {
                price,
                quantity: 1,
                adjustable_quantity: { enabled: true, minimum: 1, maximum: 10 },
              },
            ],
            invoice_creation: { enabled: true },
          })
        : await stripe.checkout.sessions.create({
            ...common,
            mode: "subscription",
            line_items: [{ price, quantity: 1 }],
            subscription_data: { metadata: { user_id: user.id } },
          });

    if (!session.url) throw new Error("Session de paiement sans adresse");
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("checkout", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Impossible de démarrer le paiement." }, { status: 500 });
  }
}
