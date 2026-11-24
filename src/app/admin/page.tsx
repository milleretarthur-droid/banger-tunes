"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import WeeklyChart from "@/components/WeeklyChart";
import { eur, PRICING } from "@/lib/pricing";
import { useSession } from "@/lib/useSession";
import type { Kpis } from "@/lib/kpis";

type Creator = {
  id: string; user_id: string | null; name: string; slug: string; kind: "dj" | "store"; genre: string | null; city: string | null;
  suspended: boolean; created_at: string; email: string | null; lives: number; plan: string | null; credits: number;
};
type AdminLive = { id: string; title: string; slug: string; status: string; scheduled_at: string | null; created_at: string; dj_name: string };
type AdminSub = { user_id: string; stripe_subscription_id: string; plan: string; status: string; current_period_end: string; cancel_at_period_end: boolean; email: string | null };
type Overview = {
  kpis: Kpis; creators: Creator[]; lives: AdminLive[]; subscriptions: AdminSub[];
  pricing: { configured: { stripe: boolean; webhook: boolean; prices: boolean; email: boolean; cron: boolean } };
};
type Tab = "apercu" | "comptes" | "lives" | "offres";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" });
const STATUS = { a_venir: "À venir", en_cours: "En direct", termine: "Terminé" } as Record<string, string>;
const KIND = { dj: "DJ", store: "Magasin" } as const;

export default function AdminPage() {
  const { session, ready } = useSession();
  const [data, setData] = useState<Overview | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "denied" | "error">("loading");
  const [tab, setTab] = useState<Tab>("apercu");
  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | "dj" | "store">("all");
  const [msg, setMsg] = useState<string | null>(null);
  const token = session?.access_token ?? null;

  const load = useCallback(async () => {
    if (!token) return;
    const res = await fetch("/api/admin/overview", { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401 || res.status === 403) return setState("denied");
    if (!res.ok) return setState("error");
    setData((await res.json()) as Overview);
    setState("ok");
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(body: Record<string, unknown>, confirmText?: string) {
    if (!token) return;
    if (confirmText && !window.confirm(confirmText)) return;
    setMsg(null);
    const res = await fetch("/api/admin/action", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const out = (await res.json().catch(() => ({}))) as { error?: string };
    setMsg(res.ok ? "Fait." : (out.error ?? "Action impossible."));
    if (res.ok) await load();
  }

  const creators = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.creators ?? []).filter(
      (c) =>
        (kindFilter === "all" || c.kind === kindFilter) &&
        (!needle || [c.name, c.email, c.city, c.genre].some((v) => v?.toLowerCase().includes(needle))),
    );
  }, [data, q, kindFilter]);

  if (!ready) return <div className="regie muted">Chargement…</div>;
  if (!session) {
    return (
      <div className="regie">
        <h1 className="display">Administration</h1>
        <Link href="/connexion?next=/admin" className="btn">Se connecter</Link>
      </div>
    );
  }
  if (state === "loading") return <div className="regie muted">Chargement…</div>;
  if (state === "denied") {
    return (
      <div className="regie">
        <h1 className="display">Accès réservé</h1>
        <p className="muted">Ce compte n&apos;est pas administrateur.</p>
      </div>
    );
  }
  if (state === "error" || !data) {
    return (
      <div className="regie">
        <h1 className="display">Administration</h1>
        <p className="error">Chargement impossible. Vérifie la clé SUPABASE_SERVICE_ROLE_KEY dans Vercel.</p>
      </div>
    );
  }

  const k = data.kpis;
  const total = (o: { dj: number; store: number; none: number }) => o.dj + o.store + o.none;
  const tabs: [Tab, string][] = [["apercu", "Aperçu"], ["comptes", `Comptes (${data.creators.length})`], ["lives", `Lives (${k.lives.total})`], ["offres", "Offres"]];

  return (
    <div className="admin">
      <h1 className="display">Administration</h1>
      <div className="tabs" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`tab${tab === id ? " is-active" : ""}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {msg && <p className="info" style={{ marginBottom: 16 }}>{msg}</p>}

      {tab === "apercu" && (
        <>
          <h2 className="display">Inscriptions par type de compte</h2>
          <div className="kpi-grid">
            <Kpi label="Comptes créés" value={k.accounts} />
            <Kpi label="DJ" value={k.byKind.dj} accent="gold" />
            <Kpi label="Magasins de vinyles" value={k.byKind.store} accent="red" />
            <Kpi label="Sans profil créateur" value={k.byKind.none} hint="Auditeurs ou inscriptions inachevées" />
            <Kpi label="Inscrits sur 7 jours" value={total(k.signups.last7)} hint={`${k.signups.last7.dj} DJ · ${k.signups.last7.store} magasins · ${k.signups.last7.none} sans profil`} />
            <Kpi label="Inscrits sur 30 jours" value={total(k.signups.last30)} hint={`${k.signups.last30.dj} DJ · ${k.signups.last30.store} magasins · ${k.signups.last30.none} sans profil`} />
          </div>
          <div className="panel"><WeeklyChart data={k.weekly} /></div>

          <h2 className="display">Activité</h2>
          <div className="kpi-grid">
            <Kpi label="Lives créés" value={k.lives.total} hint={`${k.lives.last30} sur 30 jours`} />
            <Kpi label="En direct" value={k.lives.en_cours} accent="red" />
            <Kpi label="À venir" value={k.lives.a_venir} />
            <Kpi label="Terminés (replays)" value={k.lives.termine} />
            <Kpi label="Créateurs ayant fait un live" value={`${k.creators.liveRate} %`} hint={`${k.creators.withLive} sur ${k.withProfile}`} />
            <Kpi label="Créateurs payants" value={`${k.creators.payingRate} %`} hint={`${k.creators.paying} sur ${k.withProfile}`} />
          </div>

          <h2 className="display">Revenus (estimation)</h2>
          <div className="kpi-grid">
            <Kpi label="Revenu mensuel récurrent" value={eur(k.revenue.mrrCents)} hint={`${k.revenue.monthlySubs} mensuels · ${k.revenue.annualSubs} annuels`} />
            <Kpi label="Lives achetés à l'unité" value={k.revenue.purchasedLives} hint={eur(k.revenue.purchasesCents)} />
          </div>
          <p className="hint">Estimation à partir des abonnements actifs et des crédits achetés. Les montants exacts, remboursements et promotions sont dans Stripe.</p>
        </>
      )}

      {tab === "comptes" && (
        <>
          <div className="admin-filters">
            <input className="admin-search" placeholder="Rechercher un nom, un email, une ville…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher" />
            {(["all", "dj", "store"] as const).map((f) => (
              <button key={f} className={`chip${kindFilter === f ? " is-selected" : ""}`} onClick={() => setKindFilter(f)}>
                {f === "all" ? "Tous" : f === "dj" ? "DJ" : "Magasins"}
              </button>
            ))}
          </div>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Nom</th><th>Type</th><th>Email</th><th>Ville</th><th>Lives</th><th>Offre</th><th>Crédits</th><th>Inscrit</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {creators.map((c) => (
                  <tr key={c.id} className={c.suspended ? "is-suspended" : ""}>
                    <td><Link href={`/dj/${c.slug}`} className="link">{c.name}</Link>{c.suspended && <span className="sold-tag" style={{ marginLeft: 8 }}>Suspendu</span>}</td>
                    <td>{KIND[c.kind]}</td>
                    <td>{c.email ?? "—"}</td>
                    <td>{c.city ?? "—"}</td>
                    <td>{c.lives}</td>
                    <td>{c.plan === "annual" ? "Annuel" : c.plan === "monthly" ? "Mensuel" : "—"}</td>
                    <td>{c.credits}</td>
                    <td>{dateFmt.format(new Date(c.created_at))}</td>
                    <td className="row-actions">
                      <button className="btn-ghost" onClick={() => act({ type: "suspend", djId: c.id, value: !c.suspended }, c.suspended ? undefined : `Suspendre « ${c.name} » ? Son profil et ses lives disparaîtront du site.`)}>
                        {c.suspended ? "Réactiver" : "Suspendre"}
                      </button>
                      {c.user_id && (
                        <button className="btn-ghost" onClick={() => {
                          const n = Number(window.prompt(`Combien de lives offrir à « ${c.name} » ? (1 à 50)`, "1"));
                          if (Number.isInteger(n) && n > 0) void act({ type: "grant", userId: c.user_id, count: n });
                        }}>
                          Offrir des lives
                        </button>
                      )}
                      <button className="btn-ghost" onClick={() => act({ type: "setKind", djId: c.id, kind: c.kind === "dj" ? "store" : "dj" }, `Passer « ${c.name} » en ${c.kind === "dj" ? "magasin" : "DJ"} ?`)}>
                        {c.kind === "dj" ? "→ Magasin" : "→ DJ"}
                      </button>
                    </td>
                  </tr>
                ))}
                {creators.length === 0 && <tr><td colSpan={9} className="muted">Aucun résultat.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "lives" && (
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>Live</th><th>Créateur</th><th>Statut</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {data.lives.map((l) => (
                <tr key={l.id}>
                  <td><Link href={`/live/${l.id}`} className="link">{l.title}</Link></td>
                  <td>{l.dj_name}</td>
                  <td><span className={`status-tag status-${l.status}`}>{STATUS[l.status] ?? l.status}</span></td>
                  <td>{l.scheduled_at ? dateFmt.format(new Date(l.scheduled_at)) : "—"}</td>
                  <td className="row-actions">
                    {l.status !== "termine" && (
                      <button className="btn-ghost" onClick={() => act({ type: "endLive", liveId: l.id }, `Terminer « ${l.title} » ?`)}>Clore</button>
                    )}
                    <button className="btn-ghost" onClick={() => act({ type: "deleteLive", liveId: l.id }, `Supprimer définitivement « ${l.title} » et sa tracklist ?`)}>Supprimer</button>
                  </td>
                </tr>
              ))}
              {data.lives.length === 0 && <tr><td colSpan={5} className="muted">Aucun live.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "offres" && (
        <>
          <h2 className="display">Offres en vigueur</h2>
          <div className="table-wrap">
            <table className="admin-table">
              <thead><tr><th>Offre</th><th>Prix</th><th>Contenu</th></tr></thead>
              <tbody>
                <tr><td>Au live</td><td>{eur(PRICING.liveCents)}</td><td>1 live (1 à 10 à l&apos;achat)</td></tr>
                <tr><td>Mensuel</td><td>{eur(PRICING.monthlyCents)} / mois</td><td>{PRICING.monthlyLives} lives par mois</td></tr>
                <tr><td>Annuel</td><td>{eur(PRICING.annualCents)} / an</td><td>Lives illimités</td></tr>
                <tr><td>Premier live</td><td>Offert</td><td>1 par compte</td></tr>
              </tbody>
            </table>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            Les prix se modifient dans Stripe (nouveau prix, puis nouvel identifiant dans Vercel) et dans <code>src/lib/pricing.ts</code> pour l&apos;affichage.
            Pour une promotion, crée un code dans Stripe (<em>Product catalog → Coupons</em>) : le champ « code promo » apparaît automatiquement au paiement.
          </p>

          <h2 className="display">Configuration</h2>
          <div className="panel">
            {([
              ["Stripe (clé secrète)", data.pricing.configured.stripe],
              ["Stripe (webhook)", data.pricing.configured.webhook],
              ["Stripe (3 prix)", data.pricing.configured.prices],
              ["Envoi d'emails d'alerte (RESEND_API_KEY)", data.pricing.configured.email],
              ["Tâche planifiée des alertes (CRON_SECRET)", data.pricing.configured.cron],
            ] as [string, boolean][]).map(([label, on]) => (
              <p key={label} className="big-line">{on ? "✅" : "⚠️"} {label}</p>
            ))}
          </div>

          <h2 className="display">Abonnements ({data.subscriptions.length})</h2>
          <div className="table-wrap">
            <table className="admin-table">
              <thead><tr><th>Email</th><th>Offre</th><th>Statut</th><th>Fin de période</th><th>Actions</th></tr></thead>
              <tbody>
                {data.subscriptions.map((s) => (
                  <tr key={s.stripe_subscription_id}>
                    <td>{s.email ?? "—"}</td>
                    <td>{s.plan === "annual" ? "Annuel" : "Mensuel"}</td>
                    <td>{s.status}{s.cancel_at_period_end ? " · résilié" : ""}</td>
                    <td>{dateFmt.format(new Date(s.current_period_end))}</td>
                    <td className="row-actions">
                      {["active", "trialing"].includes(s.status) && !s.cancel_at_period_end && (
                        <button className="btn-ghost" onClick={() => act({ type: "cancelSub", subscriptionId: s.stripe_subscription_id }, "Résilier cet abonnement à la fin de la période payée ?")}>
                          Résilier en fin de période
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {data.subscriptions.length === 0 && <tr><td colSpan={5} className="muted">Aucun abonnement.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, hint, accent }: { label: string; value: string | number; hint?: string; accent?: "gold" | "red" }) {
  return (
    <div className={`kpi${accent ? ` kpi-${accent}` : ""}`}>
      <p className="kpi-label">{label}</p>
      <p className="kpi-value display">{value}</p>
      {hint && <p className="kpi-hint">{hint}</p>}
    </div>
  );
}
