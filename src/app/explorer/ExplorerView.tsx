"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { LiveCard } from "@/components/LiveCard";
import type { LiveWithDj } from "@/lib/types";
import { useLang, useT } from "@/lib/i18n";

const LiveMap = dynamic(() => import("./LiveMap"), {
  ssr: false,
  loading: () => <div className="map-box map-loading">…</div>,
});

type StatusFilter = "all" | "en_cours" | "a_venir" | "termine";
type KindFilter = "all" | "dj" | "store";

const norm = (v: string | null | undefined) =>
  (v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const RANK = { en_cours: 0, a_venir: 1, termine: 2 } as const;

function genresOf(lives: LiveWithDj[]): string[] {
  const counts = new Map<string, number>();
  const seen = new Set<string>();
  for (const l of lives) {
    if (!l.dj || seen.has(l.dj.id)) continue;
    seen.add(l.dj.id);
    for (const g of (l.dj.genre ?? "").split(/[·,/;]/)) {
      const name = g.trim();
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 14).map(([g]) => g);
}

export default function ExplorerView({ lives, initialStatus = "all" }: { lives: LiveWithDj[]; initialStatus?: StatusFilter }) {
  const lang = useLang();
  const t = useT();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [kind, setKind] = useState<KindFilter>("all");
  const [genre, setGenre] = useState<string | null>(null);
  const [view, setView] = useState<"liste" | "carte">("liste");

  const genres = useMemo(() => genresOf(lives), [lives]);

  const filtered = useMemo(() => {
    const needle = norm(q.trim());
    return lives
      .filter((l) => {
        if (status !== "all" && l.status !== status) return false;
        if (kind !== "all" && l.dj?.kind !== kind) return false;
        if (genre && !norm(l.dj?.genre).includes(norm(genre))) return false;
        if (!needle) return true;
        return [l.title, l.dj?.name, l.dj?.genre, l.dj?.city].some((v) => norm(v).includes(needle));
      })
      .sort((a, b) => {
        if (RANK[a.status] !== RANK[b.status]) return RANK[a.status] - RANK[b.status];
        if (a.status === "a_venir") return (a.scheduled_at ?? "9999").localeCompare(b.scheduled_at ?? "9999");
        return b.created_at.localeCompare(a.created_at);
      });
  }, [lives, q, status, kind, genre]);

  const located = useMemo(() => new Set(filtered.filter((l) => l.dj?.lat != null).map((l) => l.dj!.id)).size, [filtered]);

  const statusTabs: [StatusFilter, string][] = [["all", t("Tout", "All")], ["en_cours", t("En direct", "Live")], ["a_venir", t("À venir", "Coming up")], ["termine", "Replays"]];

  return (
    <div className="section">
      <h1 className="display" style={{ fontSize: "clamp(34px,5vw,56px)", marginBottom: 20 }}>{t("Explorer", "Explore")}</h1>

      <input
        className="explorer-search"
        type="search"
        placeholder={t("Chercher un style, un DJ, un magasin, une ville…", "Search for a style, a DJ, a shop, a city…")}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label={t("Rechercher", "Search")}
      />

      <div className="filter-row" role="group" aria-label={t("Statut", "Status")}>
        {statusTabs.map(([id, label]) => (
          <button key={id} className={`chip${status === id ? " is-selected" : ""}`} onClick={() => setStatus(id)}>
            {label}
          </button>
        ))}
        <span className="filter-sep" />
        {([["all", t("DJ et magasins", "DJs and shops")], ["dj", "DJ"], ["store", t("Magasins", "Shops")]] as [KindFilter, string][]).map(([id, label]) => (
          <button key={id} className={`chip${kind === id ? " is-selected" : ""}`} onClick={() => setKind(id)}>
            {label}
          </button>
        ))}
      </div>

      {genres.length > 0 && (
        <div className="filter-row" role="group" aria-label={t("Styles", "Styles")}>
          {genres.map((g) => (
            <button key={g} className={`chip${genre === g ? " is-selected" : ""}`} onClick={() => setGenre(genre === g ? null : g)}>
              {g}
            </button>
          ))}
        </div>
      )}

      <div className="explorer-bar">
        <p className="muted">
          {filtered.length} live{filtered.length > 1 ? "s" : ""}
        </p>
        <div className="tabs" style={{ marginBottom: 0 }}>
          <button className={`tab${view === "liste" ? " is-active" : ""}`} onClick={() => setView("liste")}>{t("Liste", "List")}</button>
          <button className={`tab${view === "carte" ? " is-active" : ""}`} onClick={() => setView("carte")}>{t("Carte", "Map")}</button>
        </div>
      </div>

      {view === "carte" && (
        <>
          <LiveMap lives={filtered} />
          <p className="hint" style={{ margin: "8px 0 20px" }}>
            <span className="legend-dot pin-live" /> {t("En direct", "Live")} <span className="legend-dot pin-soon" /> {t("À venir", "Coming up")} <span className="legend-dot pin-replay" /> Replay
            {" · "}
            {lang === "en" ? `${located} creator${located > 1 ? "s" : ""} located out of ${new Set(filtered.map((l) => l.dj_id)).size}` : `${located} créateur${located > 1 ? "s" : ""} localisé${located > 1 ? "s" : ""} sur ${new Set(filtered.map((l) => l.dj_id)).size}`}
          </p>
        </>
      )}

      {filtered.length > 0 ? (
        <div className="grid">
          {filtered.map((l) => (
            <LiveCard key={l.id} live={l} lang={lang} />
          ))}
        </div>
      ) : (
        <p className="empty">{t("Aucun live ne correspond à ta recherche.", "No live matches your search.")}</p>
      )}
    </div>
  );
}
