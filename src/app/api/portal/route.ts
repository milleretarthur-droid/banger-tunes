import { NextResponse, type NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

/** Ouvre le portail Stripe où le créateur change de carte, télécharge ses factures ou résilie. */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }
  if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Le paiement n'est pas encore configuré." }, { status: 503 });
  }

  try {
    const { data } = await getSupabaseAdmin()
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .not("stripe_customer_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data?.stripe_customer_id) {
      return NextResponse.json({ error: "Aucun abonnement à gérer." }, { status: 404 });
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${req.nextUrl.origin}/regie`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("portal", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Impossible d'ouvrir la gestion d'abonnement." }, { status: 500 });
  }
}
