import type { SupabaseClient } from "@supabase/supabase-js";
import { escapeHtml } from "./email";

export type TemplateKey = "subscribe_confirm" | "live_alert";
export type Template = { subject: string; subject_multi: string | null; body: string; button_label: string | null };

export const TEMPLATE_META: Record<
  TemplateKey,
  { label: string; when: string; vars: [string, string][]; blocks: string[]; hasMulti: boolean; hasButton: boolean; sample: Record<string, string> }
> = {
  subscribe_confirm: {
    label: "Confirmation d'alertes",
    when: "Envoyé quand quelqu'un clique sur « Être prévenu » : il doit confirmer son adresse.",
    vars: [["dj_name", "Nom du DJ ou du magasin"]],
    blocks: ["button"],
    hasMulti: false,
    hasButton: true,
    sample: { dj_name: "Léa Vinyle" },
  },
  live_alert: {
    label: "Alerte de live",
    when: "Envoyé chaque matin aux personnes abonnées quand un live démarre dans les 30 heures.",
    vars: [
      ["dj_name", "Nom du DJ (du premier live)"],
      ["live_title", "Titre du live (du premier live)"],
      ["count", "Nombre de lives dans l'email"],
    ],
    blocks: ["lives"],
    hasMulti: true,
    hasButton: false,
    sample: { dj_name: "Léa Vinyle", live_title: "Sunset Disco Session", count: "1" },
  },
};

export const DEFAULTS: Record<TemplateKey, Template> = {
  subscribe_confirm: {
    subject: "Confirme tes alertes pour {{dj_name}}",
    subject_multi: null,
    body:
      "Bonjour,\n\nTu as demandé à être prévenu quand {{dj_name}} passe en live sur Banger Tunes.\n\n{{button}}\n\n" +
      "Si ce n'est pas toi, ignore simplement cet email : rien ne sera activé.",
    button_label: "Confirmer mes alertes",
  },
  live_alert: {
    subject: "{{dj_name}} passe en live : {{live_title}}",
    subject_multi: "{{count}} lives à venir sur Banger Tunes",
    body: "Bonjour,\n\n{{lives}}",
    button_label: null,
  },
};

export function isTemplateKey(v: unknown): v is TemplateKey {
  return v === "subscribe_confirm" || v === "live_alert";
}

/** Texte enregistré dans l'administration, sinon texte d'origine (aussi si la table n'existe pas encore). */
export async function loadTemplate(sb: SupabaseClient, key: TemplateKey): Promise<Template> {
  try {
    const { data } = await sb.from("email_templates").select("subject,subject_multi,body,button_label").eq("key", key).maybeSingle();
    if (data) return data as Template;
  } catch {
    /* repli sur le texte d'origine */
  }
  return DEFAULTS[key];
}

type Vars = Record<string, string>;
const STRONG = new Set(["dj_name", "live_title"]);
type Block = { html: string; text: string };

const fillText = (s: string, vars: Vars) => s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? "");
const fillHtml = (s: string, vars: Vars) =>
  escapeHtml(s).replace(/\{\{(\w+)\}\}/g, (_, k: string) => {
    const v = escapeHtml(vars[k] ?? "");
    return STRONG.has(k) && v ? `<strong>${v}</strong>` : v;
  });

export function buttonBlock(label: string, url: string): Block {
  return {
    html: `<p><a href="${escapeHtml(url)}" style="background:#ff3b24;color:#1a0803;padding:12px 20px;text-decoration:none;font-weight:600;border-radius:2px;display:inline-block">${escapeHtml(label)}</a></p>`,
    text: `${label} : ${url}`,
  };
}

/**
 * Fabrique l'email : paragraphes séparés par une ligne vide, variables {{nom}} remplacées (et protégées),
 * et blocs spéciaux ({{button}}, {{lives}}) insérés là où le texte les place (à la fin s'ils sont absents).
 */
export function renderEmail(
  t: Template,
  vars: Vars,
  blocks: Record<string, Block>,
  opts: { multi?: boolean } = {},
): { subject: string; html: string; text: string } {
  const subjectSrc = opts.multi && t.subject_multi ? t.subject_multi : t.subject;
  const subject = fillText(subjectSrc, vars).replace(/\s+/g, " ").trim().slice(0, 200) || "Banger Tunes";
  const used = new Set<string>();
  const html: string[] = [];
  const text: string[] = [];
  for (const raw of t.body.replace(/\r\n/g, "\n").split(/\n{2,}/)) {
    const p = raw.trim();
    if (!p) continue;
    const m = /^\{\{(\w+)\}\}$/.exec(p);
    if (m && blocks[m[1]]) {
      used.add(m[1]);
      html.push(blocks[m[1]].html);
      text.push(blocks[m[1]].text);
      continue;
    }
    html.push(`<p>${fillHtml(p, vars).replace(/\n/g, "<br>")}</p>`);
    text.push(fillText(p, vars));
  }
  for (const [k, b] of Object.entries(blocks)) {
    if (!used.has(k)) {
      html.push(b.html);
      text.push(b.text);
    }
  }
  return { subject, html: html.join(""), text: text.join("\n\n") + "\n" };
}
