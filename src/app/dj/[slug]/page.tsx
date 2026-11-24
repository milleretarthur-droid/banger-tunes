import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FollowButton from "@/components/FollowButton";
import { LiveCard } from "@/components/LiveCard";
import { getDjBySlug, getLivesOfDj } from "@/lib/data";
import { safeImageUrl } from "@/lib/images";
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

  const photo = safeImageUrl(dj.photo_url);

  return (
    <div className="section dj-page">
      <div className="dj-layout">
        <div className="dj-main">
          <p className="panel-label">{dj.kind === "store" ? "Magasin de vinyles" : "DJ"}</p>
          <h1 className="display" style={{ fontSize: "clamp(36px,6vw,64px)" }}>{dj.name}</h1>
          <p className="muted" style={{ margin: "8px 0 16px" }}>
            {[dj.genre, dj.city].filter(Boolean).join(" · ")}
          </p>
          {dj.kind === "store" && dj.address && (
            <p className="muted" style={{ margin: "-8px 0 16px" }}>📍 {dj.address}</p>
          )}
          <div className="control-meta" style={{ marginBottom: 12 }}>
            <FollowButton djId={dj.id} djName={dj.name} className="btn" />
            {discogs && (
              <a className="btn-ghost" href={discogs} target="_blank" rel="noopener noreferrer">
                Boutique Discogs ↗
              </a>
            )}
          </div>

          {enCours.length > 0 && (
            <section className="dj-section">
              <h2 className="display">En direct</h2>
              <div className="grid">{enCours.map((l) => <LiveCard key={l.id} live={l} />)}</div>
            </section>
          )}

          <section className="dj-section">
            <h2 className="display">À venir</h2>
            {aVenir.length > 0 ? (
              <div className="grid">{aVenir.map((l) => <LiveCard key={l.id} live={l} />)}</div>
            ) : (
              <p className="empty">Aucun live programmé. Suis ce profil pour être prévenu.</p>
            )}
          </section>

          <section className="dj-section">
            <h2 className="display">Replays</h2>
            {replays.length > 0 ? (
              <div className="grid">{replays.map((l) => <LiveCard key={l.id} live={l} />)}</div>
            ) : (
              <p className="empty">Les lives terminés apparaîtront ici, à réécouter avec leur tracklist.</p>
            )}
          </section>
        </div>

        <aside className="dj-aside" aria-label="Présentation">
          <div className="about-card">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="about-photo" src={photo} alt={`Visuel de ${dj.name}`} />
            ) : (
              <span className="about-initial" aria-hidden>{dj.name.slice(0, 1).toUpperCase()}</span>
            )}
            <div className="about-text">
              <h2 className="about-title">À propos</h2>
              <p>{dj.bio ?? "Ce profil n'a pas encore de présentation."}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
