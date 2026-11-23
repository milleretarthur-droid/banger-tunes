"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

/** Session Supabase du visiteur (null = non connecté). `ready` passe à true une fois la session lue. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setReady(true);
      return;
    }
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, ready };
}

/** N'accepte que les chemins internes (évite les redirections vers un site tiers). */
export function safeNext(value: string | null): string | null {
  if (!value) return null;
  return value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : null;
}
