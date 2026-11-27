import Link from "next/link";
import type { PlayedRecord } from "@/lib/records";
import type { Lang } from "@/lib/lang";

export function RecordCard({ record, rank, lang = "fr" }: { record: PlayedRecord; rank?: number; lang?: Lang }) {
  const n = record.plays;
  return (
    <Link href={`/disque/${encodeURIComponent(record.key)}`} className="card record-card">
      <div className="card-art card-art-sq">
        {record.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="card-cover" src={record.coverUrl} alt="" loading="lazy" />
        ) : (
          <span className="record-disc" aria-hidden />
        )}
        {rank != null && <span className="card-tag tag-rank">{rank}</span>}
      </div>
      <div className="card-body">
        <div className="card-title">{record.title}</div>
        <div className="card-sub">
          {record.artist} · {lang === "en" ? `${n} play${n > 1 ? "s" : ""}` : `${n} passage${n > 1 ? "s" : ""}`}
        </div>
      </div>
    </Link>
  );
}
