import type { SupabaseClient } from "@supabase/supabase-js";
import { safeHttpsUrl } from "@/lib/urls";
import { slugify } from "@/lib/slug";
import type { Dj } from "@/lib/types";
import type { T } from "@/lib/lang";

const frT: T = (fr) => fr;

/** Informations demandées à l'inscription d'un créateur (DJ ou magasin). */
export type CreatorProfile = {
  kind: "dj" | "store";
  name: string;
  genre: string | null;
  address: string | null; // magasins uniquement
  city: string;
  lat: number;
  lng: number;
  discogs_url: string | null;
};

type CityPick = { value: { city: string; lat: number; lng: number } | null; typed: string };

/** Lit et valide le formulaire d'inscription / de création de profil. */
export function parseCreatorForm(form: FormData, pick: CityPick, t: T = frT): { profile: CreatorProfile } | { error: string } {
  const kind = form.get("kind") === "store" ? "store" : "dj";
  const name = String(form.get("name") ?? "").trim();
  const genre = String(form.get("genre") ?? "").trim() || null;
  const address = String(form.get("address") ?? "").trim();
  const discogsRaw = String(form.get("discogs_url") ?? "").trim();

  if (!name) return { error: kind === "store" ? t("Indique le nom de ton magasin.", "Enter your shop name.") : t("Indique ton nom de DJ.", "Enter your DJ name.") };
  if (kind === "store" && address.length < 5) return { error: t("Indique l'adresse du magasin (numéro, rue et code postal).", "Enter the shop address (number, street and postcode).") };
  if (!pick.value) return { error: t("Choisis ta ville dans la liste déroulante : tape quelques lettres puis clique sur la bonne proposition.", "Choose your city from the dropdown: type a few letters, then click the right suggestion.") };
  if (discogsRaw && !safeHttpsUrl(discogsRaw)) return { error: t("Le lien doit être une adresse web en https://…", "The link must be a web address starting with https://…") };

  return {
    profile: {
      kind,
      name: name.slice(0, 80),
      genre: genre ? genre.slice(0, 80) : null,
      address: kind === "store" ? address.slice(0, 200) : null,
      city: pick.value.city,
      lat: pick.value.lat,
      lng: pick.value.lng,
      discogs_url: discogsRaw || null,
    },
  };
}

/** Relit un profil stocké dans les métadonnées du compte (donnée non fiable) : renvoie null s'il est invalide. */
export function sanitizeStoredProfile(raw: unknown): CreatorProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const kind = r.kind === "store" ? "store" : r.kind === "dj" ? "dj" : null;
  const name = str(r.name, 80);
  const city = str(r.city, 120);
  const lat = typeof r.lat === "number" && Math.abs(r.lat) <= 90 ? r.lat : null;
  const lng = typeof r.lng === "number" && Math.abs(r.lng) <= 180 ? r.lng : null;
  if (!kind || !name || !city || lat === null || lng === null) return null;
  const discogs = str(r.discogs_url, 300);
  return {
    kind,
    name,
    genre: str(r.genre, 80) || null,
    address: kind === "store" ? str(r.address, 200) || null : null,
    city,
    lat,
    lng,
    discogs_url: discogs && safeHttpsUrl(discogs) ? discogs : null,
  };
}

/** Crée le profil en base. Le suffixe aléatoire évite les collisions entre deux profils du même nom. */
export async function createCreatorProfile(
  sb: SupabaseClient,
  userId: string,
  p: CreatorProfile,
  t: T = frT,
): Promise<{ dj: Dj } | { error: string }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = `${slugify(p.name, "profil")}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await sb
      .from("djs")
      .insert({ user_id: userId, slug, ...p })
      .select()
      .single();
    if (!error) return { dj: data as Dj };
    if (error.code !== "23505" || error.message.includes("user_id")) return { error: `${t("Création impossible", "Could not create the profile")} : ${error.message}` };
  }
  return { error: t("Création impossible, réessaie dans un instant.", "Could not create the profile, please try again in a moment.") };
}
