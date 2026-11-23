import { createClient, type User } from "@supabase/supabase-js";

/**
 * Identifie l'utilisateur à partir du jeton Supabase envoyé par le navigateur
 * (en-tête "Authorization: Bearer ..."). Le jeton est vérifié auprès de Supabase.
 */
export async function getUserFromRequest(req: Request): Promise<User | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !key) return null;

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.getUser(token);
  return error ? null : data.user;
}
