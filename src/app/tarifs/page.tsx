import type { Metadata } from "next";
import { PRICING, eur } from "@/lib/pricing";
import CheckoutButton from "./CheckoutButton";
import CreatorGate from "@/components/CreatorGate";
import { getLang, getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const en = (await getLang()) === "en";
  return {
    title: en ? "Plans and pricing" : "Tarifs",
    robots: { index: false, follow: false },
    description: en
      ? "Publish your lives on Banger Tunes: per live, monthly or yearly. Same prices for DJs and record shops."
      : "Publie tes lives sur Banger Tunes : au live, au mois ou à l'année. Mêmes tarifs pour les DJ et les magasins de vinyles.",
  };
}

export default async function TarifsPage() {
  const { lang, t } = await getT();
  const annualPerMonth = PRICING.annualCents / 12;
  const annualSaving = PRICING.monthlyCents * 12 - PRICING.annualCents;

  return (
    <CreatorGate next="/tarifs" what={t("Offres et tarifs", "Plans and pricing")}>
    <div className="section">
      <div className="section-head">
        <h1 className="display" style={{ fontSize: "clamp(36px, 6vw, 64px)" }}>
          {t("Tarifs", "Pricing")}
        </h1>
      </div>
      <p className="muted pricing-intro">
        {t("Écouter les lives est gratuit. Pour en publier, choisis ton offre : les tarifs sont les mêmes pour les DJ et les magasins de vinyles.", "Listening to lives is free. To publish your own, choose a plan: prices are the same for DJs and record shops.")}{" "}
        <strong>{t("Ton premier live est offert.", "Your first live is free.")}</strong>
      </p>

      <div className="pricing-grid">
        <section className="price-card">
          <h2 className="price-name">{t("Au live", "Per live")}</h2>
          <p className="price-amount display">{eur(PRICING.liveCents, lang)}</p>
          <p className="price-unit">{t("par live", "per live")}</p>
          <ul className="price-list">
            <li>{t("Tu paies uniquement quand tu en as besoin", "You only pay when you need it")}</li>
            <li>{t("Jusqu'à 10 lives dans le même paiement", "Up to 10 lives in a single payment")}</li>
            <li>{t("Les lives achetés n'expirent pas", "Purchased lives never expire")}</li>
          </ul>
          <CheckoutButton plan="live" label={t("Acheter un live", "Buy a live")} />
        </section>

        <section className="price-card">
          <h2 className="price-name">{t("Mensuel", "Monthly")}</h2>
          <p className="price-amount display">{eur(PRICING.monthlyCents, lang)}</p>
          <p className="price-unit">{t("par mois", "per month")}</p>
          <ul className="price-list">
            <li>{PRICING.monthlyLives} {t("lives par mois", "lives per month")}</li>
            <li>{t("Résiliable à tout moment", "Cancel at any time")}</li>
            <li>{t("Le quota repart à zéro à chaque renouvellement", "The quota resets at every renewal")}</li>
          </ul>
          <CheckoutButton plan="monthly" label={t("S'abonner au mois", "Subscribe monthly")} />
        </section>

        <section className="price-card price-card-featured">
          <p className="price-badge">−5 %</p>
          <h2 className="price-name">{t("Annuel", "Yearly")}</h2>
          <p className="price-amount display">{eur(PRICING.annualCents, lang)}</p>
          <p className="price-unit">{t("par an, soit", "per year, i.e.")} {eur(annualPerMonth, lang)} {t("par mois", "per month")}</p>
          <ul className="price-list">
            <li>{t("Lives illimités", "Unlimited lives")}</li>
            <li>{eur(annualSaving, lang)} {t("d'économie par rapport à 12 mois d'abonnement mensuel", "saved compared with 12 months of monthly subscription")}</li>
            <li>{t("Résiliable à tout moment, valable jusqu'à la fin de la période payée", "Cancel at any time, valid until the end of the paid period")}</li>
          </ul>
          <CheckoutButton plan="annual" label={t("S'abonner à l'année", "Subscribe yearly")} highlight />
        </section>
      </div>

      <p className="muted pricing-foot">
        {t("Paiement sécurisé par Stripe.", "Secure payment by Stripe.")}
      </p>
    </div>
    </CreatorGate>
  );
}
