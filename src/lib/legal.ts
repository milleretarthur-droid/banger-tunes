/**
 * Informations légales affichées sur les pages « Mentions légales », « CGU / CGV » et « Confidentialité ».
 * Tout ce qui est entre [crochets] est à compléter : ces passages s'affichent en surbrillance jaune
 * tant qu'ils ne sont pas remplacés. À modifier ICI uniquement.
 */
export const LEGAL = {
  siteName: "Banger Tunes",
  siteUrl: "https://banger-tunes.com",
  contactEmail: "contact@banger-tunes.com",
  /** Date de dernière mise à jour des textes. */
  updatedAt: "27 novembre 2026",
  publisher: {
    name: "[NOM ET PRÉNOM, OU DÉNOMINATION SOCIALE]",
    status: "[STATUT : particulier / entrepreneur individuel / micro-entrepreneur / société (forme et capital)]",
    address: "[ADRESSE POSTALE]",
    registration: "[N° SIRET ou RCS, si applicable]",
    vat: "[N° DE TVA INTRACOMMUNAUTAIRE, ou « TVA non applicable, art. 293 B du CGI »]",
    phone: "[TÉLÉPHONE, si applicable]",
    director: "[NOM DU DIRECTEUR DE LA PUBLICATION]",
  },
  /** Médiateur de la consommation (obligatoire pour les ventes aux consommateurs). */
  mediator: "[NOM ET COORDONNÉES DU MÉDIATEUR DE LA CONSOMMATION]",
  /** Tribunaux compétents à l'égard des professionnels. */
  jurisdiction: "[VILLE DU TRIBUNAL COMPÉTENT, ex. : Nantes]",
  /** Région de la base de données Supabase (visible dans Supabase > Project Settings > General). */
  supabaseRegion: "[RÉGION DU PROJET SUPABASE, ex. : Europe (Irlande)]",
} as const;

export const isTodo = (v: string) => v.startsWith("[");
