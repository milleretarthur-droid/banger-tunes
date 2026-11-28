import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import FollowButton from "@/components/FollowButton";
import { LiveCard } from "@/components/LiveCard";
import { MixCard } from "@/components/MixCard";
import { parseSellerUsername } from "@/lib/discogs-url";
import { getDjBySlug, getLivesOfDj, getMixesOfDj } from "@/lib/data";
import { safeImageUrl } from "@/lib/images";
import { safeHttpsUrl } from "@/lib/urls";
import { getLang, getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const dj = await getDjBySlug(slug);
  const en = (await getLang()) === "en";
  return { title: dj ? dj.name : en ? "Profile not found" : "Profil introuvable" };
}

export default async function DjPage({ params }: Props) {
  const { slug } = await params;
  const { lang, t } = await getT();
  const dj = await getDjBySlug(slug);
  if (!dj) notFound();

  const lives = await getLivesOfDj(dj.id);
  const mixes = await getMixesOfDj(dj.id);
  const enCours = lives.filter((l) => l.status === "en_cours");
  const aVenir = lives
    .filter((l) => l.status === "a_venir")
    .sort((a, b) => (a.scheduled_at ?? "9999").localeCompare(b.scheduled_at ?? "9999"));
  const replays = lives.filter((l) => l.status === "termine");
  const discogs = safeHttpsUrl(dj.discogs_url);
  const seller = dj.discogs_url ? parseSellerUsername(dj.discogs_url) : null;

  const photo = safeImageUrl(dj.photo_url);

  return (
    <div className="section dj-page">
      <div className="dj-layout">
        <div className="dj-main">
          <p className="panel-label">{dj.kind === "store" ? t("Magasin de vinyles", "Record shop") : "DJ"}</p>
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
                {t("Boutique en ligne", "Online shop")} ↗
              </a>
            )}
            {seller && (
              <Link className="btn-ghost" href={`/bac/${encodeURIComponent(seller)}`}>
                ▶ {t("Écouter le bac", "Listen to the crate")}
              </Link>
            )}
          </div>

          {enCours.length > 0 && (
            <section className="dj-section">
              <h2 className="display">{t("En direct", "Live now")}</h2>
              <div className="grid">{enCours.map((l) => <LiveCard key={l.id} live={l} lang={lang} />)}</div>
            </section>
          )}

          <section className="dj-section">
            <h2 className="display">{t("À venir", "Coming up")}</h2>
            {aVenir.length > 0 ? (
              <div className="grid">{aVenir.map((l) => <LiveCard key={l.id} live={l} lang={lang} />)}</div>
            ) : (
              <p className="empty">{t("Aucun live programmé. Suis ce profil pour être prévenu.", "No lives scheduled. Follow this profile to get notified.")}</p>
            )}
          </section>

          {mixes.length > 0 && (
            <section className="dj-section">
              <h2 className="display">Mixes</h2>
              <div className="grid">{mixes.map((m) => <MixCard key={m.id} mix={m} />)}</div>
            </section>
          )}

          <section className="dj-section">
            <h2 className="display">Replays</h2>
            {replays.length > 0 ? (
              <div className="grid">{replays.map((l) => <LiveCard key={l.id} live={l} lang={lang} />)}</div>
            ) : (
              <p className="empty">{t("Les lives terminés apparaîtront ici, à réécouter avec leur tracklist.", "Past lives will appear here, to replay with their tracklist.")}</p>
            )}
          </section>
        </div>

        <aside className="dj-aside" aria-label={t("Présentation", "About")}>
          <div className="about-card">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="about-photo" src={photo} alt={`${t("Visuel de", "Picture of")} ${dj.name}`} />
            ) : (
              <span className="about-initial" aria-hidden>{dj.name.slice(0, 1).toUpperCase()}</span>
            )}
            <div className="about-text">
              <h2 className="about-title">{t("À propos", "About")}</h2>
              <p>{dj.bio ?? t("Ce profil n'a pas encore de présentation.", "This profile has no introduction yet.")}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
