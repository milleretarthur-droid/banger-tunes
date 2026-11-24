import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { siteUrl } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lien reçu par email : active les alertes puis renvoie vers une page de confirmation. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t") ?? "";
  const back = (statut: string, dj?: string) =>
    NextResponse.redirect(`${siteUrl()}/alertes?statut=${statut}${dj ? `&dj=${encodeURIComponent(dj)}` : ""}`, 303);
  if (!UUID.test(token) || !process.env.SUPABASE_SERVICE_ROLE_KEY) return back("invalide");
  try {
    const sb = getSupabaseAdmin();
    const { data: sub } = await sb.from("subscribers").select("id,dj_id,confirmed_at").eq("token", token).maybeSingle();
    if (!sub) return back("invalide");
    if (!sub.confirmed_at) await sb.from("subscribers").update({ confirmed_at: new Date().toISOString() }).eq("id", sub.id);
    const { data: dj } = await sb.from("djs").select("name").eq("id", sub.dj_id).maybeSingle();
    return back("confirme", dj?.name as string | undefined);
  } catch (err) {
    console.error("confirm", err instanceof Error ? err.message : err);
    return back("invalide");
  }
}
