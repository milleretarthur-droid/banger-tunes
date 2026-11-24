import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getUserFromRequest } from "./auth-server";
import { getSupabaseAdmin } from "./supabase-admin";

export type AdminContext = { user: User; sb: SupabaseClient };

/**
 * Vérifie que l'appelant est administrateur (présent dans la table `admins`).
 * Renvoie le contexte, ou directement la réponse d'erreur à retourner.
 */
export async function requireAdmin(req: Request): Promise<AdminContext | NextResponse> {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Clé service_role non configurée." }, { status: 503 });
  }
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (error) {
    console.error("requireAdmin", error.message);
    return NextResponse.json({ error: "Vérification impossible." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Accès réservé à l'administration." }, { status: 403 });
  return { user, sb };
}
