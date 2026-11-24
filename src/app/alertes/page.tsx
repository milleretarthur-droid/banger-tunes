import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n-server";
import type { T } from "@/lib/lang";

export const metadata: Metadata = {
  title: "Alertes",
  robots: { index: false, follow: false },
};

const MESSAGES: Record<string, { title: (t: T) => string; text: (t: T, dj?: string) => string }> = {
  confirme: {
    title: (t) => t("C'est confirmé", "You're all set"),
    text: (t, dj) => t(`Tu seras prévenu par email quand ${dj ? dj : "ce créateur"} passe en live. Chaque email contient un lien pour te désinscrire.`, `You'll get an email when ${dj ? dj : "this creator"} goes live. Every email contains an unsubscribe link.`),
  },
  desinscrit: { title: (t) => t("Désinscription faite", "Unsubscribed"), text: (t) => t("Tu ne recevras plus d'alertes pour ce créateur.", "You will no longer receive alerts for this creator.") },
  invalide: { title: (t) => t("Lien invalide", "Invalid link"), text: (t) => t("Ce lien n'est plus valide ou a déjà été utilisé.", "This link is no longer valid or has already been used.") },
};

export default async function AlertesPage({ searchParams }: { searchParams: Promise<{ statut?: string; dj?: string }> }) {
  const { statut, dj } = await searchParams;
  const { t } = await getT();
  const m = MESSAGES[statut ?? ""] ?? MESSAGES.invalide;
  return (
    <div className="regie">
      <h1 className="display">{m.title(t)}</h1>
      <p className="muted" style={{ marginBottom: 20 }}>{m.text(t, dj?.slice(0, 80))}</p>
      <Link href="/explorer" className="btn">{t("Explorer les lives", "Explore lives")}</Link>
    </div>
  );
}
