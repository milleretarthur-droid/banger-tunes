import type { Metadata } from "next";
import { getLives } from "@/lib/data";
import ExplorerView from "./ExplorerView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Explorer les lives",
  description: "Cherche un style, un DJ ou un magasin de vinyles. Lives en direct, à venir et replays, sur une liste ou une carte.",
};

export default async function ExplorerPage() {
  const lives = await getLives();
  return <ExplorerView lives={lives} />;
}
