"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import { PRICING } from "@/lib/pricing";
import { useLang, useT } from "@/lib/i18n";

type Allowance = {
  plan: "monthly" | "annual" | null;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  monthlyRemaining: number;
  credits: number;
};

type Props = {
  userId: string;
  /** Change à chaque création de live pour recharger les compteurs. */
  refreshKey: number;
  onCanPublish: (value: boolean | null) => void;
};


export default function BillingPanel({ userId, refreshKey, onCanPublish }: Props) {
  const lang = useLang();
  const t = useT();
  const dateFmt = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
  const { session } = useSession();
  const [allowance, setAllowance] = useState<Allowance | null>(null);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;

    const { data: subs } = await sb
      .from("subscriptions")
      .select("plan, current_period_start, current_period_end, cancel_at_period_end")
      .eq("user_id", userId)
      .in("status", ["active", "trialing"])
      .order("current_period_end", { ascending: false })
      .limit(1);
    const sub = subs?.[0] as
      | { plan: "monthly" | "annual"; current_period_start: string; current_period_end: string; cancel_at_period_end: boolean }
      | undefined;

    const { count: credits } = await sb
      .from("live_credits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("used_at", null);

    let monthlyRemaining = 0;
    if (sub?.plan === "monthly") {
      const { count: used } = await sb
        .from("live_usage")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("source", "monthly")
        .gte("created_at", sub.current_period_start);
      monthlyRemaining = Math.max(0, PRICING.monthlyLives - (used ?? 0));
    }

    const next: Allowance = {
      plan: sub?.plan ?? null,
      periodEnd: sub?.current_period_end ?? null,
      cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
      monthlyRemaining,
      credits: credits ?? 0,
    };
    setAllowance(next);
    onCanPublish(next.plan === "annual" || next.monthlyRemaining > 0 || next.credits > 0);
  }, [userId, onCanPublish]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  // Après un paiement, l'offre est activée par Stripe quelques secondes plus tard : on réinterroge.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("paiement") !== "ok") return;
    setPaid(true);
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      void load();
      if (tries >= 10) clearInterval(timer);
    }, 3000);
    return () => clearInterval(timer);
  }, [load]);

  async function manage() {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? t(t("Gestion indisponible.", "Management unavailable."), "Management unavailable."));
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gestion indisponible.");
      setBusy(false);
    }
  }

  if (!allowance) return null;

  const renewal = allowance.periodEnd ? dateFmt.format(new Date(allowance.periodEnd)) : null;
  const hasAnything = allowance.plan || allowance.credits > 0;

  return (
    <div className="panel billing">
      {paid && (
        <p className="info" style={{ marginTop: 0, marginBottom: 14 }}>
          {t("Paiement reçu, merci ! Ton offre est activée en quelques secondes.", "Payment received, thank you! Your plan will be active within a few seconds.")}
        </p>
      )}
      <p className="panel-label">{t("Mon offre", "My plan")}</p>

      {allowance.plan === "annual" && (
        <p className="big-line">
          {t("Annuel · lives illimités", "Yearly · unlimited lives")}
          {renewal && (
            <span className="muted">
              {allowance.cancelAtPeriodEnd ? ` · ${t("se termine le", "ends on")} ${renewal}` : ` · ${t("renouvelé le", "renews on")} ${renewal}`}
            </span>
          )}
        </p>
      )}
      {allowance.plan === "monthly" && (
        <p className="big-line">
          {lang === "en"
            ? `Monthly · ${allowance.monthlyRemaining} live${allowance.monthlyRemaining === 1 ? "" : "s"} left out of ${PRICING.monthlyLives}`
            : `Mensuel · ${allowance.monthlyRemaining} live${allowance.monthlyRemaining > 1 ? "s" : ""} restant${allowance.monthlyRemaining > 1 ? "s" : ""} sur ${PRICING.monthlyLives}`}
          {renewal && (
            <span className="muted">
              {allowance.cancelAtPeriodEnd ? ` · ${t("se termine le", "ends on")} ${renewal}` : ` · ${t("renouvelé le", "renews on")} ${renewal}`}
            </span>
          )}
        </p>
      )}
      {allowance.credits > 0 && (
        <p className="big-line">
          {lang === "en"
            ? `${allowance.credits} live${allowance.credits === 1 ? "" : "s"} in reserve`
            : `${allowance.credits} live${allowance.credits > 1 ? "s" : ""} en réserve`}
          <span className="muted"> · {t(allowance.credits > 1 ? "utilisés quand ton abonnement est épuisé" : "utilisé quand ton abonnement est épuisé", "used when your subscription runs out")}</span>
        </p>
      )}
      {!hasAnything && <p className="big-line">{t("Aucun live disponible pour le moment.", "No live available at the moment.")}</p>}

      <div className="control-meta" style={{ marginTop: 14 }}>
        <Link href="/tarifs" className="btn-ghost">
          {hasAnything ? t("Voir les offres", "See plans") : t("Choisir une offre", "Choose a plan")}
        </Link>
        {allowance.plan && (
          <button className="btn-ghost" onClick={manage} disabled={busy}>
            {t("Gérer mon abonnement", "Manage my subscription")}
          </button>
        )}
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
