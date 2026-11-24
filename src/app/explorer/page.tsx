import type { Metadata } from "next";
import { getLives } from "@/lib/data";
import ExplorerView from "./ExplorerView";
import { getLang } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const en = (await getLang()) === "en";
  return {
    title: en ? "Explore lives" : "Explorer les lives",
    description: en
      ? "Search for a style, a DJ or a record shop. Live, upcoming and replayed sets, as a list or on a map."
      : "Cherche un style, un DJ ou un magasin de vinyles. Lives en direct, à venir et replays, sur une liste ou une carte.",
  };
}

export default async function ExplorerPage() {
  const lives = await getLives();
  return <ExplorerView lives={lives} />;
}
