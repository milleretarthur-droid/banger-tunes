import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-server";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bad = (msg: string) => NextResponse.json({ error: msg }, { status: 400 });

/** Actions d'administration : suspendre un compte, offrir des lives, supprimer ou clore un live, résilier un abonnement. */
export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if (ctx instanceof NextResponse) return ctx;
  const { sb, user } = ctx;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.type !== "string") return bad("Action manquante.");

  try {
    switch (body.type) {
      case "suspend": {
        if (typeof body.djId !== "string" || !UUID.test(body.djId) || typeof body.value !== "boolean") return bad("Paramètres invalides.");
        const { error } = await sb.from("djs").update({ suspended: body.value }).eq("id", body.djId);
        if (error) throw error;
        break;
      }
      case "setKind": {
        if (typeof body.djId !== "string" || !UUID.test(body.djId) || (body.kind !== "dj" && body.kind !== "store")) return bad("Paramètres invalides.");
        const { error } = await sb.from("djs").update({ kind: body.kind }).eq("id", body.djId);
        if (error) throw error;
        break;
      }
      case "grant": {
        const count = Number(body.count);
        if (typeof body.userId !== "string" || !UUID.test(body.userId) || !Number.isInteger(count) || count < 1 || count > 50) {
          return bad("Choisis un compte et un nombre de lives entre 1 et 50.");
        }
        const { data: found, error: findErr } = await sb.auth.admin.getUserById(body.userId);
        if (findErr || !found.user) return bad("Compte introuvable.");
        const rows = Array.from({ length: count }, () => ({ user_id: body.userId as string, source: "admin_grant" }));
        const { error } = await sb.from("live_credits").insert(rows);
        if (error) throw error;
        break;
      }
      case "deleteLive": {
        if (typeof body.liveId !== "string" || !UUID.test(body.liveId)) return bad("Paramètres invalides.");
        const { error } = await sb.from("lives").delete().eq("id", body.liveId);
        if (error) throw error;
        break;
      }
      case "endLive": {
        if (typeof body.liveId !== "string" || !UUID.test(body.liveId)) return bad("Paramètres invalides.");
        const { error } = await sb.from("lives").update({ status: "termine" }).eq("id", body.liveId);
        if (error) throw error;
        break;
      }
      case "cancelSub": {
        if (typeof body.subscriptionId !== "string" || !/^sub_[A-Za-z0-9]+$/.test(body.subscriptionId)) return bad("Paramètres invalides.");
        if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Stripe n'est pas configuré." }, { status: 503 });
        await getStripe().subscriptions.update(body.subscriptionId, { cancel_at_period_end: true });
        break;
      }
      default:
        return bad("Action inconnue.");
    }
    console.info("admin action", body.type, "par", user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin action", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Action impossible." }, { status: 500 });
  }
}
