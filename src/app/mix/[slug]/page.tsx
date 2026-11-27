import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMixBySlug, getMixTracks } from "@/lib/data";
import MixView from "./MixView";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const mix = await getMixBySlug((await params).slug);
  if (!mix) return { title: "Mix introuvable" };
  return { title: mix.dj ? `${mix.title} — ${mix.dj.name}` : mix.title };
}

export default async function MixPage({ params }: Props) {
  const mix = await getMixBySlug((await params).slug);
  if (!mix) notFound();
  const { dj, ...row } = mix;
  const tracks = await getMixTracks(mix.id);
  return <MixView mix={row} dj={dj} tracks={tracks} />;
}
