import { cache } from "react";
import { getSupabase } from "./supabase";
import type { LiveWithDj, Track } from "./types";

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
  return (data ?? []) as LiveWithDj[];
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
  return (data as LiveWithDj | null) ?? null;
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
