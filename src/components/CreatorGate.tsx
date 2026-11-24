"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";

/** Réserve son contenu aux créateurs (DJ et magasins) connectés qui ont un profil. */
export default function CreatorGate({ children }: { children: ReactNode }) {
  const { session, ready } = useSession();
  const router = useRouter();
  const [isCreator, setIsCreator] = useState<boolean | null>(null);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (ready && !session) router.replace("/connexion?next=/guide");
  }, [ready, session, router]);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !userId) return;
    let cancelled = false;
    sb.from("djs")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsCreator(Boolean(data));
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!ready || !session || isCreator === null) return <div className="regie"><p className="muted">Chargement…</p></div>;
  if (!isCreator) {
    return (
      <div className="regie">
        <h1 className="display">Guide réservé aux créateurs</h1>
        <p className="muted" style={{ margin: "12px 0 20px" }}>
          Crée ton profil de DJ ou de magasin dans Mon espace pour accéder au guide pas à pas.
        </p>
        <Link href="/regie" className="btn">Aller dans Mon espace</Link>
      </div>
    );
  }
  return <>{children}</>;
}
