import type { Lang } from "./lang";

const locale = (lang: Lang) => (lang === "en" ? "en-GB" : "fr-FR");

export function formatDate(iso?: string | null, lang: Lang = "fr"): string {
  if (!iso) return lang === "en" ? "Date to be announced" : "Date à venir";
  return new Intl.DateTimeFormat(locale(lang), {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

export function formatPrice(value?: number | null, lang: Lang = "fr"): string | null {
  return value == null
    ? null
    : new Intl.NumberFormat(locale(lang), { style: "currency", currency: "EUR" }).format(value);
}
