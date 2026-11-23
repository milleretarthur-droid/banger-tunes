"use client";

import Link from "next/link";
import { useSession } from "@/lib/useSession";

export default function NavAuth() {
  const { session, ready } = useSession();

  if (!ready) {
    return (
      <span className="btn-ghost" aria-hidden style={{ visibility: "hidden" }}>
        Connexion
      </span>
    );
  }
  return session ? (
    <Link href="/regie" className="btn-ghost">
      Mon espace
    </Link>
  ) : (
    <Link href="/connexion" className="btn-ghost">
      Connexion
    </Link>
  );
}
