const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

const priceFmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

export function formatDate(iso?: string | null): string {
  if (!iso) return "Date à venir";
  return dateFmt.format(new Date(iso));
}

export function formatPrice(value?: number | null): string | null {
  return value == null ? null : priceFmt.format(value);
}
