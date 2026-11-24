import Link from "next/link";

/** Logo « Mot nu » : banger tunes + point rouge (le voyant « live »). */
export default function Logo() {
  return (
    <Link href="/" className="logo" aria-label="Banger Tunes, accueil">
      banger tunes<i className="logo-dot" aria-hidden="true" />
    </Link>
  );
}
