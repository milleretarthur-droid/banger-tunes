import { notFound } from "next/navigation";
import { getLive, getTracks } from "@/lib/data";
import LiveView from "@/app/live/[id]/LiveView";
import LiveOverlay from "@/components/LiveOverlay";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

/** Clic sur un live depuis l'accueil, l'explorateur… : le live s'ouvre en overlay par-dessus la page. */
export default async function LiveModal({ params }: Props) {
  const { id } = await params;
  const live = await getLive(id);
  if (!live) notFound();

  const { dj, ...liveRow } = live;
  const tracks = await getTracks(id);

  return (
    <LiveOverlay liveId={id}>
      <LiveView initialLive={liveRow} dj={dj} initialTracks={tracks} />
    </LiveOverlay>
  );
}
