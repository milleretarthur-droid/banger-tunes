import Link from "next/link";
import type { LiveWithDj } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { safeImageUrl } from "@/lib/images";

export function LiveCard({ live }: { live: LiveWithDj }) {
  const cover = safeImageUrl(live.cover_url);
  return (
    <Link href={`/live/${live.id}`} className="card">
      <div className="card-art">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="card-cover" src={cover} alt="" loading="lazy" />
        )}
        {live.status === "en_cours" && <span className="card-tag tag-live">Live</span>}
        {live.status === "a_venir" && (
          <span className="card-tag tag-soon">{formatDate(live.scheduled_at)}</span>
        )}
        {live.status === "termine" && <span className="card-tag tag-soon">Replay</span>}
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
