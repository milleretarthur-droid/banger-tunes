import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FollowButton from "@/components/FollowButton";
import { LiveCard } from "@/components/LiveCard";
import { getDjBySlug, getLivesOfDj } from "@/lib/data";
import { safeDiscogsUrl } from "@/lib/urls";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const dj = await getDjBySlug(slug);
  return { title: dj ? dj.name : "Profil introuvable" };
}

export default async function DjPage({ params }: Props) {
  const { slug } = await params;
  const dj = await getDjBySlug(slug);
  if (!dj) notFound();

  const lives = await getLivesOfDj(dj.id);
  const enCours = lives.filter((l) => l.status === "en_cours");
  const aVenir = lives
    .filter((l) => l.status === "a_venir")
    .sort((a, b) => (a.scheduled_at ?? "9999").localeCompare(b.scheduled_at ?? "9999"));
  const replays = lives.filter((l) => l.status === "termine");
  const discogs = safeDiscogsUrl(dj.discogs_url);

  return (
    <div className="section">
      <p className="panel-label">{dj.kind === "store" ? "Magasin de vinyles" : "DJ"}</p>
      <h1 className="display" style={{ fontSize: "clamp(36px,6vw,64px)" }}>{dj.name}</h1>
      <p className="muted" style={{ margin: "8px 0 16px" }}>
        {[dj.genre, dj.city].filter(Boolean).join(" · ")}
      </p>
      {dj.bio && <p style={{ maxWidth: 640, lineHeight: 1.6, marginBottom: 16 }}>{dj.bio}</p>}
      <div className="control-meta" style={{ marginBottom: 32 }}>
        <FollowButton djId={dj.id} djSlug={dj.slug} className="btn" />
        {discogs && (
          <a className="btn-ghost" href={discogs} target="_blank" rel="noopener noreferrer">
            Boutique Discogs ↗
          </a>
        )}
      </div>

      {enCours.length > 0 && (
        <>
          <h2 className="display">En direct</h2>
          <div className="grid" style={{ marginBottom: 32 }}>{enCours.map((l) => <LiveCard key={l.id} live={l} />)}</div>
        </>
      )}
      <h2 className="display">À venir</h2>
      {aVenir.length > 0 ? (
        <div className="grid" style={{ marginBottom: 32 }}>{aVenir.map((l) => <LiveCard key={l.id} live={l} />)}</div>
      ) : (
        <p className="empty" style={{ marginBottom: 32 }}>Aucun live programmé. Suis ce profil pour être prévenu.</p>
      )}
      {replays.length > 0 && (
        <>
          <h2 className="display">Replays</h2>
          <div className="grid">{replays.map((l) => <LiveCard key={l.id} live={l} />)}</div>
        </>
      )}
    </div>
  );
}
