import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { discogsConfigured, parseSellerUsername } from "@/lib/discogs";
import Digger from "./Digger";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const u = parseSellerUsername(decodeURIComponent((await params).username));
  return { title: u ? `Le bac de ${u} — écoute en continu` : "Digger" };
}

export default async function BacPage({ params }: Props) {
  const username = parseSellerUsername(decodeURIComponent((await params).username));
  if (!username) notFound();
  return <Digger username={username} configured={discogsConfigured()} />;
}
