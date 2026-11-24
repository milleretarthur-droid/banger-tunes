"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import { useT } from "@/lib/i18n";

export default function NavAuth() {
  const t = useT();
  const { session, ready } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !userId) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    sb.from("admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsAdmin(Boolean(data));
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!ready) {
    return (
      <span className="btn-ghost" aria-hidden style={{ visibility: "hidden" }}>
        {t("Connexion", "Log in")}
      </span>
    );
  }
  return session ? (
    <>
      {isAdmin && <Link href="/admin">Admin</Link>}
      <Link href="/regie" className="btn-ghost">
        {t("Mon espace", "My space")}
      </Link>
    </>
  ) : (
    <Link href="/connexion" className="btn-ghost">
      {t("Connexion", "Log in")}
    </Link>
  );
}
