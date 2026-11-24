import type { Metadata } from "next";
import { PRICING, eur } from "@/lib/pricing";
import CheckoutButton from "./CheckoutButton";
import CreatorGate from "@/components/CreatorGate";

export const metadata: Metadata = {
  title: "Tarifs",
  robots: { index: false, follow: false },
  description: "Publie tes lives sur Banger Tunes : au live, au mois ou à l'année. Mêmes tarifs pour les DJ et les magasins de vinyles.",
};

export default function TarifsPage() {
  const annualPerMonth = PRICING.annualCents / 12;
  const annualSaving = PRICING.monthlyCents * 12 - PRICING.annualCents;

  return (
    <CreatorGate next="/tarifs" what="Offres et tarifs">
    <div className="section">
      <div className="section-head">
        <h1 className="display" style={{ fontSize: "clamp(36px, 6vw, 64px)" }}>
          Tarifs
        </h1>
      </div>
      <p className="muted pricing-intro">
        Écouter les lives est gratuit. Pour en publier, choisis ton offre : les tarifs sont les mêmes pour les
        DJ et les magasins de vinyles. <strong>Ton premier live est offert.</strong>
      </p>

      <div className="pricing-grid">
        <section className="price-card">
          <h2 className="price-name">Au live</h2>
          <p className="price-amount display">{eur(PRICING.liveCents)}</p>
          <p className="price-unit">par live</p>
          <ul className="price-list">
            <li>Tu paies uniquement quand tu en as besoin</li>
            <li>Jusqu&apos;à 10 lives dans le même paiement</li>
            <li>Les lives achetés n&apos;expirent pas</li>
          </ul>
          <CheckoutButton plan="live" label="Acheter un live" />
        </section>

        <section className="price-card">
          <h2 className="price-name">Mensuel</h2>
          <p className="price-amount display">{eur(PRICING.monthlyCents)}</p>
          <p className="price-unit">par mois</p>
          <ul className="price-list">
            <li>{PRICING.monthlyLives} lives par mois</li>
            <li>Résiliable à tout moment</li>
            <li>Le quota repart à zéro à chaque renouvellement</li>
          </ul>
          <CheckoutButton plan="monthly" label="S'abonner au mois" />
        </section>

        <section className="price-card price-card-featured">
          <p className="price-badge">−5 %</p>
          <h2 className="price-name">Annuel</h2>
          <p className="price-amount display">{eur(PRICING.annualCents)}</p>
          <p className="price-unit">par an, soit {eur(annualPerMonth)} par mois</p>
          <ul className="price-list">
            <li>Lives illimités</li>
            <li>{eur(annualSaving)} d&apos;économie par rapport à 12 mois d&apos;abonnement mensuel</li>
            <li>Résiliable à tout moment, valable jusqu&apos;à la fin de la période payée</li>
          </ul>
          <CheckoutButton plan="annual" label="S'abonner à l'année" highlight />
        </section>
      </div>

      <p className="muted pricing-foot">
        Paiement sécurisé par Stripe. Les ventes de vinyles se font sur Discogs.
      </p>
    </div>
    </CreatorGate>
  );
}
