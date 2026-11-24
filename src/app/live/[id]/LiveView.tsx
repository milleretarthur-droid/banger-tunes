"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import FollowButton from "@/components/FollowButton";
import { getSupabase } from "@/lib/supabase";
import type { Dj, Live, Track } from "@/lib/types";
import { youtubeEmbedUrl } from "@/lib/youtube";
import { safeHttpsUrl } from "@/lib/urls";
import { formatDate, formatPrice } from "@/lib/format";
import CartIcon from "@/components/CartIcon";
import { useLang } from "@/lib/i18n";
import { makeT } from "@/lib/lang";

type Props = {
  initialLive: Live;
  dj: Dj | null;
  initialTracks: Track[];
};

export default function LiveView({ initialLive, dj, initialTracks }: Props) {
  const lang = useLang();
  const t = makeT(lang);
  const [live, setLive] = useState<Live>(initialLive);
  const [tracks, setTracks] = useState<Track[]>(initialTracks);
  const [connected, setConnected] = useState(false);
  const [replayStart, setReplayStart] = useState<number | null>(null);
  const liveId = initialLive.id;

  const refresh = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const [l, tr] = await Promise.all([
      sb.from("lives").select("*").eq("id", liveId).single(),
      sb.from("tracklist").select("*").eq("live_id", liveId).order("position"),
    ]);
    if (l.data) setLive(l.data as Live);
    if (tr.data) setTracks(tr.data as Track[]);
  }, [liveId]);

  // Temps réel : le clic "Next" du DJ arrive ici instantanément.
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    const channel = sb
      .channel(`live-${liveId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lives", filter: `id=eq.${liveId}` },
        (payload) => setLive((prev) => ({ ...prev, ...(payload.new as Live) })),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tracklist", filter: `live_id=eq.${liveId}` },
        () => void refresh(),
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") void refresh();
      });
    return () => {
      void sb.removeChannel(channel);
    };
  }, [liveId, refresh]);

  // Filet de sécurité : si la connexion temps réel tombe, on interroge toutes les 5 s.
  useEffect(() => {
    if (connected) return;
    const timer = setInterval(() => void refresh(), 5000);
    return () => clearInterval(timer);
  }, [connected, refresh]);

  // Live terminé : plus de disque « en cours », toute la tracklist passe dans la liste du replay.
  const current = live.status === "termine" ? null : (tracks.find((x) => x.position === live.current_index) ?? null);
  const currentRank = current ? tracks.findIndex((x) => x.id === current.id) + 1 : 0;

  // Seuls les disques déjà passés sont listés : le disque en cours n'apparaît que dans sa carte,
  // et rejoint la liste dès que le DJ passe au suivant (le live terminé montre tout).
  const played = useMemo(() => {
    const list =
      live.status === "termine"
        ? tracks
        : tracks.filter((x) => live.current_index > 0 && x.position < live.current_index);
    // Live terminé : ordre chronologique pour suivre le replay ; sinon le dernier disque en premier.
    return live.status === "termine" ? list : [...list].reverse();
  }, [tracks, live.status, live.current_index]);

  const isReplay = live.status === "termine";
  const embed = youtubeEmbedUrl(
    live.youtube_url,
    replayStart != null ? { start: replayStart, autoplay: true } : {},
  );

  // Moment de la vidéo où un disque a été lancé (heure de passage − heure de démarrage + décalage).
  function replayOffsetFor(tr: Track): number | null {
    if (!tr.played_at || !live.started_at) return null;
    const secs = (new Date(tr.played_at).getTime() - new Date(live.started_at).getTime()) / 1000 + (live.replay_offset ?? 0);
    return Number.isFinite(secs) ? Math.max(0, Math.round(secs) - 5) : null;
  }
  const cover = safeHttpsUrl(current?.cover_url);
  const price = formatPrice(current?.price, lang);
  const curLink = safeHttpsUrl(current?.discogs_url);

  // Étiquette unique : caddie rouge si à vendre, « Vendu » jaune si vendu, même taille partout.
  function saleTag(tk: Track, link: string | null) {
    if (tk.sale_mode === "unreleased") return <span className="unrel-tag">Unreleased</span>;
    if (tk.sold) return <span className="sold-tag">{t("Vendu", "Sold")}</span>;
    if (tk.sale_mode === "store")
      return dj ? (
        <Link className="store-tag" href={`/dj/${dj.slug}`}>{t("En magasin", "In store")}</Link>
      ) : (
        <span className="store-tag">{t("En magasin", "In store")}</span>
      );
    if (link)
      return (
        <a className="buy-tag" href={link} target="_blank" rel="noopener noreferrer" aria-label={t("Acheter ce disque", "Buy this record")} title={t("Acheter ce disque", "Buy this record")}>
          <CartIcon />
        </a>
      );
    return null;
  }

  return (
    <>
      <header className="live-head">
        {live.status === "en_cours" && (
          <div className="live-badge">
            <span className="dot" />
            {t("En direct", "Live")}
          </div>
        )}
        {live.status === "a_venir" && (
          <span className="status-pill">{t("À venir", "Coming up")} · {formatDate(live.scheduled_at, lang)}</span>
        )}
        {live.status === "termine" && <span className="status-pill">Replay</span>}
        <h1 className="display live-title">{live.title}</h1>
        {dj && (
          <p className="live-dj">
            {t("avec", "with")}{" "}
            <Link href={`/dj/${dj.slug}`}>
              <strong>{dj.name}</strong>
            </Link>
            {dj.genre ? ` · ${dj.genre}` : ""}
            {dj.city ? ` · ${dj.city}` : ""}
          </p>
        )}
        {dj && (
          <div className="live-follow">
            <FollowButton djId={dj.id} djName={dj.name} className="pill-btn" />
          </div>
        )}
      </header>

      <div className="live-layout">
        <div className="player">
          {embed ? (
            <iframe
              key={replayStart ?? "live"}
              src={embed}
              title={`${t("Lecteur YouTube", "YouTube player")} — ${live.title}`}
              allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : (
            <div className="player-empty">{t("La vidéo sera disponible au démarrage du live.", "The video will be available when the live starts.")}</div>
          )}
        </div>

        <aside className="now-panel" aria-live="polite">
          {current ? (
            <>
              <p className="panel-label">
                {t("En cours", "Now playing")} · {t("disque", "record")} {currentRank}/{tracks.length}
              </p>
              <div className="now-body">
                {cover ? (
                  <img className="now-cover" src={cover} alt={`${t("Pochette de", "Cover of")} ${current.title}`} />
                ) : (
                  <div className="vinyl-disc" aria-hidden />
                )}
                <div>
                  <h2 className="now-title">{current.title}</h2>
                  <p className="now-artist">{current.artist}</p>
                  <div className="sale-line">
                    {price && current.sale_mode !== "unreleased" && <span className="now-price">{price}</span>}
                    {saleTag(current, curLink)}
                  </div>
                </div>
              </div>
              {current.sale_mode === "unreleased" && (
                <p className="muted" style={{ marginTop: 14 }}>{t("Disque inédit : pas encore à vendre. Reste à l'écoute !", "Unreleased record: not for sale yet. Stay tuned!")}</p>
              )}
              {current.sale_mode === "store" && !current.sold && (
                <p className="muted" style={{ marginTop: 14 }}>
                  {t("Disponible uniquement en magasin", "Available in store only")}
                  {dj?.address ? ` · 📍 ${dj.address}${dj.city && !dj.address.includes(dj.city) ? `, ${dj.city}` : ""}` : dj?.city ? ` · 📍 ${dj.city}` : ""}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="panel-label">{t("Vinyle en cours", "Now playing")}</p>
              <p className="muted">
                {live.status === "a_venir" && t("Le live n'a pas encore commencé.", "The live has not started yet.")}
                {live.status === "en_cours" && t("Le premier disque arrive dans un instant…", "The first record is coming up in a moment…")}
                {live.status === "termine" && t("Le live est terminé. Retrouve ci-dessous tous les disques : clique sur « Écouter » pour reprendre la vidéo au bon moment.", "The live has ended. Every record is listed below: click “Listen” to jump to the right moment in the video.")}
              </p>
            </>
          )}
        </aside>
      </div>

      {played.length > 0 && (
        <section className="history">
          <h2 className="display">{isReplay ? t("Tracklist du replay", "Replay tracklist") : t("Déjà passés", "Already played")}</h2>
          <div>
            {played.map((tk) => {
              const link = safeHttpsUrl(tk.discogs_url);
              const p = formatPrice(tk.price, lang);
              const offset = isReplay && embed ? replayOffsetFor(tk) : null;
              return (
                <div key={tk.id} className={`track-row${tk.id === current?.id ? " is-current" : ""}${tk.sold ? " is-sold" : ""}`}>
                  <span className="track-pos">{tk.position}</span>
                  <div>
                    <div>{tk.title}</div>
                    <div className="track-artist">
                      {tk.artist}
                      {offset != null && (
                        <button className="replay-btn" onClick={() => { setReplayStart(offset); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                          ▶ {t("Écouter", "Listen")}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="track-right">
                    {!tk.sold && tk.sale_mode !== "unreleased" && p && <span className="track-price">{p}</span>}
                    {saleTag(tk, link)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
