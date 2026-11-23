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

const fmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function eur(cents: number): string {
  return fmt.format(cents / 100);
}
