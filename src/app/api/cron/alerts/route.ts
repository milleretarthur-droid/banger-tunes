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
 * qui suivent un DJ ou un magasin dont un live démarre dans les prochaines 30 heures.
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
    const { data: follows, error: followErr } = await sb.from("follows").select("user_id,dj_id").in("dj_id", [...new Set(lives.map((l) => l.dj_id))]);
    if (followErr) throw followErr;

    const userIds = [...new Set((follows ?? []).map((f) => f.user_id as string))];
    if (userIds.length === 0) return NextResponse.json({ sent: 0, lives: lives.length });

    const [{ data: prefs }, { data: logged }] = await Promise.all([
      sb.from("alert_prefs").select("user_id,email_enabled").in("user_id", userIds),
      sb.from("alert_log").select("user_id,live_id").eq("kind", "reminder").in("live_id", liveIds),
    ]);
    const muted = new Set((prefs ?? []).filter((p) => p.email_enabled === false).map((p) => p.user_id as string));
    const alreadySent = new Set((logged ?? []).map((l) => `${l.user_id}:${l.live_id}`));

    // Un seul email par personne, avec tous les lives concernés.
    const perUser = new Map<string, LiveRow[]>();
    for (const f of follows ?? []) {
      const uid = f.user_id as string;
      if (muted.has(uid)) continue;
      for (const l of lives.filter((x) => x.dj_id === f.dj_id)) {
        if (alreadySent.has(`${uid}:${l.id}`)) continue;
        const list = perUser.get(uid) ?? [];
        if (!list.some((x) => x.id === l.id)) list.push(l);
        perUser.set(uid, list);
      }
    }

    let sent = 0;
    let failed = 0;
    for (const [uid, list] of perUser) {
      const { data: u } = await sb.auth.admin.getUserById(uid);
      const to = u?.user?.email;
      if (!to) continue;
      list.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
      const base = siteUrl();
      const lines = list.map((l) => ({
        who: djById.get(l.dj_id)?.name ?? "Un DJ",
        title: l.title,
        when: dateFmt.format(new Date(l.scheduled_at)),
        url: `${base}/live/${l.id}`,
      }));
      const subject = lines.length === 1 ? `${lines[0].who} passe en live : ${lines[0].title}` : `${lines.length} lives à venir sur Banger Tunes`;
      const text =
        `Bonjour,\n\n${lines.map((l) => `• ${l.who} — ${l.title}\n  ${l.when}\n  ${l.url}`).join("\n\n")}\n\n` +
        `Tu reçois cet email car tu suis ces créateurs. Gérer mes alertes : ${base}/alertes\n`;
      const html =
        `<p>Bonjour,</p><ul>${lines
          .map((l) => `<li><strong>${escapeHtml(l.who)}</strong> — ${escapeHtml(l.title)}<br>${escapeHtml(l.when)}<br><a href="${l.url}">Voir le live</a></li>`)
          .join("")}</ul><p style="color:#777">Tu reçois cet email car tu suis ces créateurs. <a href="${base}/alertes">Gérer mes alertes</a></p>`;

      if (await sendEmail({ to, subject, html, text })) {
        sent++;
        await sb.from("alert_log").upsert(
          list.map((l) => ({ user_id: uid, live_id: l.id, kind: "reminder" })),
          { onConflict: "user_id,live_id,kind", ignoreDuplicates: true },
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
