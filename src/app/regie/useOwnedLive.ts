"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import type { Dj, Live } from "@/lib/types";

export type OwnedLiveState = "loading" | "ok" | "missing" | "forbidden";

/** Charge un live par son adresse (slug) et vérifie qu'il appartient au compte connecté. */
export function useOwnedLive(slug: string) {
  const { session, ready } = useSession();
  const [live, setLive] = useState<Live | null>(null);
  const [dj, setDj] = useState<Dj | null>(null);
  const [state, setState] = useState<OwnedLiveState>("loading");
  const userId = session?.user.id ?? null;

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !userId) return;
    let cancelled = false;
    (async () => {
      const { data: d } = await sb.from("djs").select("*").eq("user_id", userId).maybeSingle();
      const { data: l } = await sb.from("lives").select("*").eq("slug", slug).maybeSingle();
      if (cancelled) return;
      if (!l) return setState("missing");
      if (!d || (l as Live).dj_id !== (d as Dj).id) return setState("forbidden");
      setDj(d as Dj);
      setLive(l as Live);
      setState("ok");
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, userId]);

  return { session, ready, live, setLive, dj, state };
}
