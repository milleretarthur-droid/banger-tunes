import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { sendEmail, siteUrl } from "@/lib/email";
import {
  DEFAULTS, TEMPLATE_META, buttonBlock, isTemplateKey, loadTemplate, renderEmail,
  type Template, type TemplateKey,
} from "@/lib/email-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bad = (msg: string) => NextResponse.json({ error: msg }, { status: 400 });

/** Exemple d'email avec des valeurs fictives (aperçu et envoi de test). */
function sample(key: TemplateKey, t: Template) {
  const meta = TEMPLATE_META[key];
  const base = siteUrl();
  if (key === "subscribe_confirm") {
    return renderEmail(t, meta.sample, { button: buttonBlock(t.button_label || "Confirmer mes alertes", `${base}/api/subscribe/confirm?t=exemple`) });
  }
  const li = `<ul><li><strong>Léa Vinyle</strong> — Sunset Disco Session<br>samedi 28 novembre, 20:00<br><a href="${base}">Voir le live</a><br><small><a href="${base}" style="color:#777">Ne plus recevoir d'alertes de Léa Vinyle</a></small></li></ul>`;
  const tx = `• Léa Vinyle — Sunset Disco Session\n  samedi 28 novembre, 20:00\n  ${base}\n  Ne plus recevoir d'alertes de Léa Vinyle : ${base}`;
  return renderEmail(t, meta.sample, { lives: { html: li, text: tx } });
}

function readTemplate(body: Record<string, unknown>): Template | string {
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";
  const multi = typeof body.subject_multi === "string" ? body.subject_multi.trim() : "";
  const button = typeof body.button_label === "string" ? body.button_label.trim() : "";
  if (!subject || subject.length > 200) return "L'objet est obligatoire (200 caractères maximum).";
  if (!text || text.length > 5000) return "Le message est obligatoire (5 000 caractères maximum).";
  if (multi.length > 200) return "L'objet (plusieurs lives) est trop long.";
  if (button.length > 60) return "Le texte du bouton est trop long (60 caractères).";
  return { subject, body: text, subject_multi: multi || null, button_label: button || null };
}

/** Liste des emails modifiables, avec leur texte actuel et leur texte d'origine. */
export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (ctx instanceof NextResponse) return ctx;
  const { sb } = ctx;
  const { data, error } = await sb.from("email_templates").select("key,subject,subject_multi,body,button_label");
  const tableMissing = Boolean(error);
  const saved = new Map((data ?? []).map((r) => [r.key as string, r as Template]));
  const templates = (Object.keys(TEMPLATE_META) as TemplateKey[]).map((key) => ({
    key,
    ...TEMPLATE_META[key],
    sample: undefined,
    current: saved.get(key) ?? DEFAULTS[key],
    customized: saved.has(key),
    defaults: DEFAULTS[key],
  }));
  return NextResponse.json({ templates, tableMissing });
}

/** action = save | reset | preview | test */
export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (ctx instanceof NextResponse) return ctx;
  const { sb, user } = ctx;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !isTemplateKey(body.key)) return bad("Email inconnu.");
  const key = body.key;

  try {
    if (body.action === "reset") {
      const { error } = await sb.from("email_templates").delete().eq("key", key);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }
    if (body.action === "save" || body.action === "preview" || body.action === "test") {
      const t = readTemplate(body);
      if (typeof t === "string") return bad(t);
      if (body.action === "save") {
        const { error } = await sb.from("email_templates").upsert({ key, ...t, updated_at: new Date().toISOString() });
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
      const mail = sample(key, t);
      if (body.action === "preview") return NextResponse.json(mail);
      if (!user.email) return bad("Ton compte n'a pas d'adresse email.");
      const ok = await sendEmail({ to: user.email, ...mail, subject: `[TEST] ${mail.subject}` });
      if (!ok) return NextResponse.json({ error: "L'envoi a échoué. Vérifie RESEND_API_KEY et ALERT_FROM_EMAIL dans Vercel." }, { status: 502 });
      return NextResponse.json({ ok: true, to: user.email });
    }
    return bad("Action inconnue.");
  } catch (err) {
    console.error("admin email-templates", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Enregistrement impossible. As-tu lancé le SQL du lot 16 dans Supabase ?" }, { status: 500 });
  }
}
