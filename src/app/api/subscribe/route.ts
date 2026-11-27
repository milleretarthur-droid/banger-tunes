import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendEmail, siteUrl } from "@/lib/email";
import { buttonBlock, loadTemplate, renderEmail } from "@/lib/email-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@<>"',;:()\[\]\\]+@[^\s@<>"',;:()\[\]\\]+\.[^\s@<>"',;:()\[\]\\]{2,}$/;
const RESEND_DELAY_MS = 10 * 60_000; // un seul email de confirmation toutes les 10 minutes par abonnement
const MAX_PER_EMAIL_PER_HOUR = 10; // empêche d'utiliser le site pour inonder une boîte mail

const reply = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status });

/**
 * Demande d'alertes sans compte : « Prévenez-moi par email quand ce DJ passe en live ».
 * Double confirmation : un lien est envoyé à l'adresse, rien n'est actif tant qu'il n'est pas cliqué.
 */
export async function POST(req: NextRequest) {
  let body: { djId?: unknown; email?: unknown; website?: unknown };
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: "Requête invalide." });
  }
  // Champ « piège » invisible : seuls les robots le remplissent. On répond comme si tout allait bien.
  if (typeof body.website === "string" && body.website.trim() !== "") return reply(200, { ok: true });

  const djId = typeof body.djId === "string" ? body.djId : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!UUID.test(djId)) return reply(400, { error: "Requête invalide." });
  if (email.length > 254 || !EMAIL.test(email)) return reply(400, { error: "Cette adresse email n'a pas l'air valide." });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return reply(503, { error: "Les alertes ne sont pas encore activées." });
  if (!process.env.RESEND_API_KEY || !process.env.ALERT_FROM_EMAIL) {
    return reply(503, { error: "Les alertes par email ne sont pas encore activées sur ce site." });
  }

  try {
    const sb = getSupabaseAdmin();
    const { data: dj } = await sb.from("djs").select("id,name,suspended").eq("id", djId).maybeSingle();
    if (!dj || dj.suspended) return reply(404, { error: "Profil introuvable." });

    const since = new Date(Date.now() - 3_600_000).toISOString();
    const { count } = await sb.from("subscribers").select("id", { count: "exact", head: true }).eq("email", email).gte("created_at", since);
    if ((count ?? 0) >= MAX_PER_EMAIL_PER_HOUR) return reply(429, { error: "Trop de demandes pour cette adresse, réessaie plus tard." });

    const { data: existing } = await sb.from("subscribers").select("id,token,confirmed_at,confirm_sent_at").eq("email", email).eq("dj_id", djId).maybeSingle();
    // Réponse identique dans tous les cas : on ne révèle pas si une adresse est déjà inscrite.
    if (existing?.confirmed_at) return reply(200, { ok: true });

    let token: string;
    if (existing) {
      if (Date.now() - new Date(existing.confirm_sent_at as string).getTime() < RESEND_DELAY_MS) return reply(200, { ok: true });
      token = existing.token as string;
      await sb.from("subscribers").update({ confirm_sent_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      const { data: created, error } = await sb.from("subscribers").insert({ email, dj_id: djId }).select("token").single();
      if (error) throw error;
      token = created.token as string;
    }

    const url = `${siteUrl()}/api/subscribe/confirm?t=${token}`;
    const name = String(dj.name);
    const tpl = await loadTemplate(sb, "subscribe_confirm");
    const mail = renderEmail(tpl, { dj_name: name }, { button: buttonBlock(tpl.button_label || "Confirmer mes alertes", url) });
    const sent = await sendEmail({ to: email, ...mail });
    if (!sent) return reply(502, { error: "L'email de confirmation n'a pas pu partir. Réessaie dans un instant." });
    return reply(200, { ok: true });
  } catch (err) {
    console.error("subscribe", err instanceof Error ? err.message : err);
    return reply(500, { error: "Inscription impossible pour le moment." });
  }
}
