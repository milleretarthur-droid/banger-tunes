import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key);

let browserClient: SupabaseClient | null = null;

/**
 * Client Supabase partagé côté navigateur, client jetable côté serveur.
 * Renvoie null tant que les variables d'environnement ne sont pas renseignées.
 */
export function getSupabase(): SupabaseClient | null {
  if (!url || !key) return null;
  if (typeof window === "undefined") {
    return createClient(url, key, { auth: { persistSession: false } });
  }
  browserClient ??= createClient(url, key);
  return browserClient;
}
