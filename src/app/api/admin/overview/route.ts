import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { computeKpis, type KpiCredit, type KpiDj, type KpiLive, type KpiSub, type KpiUser } from "@/lib/kpis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tableau de bord administrateur : KPIs, comptes, lives et abonnements. */
export async function GET(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (ctx instanceof NextResponse) return ctx;
  const { sb } = ctx;

  try {
    // Comptes (auth) : pagination par 1 000.
    const users: KpiUser[] = [];
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      users.push(
        ...data.users.map((u) => ({ id: u.id, email: u.email ?? null, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at ?? null })),
      );
      if (data.users.length < 1000) break;
    }

    const [djs, lives, subs, credits, settings] = await Promise.all([
      sb.from("djs").select("id,user_id,name,slug,kind,genre,city,suspended,created_at").order("created_at", { ascending: false }).limit(2000),
      sb.from("lives").select("id,dj_id,title,slug,status,scheduled_at,created_at").order("created_at", { ascending: false }).limit(5000),
      sb.from("subscriptions").select("user_id,stripe_subscription_id,plan,status,current_period_end,cancel_at_period_end").limit(5000),
      sb.from("live_credits").select("user_id,source,used_at").limit(20000),
      sb.from("site_settings").select("featured_live_id").eq("id", true).maybeSingle(),
    ]);
    for (const r of [djs, lives, subs, credits, settings]) if (r.error) throw r.error;

    const djRows = (djs.data ?? []) as KpiDj[];
    const liveRows = (lives.data ?? []) as KpiLive[];
    const subRows = (subs.data ?? []) as KpiSub[];
    const creditRows = (credits.data ?? []) as KpiCredit[];

    const kpis = computeKpis({ now: new Date(), users, djs: djRows, lives: liveRows, subs: subRows, credits: creditRows });

    const emailOf = new Map(users.map((u) => [u.id, u.email]));
    const liveCount = new Map<string, number>();
    for (const l of liveRows) liveCount.set(l.dj_id, (liveCount.get(l.dj_id) ?? 0) + 1);
    const creditsLeft = new Map<string, number>();
    for (const c of creditRows) if (!c.used_at) creditsLeft.set(c.user_id, (creditsLeft.get(c.user_id) ?? 0) + 1);
    const planOf = new Map<string, string>();
    for (const s of subRows) if (["active", "trialing"].includes(s.status)) planOf.set(s.user_id, s.plan);
    const djName = new Map(djRows.map((d) => [d.id, d.name]));

    return NextResponse.json({
      kpis,
      featuredLiveId: (settings.data as { featured_live_id: string | null } | null)?.featured_live_id ?? null,
      creators: djRows.map((d) => ({
        ...d,
        email: d.user_id ? (emailOf.get(d.user_id) ?? null) : null,
        lives: liveCount.get(d.id) ?? 0,
        plan: d.user_id ? (planOf.get(d.user_id) ?? null) : null,
        credits: d.user_id ? (creditsLeft.get(d.user_id) ?? 0) : 0,
      })),
      lives: liveRows.slice(0, 300).map((l) => ({ ...l, dj_name: djName.get(l.dj_id) ?? "?" })),
      subscriptions: subRows.map((s) => ({ ...s, email: emailOf.get(s.user_id) ?? null })),
      pricing: {
        configured: {
          stripe: Boolean(process.env.STRIPE_SECRET_KEY),
          webhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
          prices: Boolean(process.env.STRIPE_PRICE_LIVE && process.env.STRIPE_PRICE_MONTHLY && process.env.STRIPE_PRICE_ANNUAL),
          email: Boolean(process.env.RESEND_API_KEY),
          cron: Boolean(process.env.CRON_SECRET),
        },
      },
    });
  } catch (err) {
    console.error("admin overview", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Chargement impossible." }, { status: 500 });
  }
}
