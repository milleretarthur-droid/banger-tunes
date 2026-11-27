import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { formatDate } from "@/lib/format";
import { getPlayedRecords } from "@/lib/records";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

async function find(rawKey: string) {
  const key = decodeURIComponent(rawKey);
  return (await getPlayedRecords()).find((r) => r.key === key) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const r = await find((await params).key);
  return { title: r ? `${r.title} — ${r.artist}` : "Disque" };
}

export default async function RecordPage({ params }: { params: Promise<{ key: string }> }) {
  const { lang, t } = await getT();
  const r = await find((await params).key);
  if (!r) notFound();
  const lives = [...r.appearances].sort((a, b) => b.playedAt.localeCompare(a.playedAt));

  return (
    <div className="record-page">
      <div className="record-head">
        <div className="card-art card-art-sq">
          {r.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="card-cover" src={r.coverUrl} alt="" />
          ) : (
            <span className="record-disc" aria-hidden />
          )}
        </div>
        <div>
          <p className="muted">{t("Disque", "Record")}</p>
          <h1 className="display">{r.title}</h1>
          <p className="muted">{r.artist}</p>
          <p className="muted" style={{ marginTop: 10 }}>
            {t(`Joué dans ${r.plays} live${r.plays > 1 ? "s" : ""}`, `Played in ${r.plays} live${r.plays > 1 ? "s" : ""}`)}
          </p>
        </div>
      </div>

      <h2 className="display" style={{ fontSize: 28, marginBottom: 14 }}>{t("Où l'écouter", "Where it was played")}</h2>
      <div className="record-lives">
        {lives.map((l) => (
          <Link key={l.liveId} href={`/live/${l.liveId}`} className="record-live">
            <div>
              <strong>{l.liveTitle}</strong>
              <span>{l.djName} · {formatDate(l.playedAt, lang)}</span>
            </div>
            <span>{l.liveStatus === "en_cours" ? "Live" : l.liveStatus === "termine" ? "Replay" : ""} →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
