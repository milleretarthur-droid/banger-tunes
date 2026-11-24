import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Alertes",
  robots: { index: false, follow: false },
};

const MESSAGES: Record<string, { title: string; text: (dj?: string) => string }> = {
  confirme: {
    title: "C'est confirmé",
    text: (dj) => `Tu seras prévenu par email quand ${dj ? dj : "ce créateur"} passe en live. Chaque email contient un lien pour te désinscrire.`,
  },
  desinscrit: { title: "Désinscription faite", text: () => "Tu ne recevras plus d'alertes pour ce créateur." },
  invalide: { title: "Lien invalide", text: () => "Ce lien n'est plus valide ou a déjà été utilisé." },
};

export default async function AlertesPage({ searchParams }: { searchParams: Promise<{ statut?: string; dj?: string }> }) {
  const { statut, dj } = await searchParams;
  const m = MESSAGES[statut ?? ""] ?? MESSAGES.invalide;
  return (
    <div className="regie">
      <h1 className="display">{m.title}</h1>
      <p className="muted" style={{ marginBottom: 20 }}>{m.text(dj?.slice(0, 80))}</p>
      <Link href="/explorer" className="btn">Explorer les lives</Link>
    </div>
  );
}
