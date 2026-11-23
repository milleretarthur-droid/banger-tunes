import Link from "next/link";
import type { LiveWithDj } from "@/lib/types";
import { formatDate } from "@/lib/format";

export function LiveCard({ live }: { live: LiveWithDj }) {
  return (
    <Link href={`/live/${live.id}`} className="card">
      <div className="card-art">
        {live.status === "en_cours" && <span className="card-tag tag-live">Live</span>}
        {live.status === "a_venir" && (
          <span className="card-tag tag-soon">{formatDate(live.scheduled_at)}</span>
        )}
        {live.status === "termine" && <span className="card-tag tag-soon">Terminé</span>}
      </div>
      <div className="card-body">
        <div className="card-title">{live.dj?.name ?? "DJ"}</div>
        <div className="card-sub">
          {live.title}
          {live.dj?.genre ? ` · ${live.dj.genre}` : ""}
        </div>
      </div>
    </Link>
  );
}
