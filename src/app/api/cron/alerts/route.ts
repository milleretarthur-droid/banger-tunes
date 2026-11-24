import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { escapeHtml, sendEmail, siteUrl } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HORIZON_HOURS = 30;
const dateFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

type LiveRow = { id: string; title: string; dj_id: string; scheduled_at: string };

/**
 * Tâche planifiée (Vercel Cron, une fois par jour) : prévient par email les personnes
 * abonnées (sans compte) à un DJ ou un magasin dont un live démarre dans les prochaines 30 heures.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET non configuré." }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Clé service_role manquante." }, { status: 503 });
  if (!process.env.RESEND_API_KEY || !process.env.ALERT_FROM_EMAIL) {
    return NextResponse.json({ skipped: "RESEND_API_KEY ou ALERT_FROM_EMAIL manquant : aucun email envoyé." });
  }

  try {
    const sb = getSupabaseAdmin();
    const now = new Date();
    const horizon = new Date(now.getTime() + HORIZON_HOURS * 3_600_000);

    const { data: livesRaw, error: livesErr } = await sb
      .from("lives")
      .select("id,title,dj_id,scheduled_at")
      .eq("status", "a_venir")
      .gte("scheduled_at", now.toISOString())
      .lte("scheduled_at", horizon.toISOString());
    if (livesErr) throw livesErr;

    const { data: djs } = await sb.from("djs").select("id,name,suspended");
    const djById = new Map((djs ?? []).map((d) => [d.id as string, d as { id: string; name: string; suspended: boolean }]));
    const lives = ((livesRaw ?? []) as LiveRow[]).filter((l) => !djById.get(l.dj_id)?.suspended);
    if (lives.length === 0) return NextResponse.json({ sent: 0, lives: 0 });

    const liveIds = lives.map((l) => l.id);
    const { data: subsRaw, error: subErr } = await sb
      .from("subscribers")
      .select("id,email,token,dj_id")
      .not("confirmed_at", "is", null)
      .in("dj_id", [...new Set(lives.map((l) => l.dj_id))]);
    if (subErr) throw subErr;
    const subs = (subsRaw ?? []) as { id: string; email: string; token: string; dj_id: string }[];
    if (subs.length === 0) return NextResponse.json({ sent: 0, lives: lives.length });

    const { data: logged } = await sb.from("subscriber_alert_log").select("subscriber_id,live_id").in("live_id", liveIds);
    const alreadySent = new Set((logged ?? []).map((l) => `${l.subscriber_id}:${l.live_id}`));

    // Un seul email par adresse, avec tous les lives concernés et un lien de désinscription par créateur.
    type Item = { subId: string; token: string; live: LiveRow };
    const perEmail = new Map<string, Item[]>();
    for (const s of subs) {
      for (const l of lives.filter((x) => x.dj_id === s.dj_id)) {
        if (alreadySent.has(`${s.id}:${l.id}`)) continue;
        const list = perEmail.get(s.email) ?? [];
        list.push({ subId: s.id, token: s.token, live: l });
        perEmail.set(s.email, list);
      }
    }

    const base = siteUrl();
    let sent = 0;
    let failed = 0;
    for (const [to, items] of perEmail) {
      items.sort((a, b) => a.live.scheduled_at.localeCompare(b.live.scheduled_at));
      const lines = items.map((i) => ({
        who: djById.get(i.live.dj_id)?.name ?? "Un DJ",
        title: i.live.title,
        when: dateFmt.format(new Date(i.live.scheduled_at)),
        url: `${base}/live/${i.live.id}`,
        stop: `${base}/api/unsubscribe?t=${i.token}`,
      }));
      const subject = lines.length === 1 ? `${lines[0].who} passe en live : ${lines[0].title}` : `${lines.length} lives à venir sur Banger Tunes`;
      const text =
        `Bonjour,\n\n${lines.map((l) => `• ${l.who} — ${l.title}\n  ${l.when}\n  ${l.url}\n  Ne plus recevoir d'alertes de ${l.who} : ${l.stop}`).join("\n\n")}\n`;
      const html =
        `<p>Bonjour,</p><ul>${lines
          .map(
            (l) =>
              `<li><strong>${escapeHtml(l.who)}</strong> — ${escapeHtml(l.title)}<br>${escapeHtml(l.when)}<br><a href="${l.url}">Voir le live</a>` +
              `<br><small><a href="${l.stop}" style="color:#777">Ne plus recevoir d'alertes de ${escapeHtml(l.who)}</a></small></li>`,
          )
          .join("")}</ul>`;

      if (await sendEmail({ to, subject, html, text })) {
        sent++;
        await sb.from("subscriber_alert_log").upsert(
          items.map((i) => ({ subscriber_id: i.subId, live_id: i.live.id })),
          { onConflict: "subscriber_id,live_id", ignoreDuplicates: true },
        );
      } else {
        failed++;
      }
    }
    return NextResponse.json({ sent, failed, lives: lives.length });
  } catch (err) {
    console.error("cron alerts", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Envoi impossible." }, { status: 500 });
  }
}
