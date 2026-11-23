"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Dj, Live, Track } from "@/lib/types";
import { youtubeEmbedUrl } from "@/lib/youtube";
import { safeDiscogsUrl, safeHttpsUrl } from "@/lib/urls";
import { formatDate, formatPrice } from "@/lib/format";

type Props = {
  initialLive: Live;
  dj: Dj | null;
  initialTracks: Track[];
};

export default function LiveView({ initialLive, dj, initialTracks }: Props) {
  const [live, setLive] = useState<Live>(initialLive);
  const [tracks, setTracks] = useState<Track[]>(initialTracks);
  const [connected, setConnected] = useState(false);
  const liveId = initialLive.id;

  const refresh = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const [l, t] = await Promise.all([
      sb.from("lives").select("*").eq("id", liveId).single(),
      sb.from("tracklist").select("*").eq("live_id", liveId).order("position"),
    ]);
    if (l.data) setLive(l.data as Live);
    if (t.data) setTracks(t.data as Track[]);
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

  const current = tracks.find((t) => t.position === live.current_index) ?? null;
  const currentRank = current ? tracks.findIndex((t) => t.id === current.id) + 1 : 0;

  // Seuls les disques déjà passés sont visibles (le live terminé montre tout).
  const played = useMemo(() => {
    const list =
      live.status === "termine"
        ? tracks
        : tracks.filter((t) => live.current_index > 0 && t.position <= live.current_index);
    return [...list].reverse();
  }, [tracks, live.status, live.current_index]);

  const embed = youtubeEmbedUrl(live.youtube_url);
  const discogs = safeDiscogsUrl(current?.discogs_url);
  const cover = safeHttpsUrl(current?.cover_url);
  const price = formatPrice(current?.price);

  return (
    <>
      <header className="live-head">
        {live.status === "en_cours" && (
          <div className="live-badge">
            <span className="dot" />
            En direct
          </div>
        )}
        {live.status === "a_venir" && (
          <span className="status-pill">À venir · {formatDate(live.scheduled_at)}</span>
        )}
        {live.status === "termine" && <span className="status-pill">Live terminé</span>}
        <h1 className="display live-title">{live.title}</h1>
        {dj && (
          <p className="live-dj">
            avec <strong>{dj.name}</strong>
            {dj.genre ? ` · ${dj.genre}` : ""}
          </p>
        )}
      </header>

      <div className="live-layout">
        <div className="player">
          {embed ? (
            <iframe
              src={embed}
              title={`Lecteur YouTube — ${live.title}`}
              allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : (
            <div className="player-empty">La vidéo sera disponible au démarrage du live.</div>
          )}
        </div>

        <aside className="now-panel" aria-live="polite">
          {current ? (
            <>
              <p className="panel-label">
                En cours · disque {currentRank}/{tracks.length}
              </p>
              <div className="now-body">
                {cover ? (
                  <img className="now-cover" src={cover} alt={`Pochette de ${current.title}`} />
                ) : (
                  <div className="vinyl-disc" aria-hidden />
                )}
                <div>
                  <h2 className="now-title">{current.title}</h2>
                  <p className="now-artist">{current.artist}</p>
                  {price && <p className="now-price">{price}</p>}
                </div>
              </div>
              {discogs ? (
                <a
                  className="btn btn-gold btn-block"
                  href={discogs}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Voir sur Discogs →
                </a>
              ) : (
                <p className="muted">Fiche Discogs bientôt disponible.</p>
              )}
            </>
          ) : (
            <>
              <p className="panel-label">Vinyle en cours</p>
              <p className="muted">
                {live.status === "a_venir" && "Le live n'a pas encore commencé."}
                {live.status === "en_cours" && "Le premier disque arrive dans un instant…"}
                {live.status === "termine" && "Le live est terminé. Retrouve ci-dessous tous les disques passés."}
              </p>
            </>
          )}
        </aside>
      </div>

      {played.length > 0 && (
        <section className="history">
          <h2 className="display">{live.status === "termine" ? "Tracklist complète" : "Déjà passés"}</h2>
          <div>
            {played.map((t) => {
              const link = safeDiscogsUrl(t.discogs_url);
              const p = formatPrice(t.price);
              return (
                <div key={t.id} className={`track-row${t.id === current?.id ? " is-current" : ""}`}>
                  <span className="track-pos">{t.position}</span>
                  <div>
                    <div>{t.title}</div>
                    <div className="track-artist">{t.artist}</div>
                  </div>
                  <span className="track-price">{p}</span>
                  {link ? (
                    <a className="track-link" href={link} target="_blank" rel="noopener noreferrer">
                      Discogs →
                    </a>
                  ) : (
                    <span />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
