import Link from "next/link";
import type { Mix } from "@/lib/types";
import { PLATFORM_LABEL } from "@/lib/mixes";
import { safeImageUrl } from "@/lib/images";

export function MixCard({ mix, djName }: { mix: Mix; djName?: string }) {
  const cover = safeImageUrl(mix.cover_url);
  return (
    <Link href={`/mix/${mix.slug}`} className="card mix-card">
      <div className="card-art">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="card-cover" src={cover} alt="" loading="lazy" />
        ) : (
          <span className="record-disc" aria-hidden />
        )}
        <span className="card-tag tag-soon">Mix · {PLATFORM_LABEL[mix.platform]}</span>
      </div>
      <div className="card-body">
        <div className="card-title">{mix.title}</div>
        {djName && <div className="card-sub">{djName}</div>}
      </div>
    </Link>
  );
}
