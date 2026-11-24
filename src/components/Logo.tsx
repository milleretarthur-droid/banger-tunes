import Link from "next/link";

/** Logo « Sillon » : disque vinyle (sillons, étiquette rouge, anneau or) + nom. */
export default function Logo() {
  return (
    <Link href="/" className="logo" aria-label="Banger Tunes, accueil">
      <svg className="logo-disc" viewBox="0 0 100 100" width="34" height="34" aria-hidden="true">
        <circle cx="50" cy="50" r="49" fill="#17160F" />
        <circle cx="50" cy="50" r="49" fill="none" stroke="#F2EDE3" strokeOpacity="0.4" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="44" fill="none" stroke="#F2EDE3" strokeOpacity="0.14" strokeWidth="0.8" />
        <circle cx="50" cy="50" r="40" fill="none" stroke="#F2EDE3" strokeOpacity="0.14" strokeWidth="0.8" />
        <circle cx="50" cy="50" r="36" fill="none" stroke="#F2EDE3" strokeOpacity="0.14" strokeWidth="0.8" />
        <path d="M50 50 L50 1 A49 49 0 0 1 84.65 15.35 Z" fill="#F2EDE3" fillOpacity="0.08" />
        <path d="M50 50 L50 99 A49 49 0 0 1 15.35 84.65 Z" fill="#F2EDE3" fillOpacity="0.08" />
        <circle cx="50" cy="50" r="19" fill="#FF3B24" />
        <circle cx="50" cy="50" r="19" fill="none" stroke="#E8B94A" strokeWidth="1.2" />
        <circle cx="50" cy="50" r="2.8" fill="#0E0E0C" />
      </svg>
      <span className="logo-text">
        Banger<span>Tunes</span>
      </span>
    </Link>
  );
}
