"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";

type Props = { djId: string; djSlug: string; className?: string };

/** Suivre / ne plus suivre un DJ ou un magasin (pour être prévenu de ses lives). */
export default function FollowButton({ djId, djSlug, className = "btn-ghost" }: Props) {
  const { session, ready } = useSession();
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !userId) {
      setFollowing(null);
      return;
    }
    let cancelled = false;
    sb.from("follows")
      .select("dj_id")
      .eq("user_id", userId)
      .eq("dj_id", djId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setFollowing(Boolean(data));
      });
    return () => {
      cancelled = true;
    };
  }, [userId, djId]);

  if (!ready) return null;
  if (!session) {
    return (
      <Link href={`/connexion?next=/dj/${djSlug}`} className={className}>
        + Suivre
      </Link>
    );
  }

  async function toggle() {
    const sb = getSupabase();
    if (!sb || !userId || following === null) return;
    setBusy(true);
    setError(null);
    const { error: err } = following
      ? await sb.from("follows").delete().eq("user_id", userId).eq("dj_id", djId)
      : await sb.from("follows").insert({ user_id: userId, dj_id: djId });
    setBusy(false);
    if (err) return setError("Impossible pour le moment.");
    setFollowing(!following);
  }

  return (
    <>
      <button className={`${className}${following ? " is-following" : ""}`} onClick={toggle} disabled={busy || following === null} aria-pressed={Boolean(following)}>
        {following ? "✓ Suivi" : "+ Suivre"}
      </button>
      {error && <span className="error" style={{ marginLeft: 8 }}>{error}</span>}
    </>
  );
}
