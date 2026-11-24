/**
 * Tarifs affichés sur le site. Le montant réellement débité est celui défini dans Stripe :
 * les deux doivent rester identiques (voir README).
 * Mêmes tarifs pour les DJ et les magasins de vinyles.
 */
export const PRICING = {
  liveCents: 500,
  monthlyCents: 1500,
  /** 15 € x 12 mois, moins 5 % */
  annualCents: 17100,
  monthlyLives: 5,
} as const;

export function eur(cents: number, lang: "fr" | "en" = "fr"): string {
  return new Intl.NumberFormat(lang === "en" ? "en-GB" : "fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
