"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import { useT } from "@/lib/i18n";

/** Réserve son contenu aux créateurs (DJ et magasins) connectés qui ont un profil. */
export default function CreatorGate({ children, next = "/guide", what = "Guide" }: { children: ReactNode; next?: string; what?: string }) {
  const t = useT();
  const { session, ready } = useSession();
  const router = useRouter();
  const [isCreator, setIsCreator] = useState<boolean | null>(null);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (ready && !session) router.replace(`/connexion?next=${encodeURIComponent(next)}`);
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

  if (!ready || !session || isCreator === null) return <div className="regie"><p className="muted">{t("Chargement…", "Loading…")}</p></div>;
  if (!isCreator) {
    return (
      <div className="regie">
        <h1 className="display">{what} {t("réservé aux créateurs", "reserved for creators")}</h1>
        <p className="muted" style={{ margin: "12px 0 20px" }}>
          {t("Crée ton profil de DJ ou de magasin dans Mon espace pour y accéder.", "Create your DJ or shop profile in My space to access it.")}
        </p>
        <Link href="/regie" className="btn">{t("Aller dans Mon espace", "Go to My space")}</Link>
      </div>
    );
  }
  return <>{children}</>;
}
