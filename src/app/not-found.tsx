import Link from "next/link";

export default function NotFound() {
  return (
    <div className="regie">
      <h1 className="display">Page introuvable</h1>
      <p className="muted" style={{ marginBottom: 20 }}>Cette adresse n&apos;existe pas ou n&apos;est plus disponible.</p>
      <Link href="/" className="btn-ghost">← Retour à l&apos;accueil</Link>
    </div>
  );
}
