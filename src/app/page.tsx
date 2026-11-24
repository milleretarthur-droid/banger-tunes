import Link from "next/link";
import { LiveCard } from "@/components/LiveCard";
import { getFeaturedLive, getLives, getTracks } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { safeImageUrl } from "@/lib/images";
import { safeDiscogsUrl } from "@/lib/urls";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function Home() {
  const lives = await getLives();
  const enCours = lives.filter((l) => l.status === "en_cours");
  const aVenir = lives
    .filter((l) => l.status === "a_venir")
    .sort((a, b) => (a.scheduled_at ?? "9999").localeCompare(b.scheduled_at ?? "9999"));
  const termines = lives.filter((l) => l.status === "termine").slice(0, 8);

  // Le live mis à la une par l'administration passe en premier, sinon le premier live en direct.
  const featured = (await getFeaturedLive()) ?? enCours[0] ?? null;
  const featuredCover = safeImageUrl(featured?.cover_url);
  const featuredTrack = featured?.status === "en_cours"
    ? ((await getTracks(featured.id)).find((t) => t.position === featured.current_index) ?? null)
    : null;
  const featuredDiscogs = safeDiscogsUrl(featuredTrack?.discogs_url);

  return (
    <>
      {!isSupabaseConfigured && (
        <div className="notice">
          Supabase n&apos;est pas encore connecté. Renseigne NEXT_PUBLIC_SUPABASE_URL et
          NEXT_PUBLIC_SUPABASE_ANON_KEY (voir le README), puis recharge la page.
        </div>
      )}

      <section className="hero">
        {featuredCover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="hero-cover" src={featuredCover} alt="" />
        )}
        <div className="hero-grid">
          <div>
            {featured ? (
              <>
                <div className="live-badge">
                  {featured.status === "en_cours" && <span className="dot" />}
                  {featured.status === "en_cours"
                    ? "En direct maintenant"
                    : featured.status === "a_venir"
                      ? `À l'affiche · ${formatDate(featured.scheduled_at)}`
                      : "À réécouter · Replay"}
                </div>
                <h1 className="display">{featured.title}</h1>
                <p className="hero-meta">
                  {featured.dj ? `avec ${featured.dj.name}. ` : ""}
                  Chaque disque passé s&apos;affiche à l&apos;écran, en vente sur Discogs.
                </p>
                <Link href={`/live/${featured.id}`} className="btn">
                  {featured.status === "termine" ? "Voir le replay" : "Voir le live"}
                </Link>
              </>
            ) : (
              <>
                <h1 className="display">
                  Le vinyle
                  <br />
                  qui joue
                  <br />
                  se vend.
                </h1>
                <p className="hero-meta">
                  Regarde tes DJ préférés mixer en direct et repère instantanément chaque disque
                  qu&apos;ils passent, en vente sur Discogs.
                </p>
                {aVenir.length > 0 && (
                  <Link href="#a-venir" className="btn">
                    Prochains lives
                  </Link>
                )}
              </>
            )}
          </div>

          {featured && featuredTrack && (
            <div className="vinyl-card">
              <div className="vinyl-disc" aria-hidden />
              <div>
                <div className="vinyl-label">En cours · {featured.dj?.name}</div>
                <div className="vinyl-title">{featuredTrack.title}</div>
                <div className="vinyl-artist">{featuredTrack.artist}</div>
                {featuredDiscogs && (
                  <a
                    className="vinyl-link"
                    href={featuredDiscogs}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Voir sur Discogs →
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {enCours.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 className="display">En ce moment</h2>
          </div>
          <div className="grid">
            {enCours.map((l) => (
              <LiveCard key={l.id} live={l} />
            ))}
          </div>
        </section>
      )}

      <section className="section" id="a-venir">
        <div className="section-head">
          <h2 className="display">À venir</h2>
        </div>
        {aVenir.length > 0 ? (
          <div className="grid">
            {aVenir.map((l) => (
              <LiveCard key={l.id} live={l} />
            ))}
          </div>
        ) : (
          <p className="empty">Aucun live programmé pour le moment.</p>
        )}
      </section>

      {termines.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 className="display">Lives terminés</h2>
          </div>
          <div className="grid">
            {termines.map((l) => (
              <LiveCard key={l.id} live={l} />
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2 className="display">Comment ça marche</h2>
        </div>
        <div className="steps">
          <div className="step">
            <div className="step-num">01</div>
            <h3>Le DJ prépare sa tracklist</h3>
            <p>Chaque disque de son set est relié à sa fiche en vente sur Discogs, avant le live.</p>
          </div>
          <div className="step">
            <div className="step-num">02</div>
            <h3>Il mixe, tu regardes</h3>
            <p>Le live démarre sur YouTube. À chaque nouveau disque, le DJ passe au suivant.</p>
          </div>
          <div className="step">
            <div className="step-num">03</div>
            <h3>Tu repères, tu achètes</h3>
            <p>Le vinyle en cours s&apos;affiche à l&apos;écran avec un lien direct vers sa fiche Discogs.</p>
          </div>
        </div>
      </section>
    </>
  );
}
