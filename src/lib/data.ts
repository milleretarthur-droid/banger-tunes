import { cache } from "react";
import { getSupabase } from "./supabase";
import type { Dj, LiveWithDj, Track } from "./types";

export const getLives = cache(async (): Promise<LiveWithDj[]> => {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("lives")
    .select("*, dj:djs(*)")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getLives", error.message);
    return [];
  }
  // Les créateurs suspendus par l'administration disparaissent du site.
  return ((data ?? []) as LiveWithDj[]).filter((l) => !l.dj?.suspended);
});

export const getLive = cache(async (id: string): Promise<LiveWithDj | null> => {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("lives")
    .select("*, dj:djs(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("getLive", error.message);
    return null;
  }
  const live = (data as LiveWithDj | null) ?? null;
  return live?.dj?.suspended ? null : live;
});

/** Live choisi par l'administrateur pour l'affiche de l'accueil (null s'il n'y en a pas). */
export const getFeaturedLive = cache(async (): Promise<LiveWithDj | null> => {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from("site_settings").select("featured_live_id").eq("id", true).maybeSingle();
  const id = (data as { featured_live_id: string | null } | null)?.featured_live_id;
  return id ? getLive(id) : null;
});

export async function getTracks(liveId: string): Promise<Track[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("tracklist")
    .select("*")
    .eq("live_id", liveId)
    .order("position", { ascending: true });
  if (error) {
    console.error("getTracks", error.message);
    return [];
  }
  return (data ?? []) as Track[];
}

export const getDjBySlug = cache(async (slug: string): Promise<Dj | null> => {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("djs").select("*").eq("slug", slug).maybeSingle();
  if (error) {
    console.error("getDjBySlug", error.message);
    return null;
  }
  const dj = (data as Dj | null) ?? null;
  return dj?.suspended ? null : dj;
});

export async function getLivesOfDj(djId: string): Promise<LiveWithDj[]> {
  const lives = await getLives();
  return lives.filter((l) => l.dj_id === djId);
}
