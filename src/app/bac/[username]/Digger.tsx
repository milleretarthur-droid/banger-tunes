"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLang, useT } from "@/lib/i18n";
import type { BacItem, ReleaseMedia } from "@/lib/discogs";

/* eslint-disable @typescript-eslint/no-explicit-any */
type MediaState = ReleaseMedia | "loading" | "error";

function money(value: number | null, currency: string, lang: string): string | null {
  if (value == null) return null;
  try {
    return new Intl.NumberFormat(lang === "en" ? "en-GB" : "fr-FR", { style: "currency", currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function shuffled<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Digger({ username, configured }: { username: string; configured: boolean }) {
  const t = useT();
  const lang = useLang();
  const [items, setItems] = useState<BacItem[]>([]);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(configured);
  const [loadError, setLoadError] = useState<string | null>(configured ? null : "not_configured");
  const [index, setIndex] = useState(0);
  const [vIdx, setVIdx] = useState(0);
  const [media, setMedia] = useState<Record<number, MediaState>>({});
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [skipped, setSkipped] = useState(0);
  const [atEnd, setAtEnd] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const startedRef = useRef(false);
  const loadedKey = useRef<string | null>(null);
  const pageRef = useRef(0);
  const fetchingPage = useRef(false);
  const dir = useRef<1 | -1>(1);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const state = useRef({ items, index, vIdx, media });
  state.current = { items, index, vIdx, media };

  // ---------- Inventaire (pages de 100, la suite se charge au fil de l'écoute) ----------
  const loadPage = useCallback(
    async (p: number) => {
      if (fetchingPage.current) return;
      fetchingPage.current = true;
      try {
        const res = await fetch(`/api/discogs/inventory?username=${encodeURIComponent(username)}&page=${p}`);
        if (!res.ok) {
          if (p === 1) setLoadError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "unavailable");
          return;
        }
        const d = (await res.json()) as { items: BacItem[]; pages: number; total: number };
        pageRef.current = p;
        setPages(d.pages);
        setTotal(d.total);
        setItems((prev) => {
          const seen = new Set(prev.map((x) => x.listingId));
          return [...prev, ...d.items.filter((x) => !seen.has(x.listingId))];
        });
      } catch {
        if (p === 1) setLoadError("unavailable");
      } finally {
        fetchingPage.current = false;
        if (p === 1) setLoading(false);
      }
    },
    [username],
  );

  useEffect(() => {
    if (configured) void loadPage(1);
  }, [configured, loadPage]);

  useEffect(() => {
    if (items.length > 0 && index >= items.length - 8 && pageRef.current < pages) void loadPage(pageRef.current + 1);
  }, [index, items.length, pages, loadPage]);

  // ---------- Vidéos des disques (préchargées pour le disque en cours et les deux suivants) ----------
  const ensureMedia = useCallback(async (releaseId: number) => {
    if (state.current.media[releaseId]) return;
    setMedia((m) => (m[releaseId] ? m : { ...m, [releaseId]: "loading" }));
    state.current.media[releaseId] = "loading";
    try {
      const res = await fetch(`/api/discogs/release/${releaseId}`);
      const next: MediaState = res.ok ? ((await res.json()) as ReleaseMedia) : "error";
      setMedia((m) => ({ ...m, [releaseId]: next }));
    } catch {
      setMedia((m) => ({ ...m, [releaseId]: "error" }));
    }
  }, []);

  useEffect(() => {
    for (const it of items.slice(index, index + 3)) void ensureMedia(it.releaseId);
  }, [items, index, ensureMedia]);

  const current = items[index] ?? null;
  const cm = current ? media[current.releaseId] : undefined;
  const videos = cm && typeof cm === "object" ? cm.videos : [];

  // ---------- Navigation ----------
  const goRelease = useCallback((delta: 1 | -1) => {
    const { items: list, index: i } = state.current;
    const target = i + delta;
    dir.current = delta;
    if (target < 0) return;
    if (target >= list.length) return setAtEnd(true);
    setAtEnd(false);
    setVIdx(0);
    setIndex(target);
  }, []);

  const goVideo = useCallback(
    (delta: 1 | -1) => {
      const { items: list, index: i, vIdx: v, media: m } = state.current;
      const cur = list[i];
      const mm = cur ? m[cur.releaseId] : undefined;
      const count = mm && typeof mm === "object" ? mm.videos.length : 0;
      const target = v + delta;
      if (target >= 0 && target < count) return setVIdx(target);
      goRelease(delta);
    },
    [goRelease],
  );

  // Disque sans vidéo (ou fiche introuvable) : on passe au suivant, dans le sens de l'écoute.
  useEffect(() => {
    if (!current) return;
    if (cm === "error" || (cm && typeof cm === "object" && cm.videos.length === 0)) {
      setSkipped((s) => s + 1);
      goRelease(dir.current);
    }
  }, [current, cm, goRelease]);

  // ---------- Lecteur YouTube ----------
  const actions = useRef({ ended: () => {}, broken: () => {} });
  actions.current = {
    ended: () => goVideo(1),
    broken: () => {
      setSkipped((s) => s + 1);
      goVideo(dir.current);
    },
  };

  useEffect(() => {
    const w = window as any;
    const init = () => {
      if (playerRef.current || !boxRef.current) return;
      const el = document.createElement("div");
      boxRef.current.prepend(el);
      playerRef.current = new w.YT.Player(el, {
        host: "https://www.youtube-nocookie.com",
        width: "100%",
        height: "100%",
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => setPlayerReady(true),
          onStateChange: (e: any) => {
            if (e.data === 1) {
              startedRef.current = true;
              setStarted(true);
              setPlaying(true);
            } else if (e.data === 2) setPlaying(false);
            else if (e.data === 0) actions.current.ended();
          },
          onError: () => actions.current.broken(),
        },
      });
    };
    if (w.YT?.Player) init();
    else {
      const prev = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        prev?.();
        init();
      };
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const s = document.createElement("script");
        s.src = "https://www.youtube.com/iframe_api";
        s.async = true;
        document.head.appendChild(s);
      }
    }
    return () => {
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* rien à faire */
      }
      playerRef.current = null;
    };
  }, []);

  const videoId = current && videos[vIdx] ? videos[vIdx].id : null;
  useEffect(() => {
    if (!playerReady || !videoId || !current) return;
    const key = `${current.releaseId}:${videoId}`;
    if (loadedKey.current === key) return;
    loadedKey.current = key;
    try {
      if (startedRef.current) playerRef.current.loadVideoById(videoId);
      else playerRef.current.cueVideoById(videoId);
    } catch {
      /* lecteur pas prêt : l'effet repartira au prochain changement */
    }
  }, [playerReady, videoId, current]);

  function start() {
    startedRef.current = true;
    setStarted(true);
    try {
      playerRef.current?.playVideo();
    } catch {
      /* ignoré */
    }
  }

  function togglePlay() {
    if (!started) return start();
    try {
      if (playing) playerRef.current?.pauseVideo();
      else playerRef.current?.playVideo();
    } catch {
      /* ignoré */
    }
  }

  function shuffle() {
    setItems((prev) => [...prev.slice(0, index + 1), ...shuffled(prev.slice(index + 1))]);
  }

  // ---------- Clavier et balayage ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowDown") { e.preventDefault(); goRelease(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); goRelease(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); goVideo(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goVideo(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goRelease, goVideo]);

  function onTouchEnd(e: React.TouchEvent) {
    const s = touch.current;
    touch.current = null;
    if (!s) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx)) goRelease(dy < 0 ? 1 : -1);
    else if (Math.abs(dx) > 60) goVideo(dx < 0 ? 1 : -1);
  }

  const errorText: Record<string, string> = {
    not_configured: t("Le Digger n'est pas encore activé sur ce site (clés Discogs manquantes).", "Digger is not enabled on this site yet (Discogs keys missing)."),
    not_found: t("Vendeur introuvable, ou inventaire privé ou vide.", "Seller not found, or inventory private or empty."),
    rate_limited: t("Trop de demandes pour le moment. Réessaie dans une minute.", "Too many requests right now. Try again in a minute."),
    unavailable: t("Discogs ne répond pas pour le moment. Réessaie dans un instant.", "Discogs is not responding right now. Try again shortly."),
  };
  const price = current ? money(current.price, current.currency, lang) : null;
  const hasStage = items.length > 0;

  return (
    <div className="digger">
      <header className="digger-top">
        <div>
          <span className="muted">{t("Le bac de", "The crate of")}</span>
          <h1 className="display">{username}</h1>
        </div>
        {hasStage && (
          <div className="digger-meta">
            <span>{index + 1} / {total || items.length}</span>
            <button className="chip" onClick={shuffle}>{t("Mélanger", "Shuffle")}</button>
          </div>
        )}
      </header>

      {loading && <p className="muted">{t("Chargement du bac…", "Loading the crate…")}</p>}
      {loadError && <p className="error">{errorText[loadError] ?? errorText.unavailable}</p>}
      {!loading && !loadError && items.length === 0 && <p className="muted">{t("Aucun disque en vente pour ce vendeur.", "No records for sale from this seller.")}</p>}

      <div className="digger-stage" style={hasStage ? undefined : { display: "none" }}>
        <div className="digger-player" ref={boxRef}>
          {!started && (
            <button className="digger-start" onClick={start} disabled={!videoId} aria-label={t("Lancer l'écoute", "Start listening")}>
              <span className="digger-start-disc" aria-hidden />
              <span>{videoId ? `▶ ${t("Lancer l'écoute", "Start listening")}` : t("Recherche d'un extrait…", "Looking for a preview…")}</span>
            </button>
          )}
        </div>

        {current && (
          <div className="digger-card" onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchEnd={onTouchEnd}>
            <div className="digger-segs" role="tablist" aria-label={t("Pistes du disque", "Tracks of the record")}>
              {videos.map((v, i) => (
                <button key={v.id} className={`digger-seg${i === vIdx ? " on" : ""}${i < vIdx ? " done" : ""}`} onClick={() => setVIdx(i)} title={v.title} aria-label={v.title || `${t("Piste", "Track")} ${i + 1}`} />
              ))}
            </div>
            <p className="digger-track">{videos[vIdx]?.title || (cm === "loading" || !cm ? t("Chargement…", "Loading…") : "")}</p>
            <h2 className="digger-title">{current.artist}<span> — {current.title}</span></h2>
            <p className="muted">{[current.label, current.year, current.format, current.condition].filter(Boolean).join(" · ")}</p>
            <div className="digger-buy">
              {price && <strong className="digger-price">{price}</strong>}
              <a className="btn" href={current.url} target="_blank" rel="noopener noreferrer">{t("Voir et acheter sur Discogs", "View and buy on Discogs")} ↗</a>
            </div>
            <div className="digger-nav">
              <button className="btn-ghost" onClick={() => goVideo(-1)} aria-label={t("Piste précédente", "Previous track")}>◀</button>
              <button className="btn-ghost" onClick={() => goRelease(-1)} aria-label={t("Disque précédent", "Previous record")}>▲ {t("Disque", "Record")}</button>
              <button className="btn" onClick={togglePlay}>{playing ? "❚❚" : "▶"}</button>
              <button className="btn-ghost" onClick={() => goRelease(1)} aria-label={t("Disque suivant", "Next record")}>▼ {t("Disque", "Record")}</button>
              <button className="btn-ghost" onClick={() => goVideo(1)} aria-label={t("Piste suivante", "Next track")}>▶</button>
            </div>
            {skipped > 0 && <p className="hint">{t(`${skipped} disque(s) ou piste(s) sans extrait lisible ont été sautés.`, `${skipped} record(s) or track(s) without a playable preview were skipped.`)}</p>}
            {atEnd && <p className="hint">{t("Tu es au bout du bac.", "You've reached the end of the crate.")}</p>}
          </div>
        )}
      </div>

      <footer className="digger-legal">
        <p>
          <a href={`https://www.discogs.com/seller/${encodeURIComponent(username)}/profile`} target="_blank" rel="noopener noreferrer">Data provided by Discogs.</a>{" "}
          This application uses Discogs&apos; API but is not affiliated with, sponsored or endorsed by Discogs.
        </p>
        <p>{t("Les extraits viennent de YouTube (liens renseignés sur Discogs) et ne sont pas disponibles pour tous les disques. Disponibilité et prix : voir l'annonce Discogs.", "Previews come from YouTube (links listed on Discogs) and are not available for every record. Availability and price: see the Discogs listing.")}</p>
      </footer>
    </div>
  );
}
