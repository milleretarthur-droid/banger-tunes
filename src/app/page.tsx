import Link from "next/link";
import HScroll from "@/components/HScroll";
import { LiveCard } from "@/components/LiveCard";
import { RecordCard } from "@/components/RecordCard";
import { getFeaturedLive, getLives, getTracks } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { getPlayedRecords, recentlyPlayed, topPlayed } from "@/lib/records";
import { safeImageUrl } from "@/lib/images";
import { safeHttpsUrl } from "@/lib/urls";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { lang, t } = await getT();
  const lives = await getLives();
  const enCours = lives.filter((l) => l.status === "en_cours");
  const aVenir = lives
    .filter((l) => l.status === "a_venir")
    .sort((a, b) => (a.scheduled_at ?? "9999").localeCompare(b.scheduled_at ?? "9999"));
  const termines = lives.filter((l) => l.status === "termine").slice(0, 20);

  // Le live mis à la une par l'administration passe en premier, sinon le premier live en direct.
  const featured = (await getFeaturedLive()) ?? enCours[0] ?? null;
  const featuredCover = safeImageUrl(featured?.cover_url);
  const featuredTrack = featured?.status === "en_cours"
    ? ((await getTracks(featured.id)).find((t) => t.position === featured.current_index) ?? null)
    : null;
  const records = await getPlayedRecords();
  const top = topPlayed(records, 20);
  const recent = recentlyPlayed(records, 20);
  const featuredDiscogs = safeHttpsUrl(featuredTrack?.discogs_url);

  return (
    <>
      {!isSupabaseConfigured && (
        <div className="notice">
          {t("Supabase n'est pas encore connecté. Renseigne NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY (voir le README), puis recharge la page.", "Supabase is not connected yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see the README), then reload the page.")}
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
                    ? t("En direct maintenant", "Live now")
                    : featured.status === "a_venir"
                      ? `${t("À l'affiche", "Coming up")} · ${formatDate(featured.scheduled_at, lang)}`
                      : t("À réécouter · Replay", "Listen again · Replay")}
                </div>
                <h1 className="display">{featured.title}</h1>
                <p className="hero-meta">
                  {featured.dj ? `${t("avec", "with")} ${featured.dj.name}. ` : ""}
                  {t("Chaque disque passé s'affiche à l'écran, disponible à l'achat.", "Every record played appears on screen, available to buy.")}
                </p>
                <Link href={`/live/${featured.id}`} className="btn">
                  {featured.status === "termine" ? t("Voir le replay", "Watch the replay") : t("Voir le live", "Watch the live")}
                </Link>
              </>
            ) : (
              <>
                <h1 className="display">
                  {lang === "en" ? (
                    <>The record<br />that plays<br />is for sale.</>
                  ) : (
                    <>Le vinyle<br />qui joue<br />se vend.</>
                  )}
                </h1>
                <p className="hero-meta">
                  {t(
                    "Regarde tes DJ préférés mixer en direct et repère instantanément chaque disque qu'ils passent, disponible à l'achat.",
                    "Watch your favourite DJs mix live and instantly spot every record they play, available to buy.",
                  )}
                </p>
                {aVenir.length > 0 && (
                  <Link href="#a-venir" className="btn">
                    {t("Prochains lives", "Upcoming lives")}
                  </Link>
                )}
              </>
            )}
          </div>

          {featured && featuredTrack && (
            <div className="vinyl-card">
              <div className="vinyl-disc" aria-hidden />
              <div>
                <div className="vinyl-label">{t("En cours", "Now playing")} · {featured.dj?.name}</div>
                <div className="vinyl-title">{featuredTrack.title}</div>
                <div className="vinyl-artist">{featuredTrack.artist}</div>
                {featuredDiscogs && featuredTrack?.sale_mode === "online" && (
                  <a
                    className="vinyl-link"
                    href={featuredDiscogs}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("Acheter", "Buy")} →
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="explore-promo">
          <div>
            <h2 className="display">{t("Explorer", "Explore")}</h2>
            <p className="muted">
              {t(
                "Trouve des lives près de chez toi sur la carte, filtre par ville ou par style, et découvre les DJ et les magasins de vinyles qui passent en direct.",
                "Find lives near you on the map, filter by city or style, and discover the DJs and record shops going live.",
              )}
            </p>
          </div>
          <Link href="/explorer" className="btn">
            {t("Explorer les lives", "Explore lives")} →
          </Link>
        </div>
      </section>

      {enCours.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 className="display">{t("En ce moment", "On now")}</h2>
            <Link href="/explorer?statut=en_cours" className="see-all">{t("Tout afficher", "Show all")}</Link>
          </div>
          <HScroll>
            {enCours.map((l) => (
              <LiveCard key={l.id} live={l} lang={lang} />
            ))}
          </HScroll>
        </section>
      )}

      <section className="section" id="a-venir">
        <div className="section-head">
          <h2 className="display">{t("À venir", "Coming up")}</h2>
          <Link href="/explorer?statut=a_venir" className="see-all">{t("Tout afficher", "Show all")}</Link>
        </div>
        {aVenir.length > 0 ? (
          <HScroll>
            {aVenir.map((l) => (
              <LiveCard key={l.id} live={l} lang={lang} />
            ))}
          </HScroll>
        ) : (
          <p className="empty">{t("Aucun live programmé pour le moment.", "No lives scheduled at the moment.")}</p>
        )}
      </section>

      {termines.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 className="display">{t("Replays", "Replays")}</h2>
            <Link href="/explorer?statut=termine" className="see-all">{t("Tout afficher", "Show all")}</Link>
          </div>
          <HScroll>
            {termines.map((l) => (
              <LiveCard key={l.id} live={l} lang={lang} />
            ))}
          </HScroll>
        </section>
      )}

      {records.length > 0 && (
        <>
          <section className="section">
            <div className="section-head">
              <h2 className="display">{t("Les plus joués", "Most played")}</h2>
            </div>
            <HScroll>
              {top.map((r, i) => (
                <RecordCard key={r.key} record={r} rank={i + 1} lang={lang} />
              ))}
            </HScroll>
          </section>
          <section className="section">
            <div className="section-head">
              <h2 className="display">{t("Derniers disques joués", "Recently played")}</h2>
            </div>
            <HScroll>
              {recent.map((r) => (
                <RecordCard key={r.key} record={r} lang={lang} />
              ))}
            </HScroll>
          </section>
        </>
      )}

      <section className="section">
        <div className="section-head">
          <h2 className="display">{t("Comment ça marche", "How it works")}</h2>
        </div>
        <div className="steps">
          <div className="step">
            <div className="step-num">01</div>
            <h3>{t("Le DJ prépare sa tracklist", "The DJ prepares a tracklist")}</h3>
            <p>{t("Chaque disque de son set est relié à son annonce de vente, avant le live.", "Every record in the set is linked to its sale listing before the live starts.")}</p>
          </div>
          <div className="step">
            <div className="step-num">02</div>
            <h3>{t("Il mixe, tu regardes", "They mix, you watch")}</h3>
            <p>{t("Le live démarre sur YouTube. À chaque nouveau disque, le DJ passe au suivant.", "The live runs on YouTube. With each new record, the DJ moves on to the next one.")}</p>
          </div>
          <div className="step">
            <div className="step-num">03</div>
            <h3>{t("Tu repères, tu achètes", "You spot it, you buy it")}</h3>
            <p>{t("Le vinyle en cours s'affiche à l'écran avec un lien direct pour l'acheter.", "The record playing appears on screen with a direct link to buy it.")}</p>
          </div>
        </div>
      </section>
    </>
  );
}
