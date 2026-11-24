import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { siteUrl } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lien de désinscription présent dans chaque email : supprime l'abonnement en un clic. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t") ?? "";
  const back = (statut: string) => NextResponse.redirect(`${siteUrl()}/alertes?statut=${statut}`, 303);
  if (!UUID.test(token) || !process.env.SUPABASE_SERVICE_ROLE_KEY) return back("invalide");
  try {
    const { error } = await getSupabaseAdmin().from("subscribers").delete().eq("token", token);
    if (error) throw error;
    return back("desinscrit");
  } catch (err) {
    console.error("unsubscribe", err instanceof Error ? err.message : err);
    return back("invalide");
  }
}
