import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLive, getTracks } from "@/lib/data";
import LiveView from "./LiveView";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const live = await getLive(id);
  if (!live) return { title: "Live introuvable" };
  return { title: live.dj ? `${live.title} — ${live.dj.name}` : live.title };
}

export default async function LivePage({ params }: Props) {
  const { id } = await params;
  const live = await getLive(id);
  if (!live) notFound();

  const { dj, ...liveRow } = live;
  const tracks = await getTracks(id);

  return <LiveView initialLive={liveRow} dj={dj} initialTracks={tracks} />;
}
