"use client";

import { useCallback, useEffect, useState, type DragEvent, type FormEvent } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Live, Track } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { safeDiscogsUrl } from "@/lib/urls";

type Props = {
  live: Live;
  onLiveChange: (live: Live) => void;
  /** Mode réduit (studio) : seulement le bouton NEXT, sans l'édition de la tracklist. */
  compact?: boolean;
};

const STATUS_LABEL = {
  a_venir: "À venir",
  en_cours: "En direct",
  termine: "Terminé",
} as const;

function reorderMessage(message: string): string {
  if (message.includes("REORDER_PLAYED")) return "Les disques déjà passés ne peuvent pas être déplacés.";
  if (message.includes("REORDER_LOCKED")) return "Un live terminé ne peut plus être modifié.";
  if (message.includes("REORDER_FORBIDDEN")) return "Tu n'as pas le droit de modifier cette tracklist.";
  return `Changement d'ordre impossible : ${message}`;
}

export default function LiveControl({ live, onLiveChange, compact = false }: Props) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const loadTracks = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = await sb.from("tracklist").select("*").eq("live_id", live.id).order("position");
    setTracks((data as Track[] | null) ?? []);
  }, [live.id]);

  useEffect(() => {
    void loadTracks();
  }, [loadTracks]);

  const current = tracks.find((t) => t.position === live.current_index) ?? null;
  const next = tracks.find((t) => t.position > live.current_index) ?? null;
  const prev = [...tracks].reverse().find((t) => t.position < live.current_index) ?? null;

  // Les disques déjà passés (ou tout, si le live est terminé) sont verrouillés.
  const lockedCount =
    live.status === "termine"
      ? tracks.length
      : live.current_index > 0
        ? tracks.filter((t) => t.position <= live.current_index).length
        : 0;

  async function patchLive(patch: Partial<Pick<Live, "status" | "current_index">>): Promise<boolean> {
    const sb = getSupabase();
    if (!sb) return false;
    setBusy(true);
    setError(null);
    const { data, error: err } = await sb.from("lives").update(patch).eq("id", live.id).select().single();
    setBusy(false);
    if (err) {
      setError(`Mise à jour impossible : ${err.message}`);
      return false;
    }
    onLiveChange(data as Live);
    return true;
  }

  // "Next" lance aussi le live s'il n'était pas encore démarré, et note l'heure de passage (pour le replay).
  async function goNext() {
    if (!next) return;
    const ok = await patchLive({ current_index: next.position, status: "en_cours" });
    if (!ok) return;
    const playedAt = new Date().toISOString();
    const sb = getSupabase();
    if (!sb) return;
    const { error: err } = await sb.from("tracklist").update({ played_at: playedAt }).eq("id", next.id);
    if (!err) setTracks((list) => list.map((t) => (t.id === next.id ? { ...t, played_at: playedAt } : t)));
  }
  const goPrev = () => patchLive({ current_index: prev ? prev.position : 0 });

  async function addTrack(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const sb = getSupabase();
    if (!sb) return;
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const discogsRaw = String(form.get("discogs_url") ?? "").trim();
    if (discogsRaw && !safeDiscogsUrl(discogsRaw)) {
      setError("Le lien doit être une adresse https://www.discogs.com/…");
      return;
    }
    const priceRaw = String(form.get("price") ?? "").trim();
    const position = tracks.reduce((max, t) => Math.max(max, t.position), 0) + 1;

    const { data, error: err } = await sb
      .from("tracklist")
      .insert({
        live_id: live.id,
        position,
        title: String(form.get("title") ?? "").trim(),
        artist: String(form.get("artist") ?? "").trim(),
        discogs_url: discogsRaw || null,
        price: priceRaw ? Number(priceRaw) : null,
      })
      .select()
      .single();
    if (err) {
      setError(`Ajout impossible : ${err.message}`);
      return;
    }
    formEl.reset();
    setTracks((list) => [...list, data as Track]);
  }

  async function removeTrack(id: string) {
    const sb = getSupabase();
    if (!sb) return;
    setError(null);
    const { error: err } = await sb.from("tracklist").delete().eq("id", id);
    if (err) {
      setError(`Suppression impossible : ${err.message}`);
      return;
    }
    setTracks((list) => list.filter((t) => t.id !== id));
  }

  async function toggleSold(track: Track) {
    const sb = getSupabase();
    if (!sb) return;
    setError(null);
    const sold = !track.sold;
    setTracks((list) => list.map((t) => (t.id === track.id ? { ...t, sold } : t)));
    const { error: err } = await sb.from("tracklist").update({ sold }).eq("id", track.id);
    if (err) {
      setTracks((list) => list.map((t) => (t.id === track.id ? { ...t, sold: track.sold } : t)));
      setError(`Mise à jour impossible : ${err.message}`);
    }
  }

  // --- Réorganisation (glisser-déposer ou boutons ▲ ▼) ---
  async function applyOrder(ordered: Track[]) {
    const sb = getSupabase();
    if (!sb) return;
    const before = tracks;
    setError(null);
    setTracks(ordered.map((t, i) => ({ ...t, position: i + 1 })));
    const { error: err } = await sb.rpc("reorder_tracklist", {
      p_live_id: live.id,
      p_ids: ordered.map((t) => t.id),
    });
    if (err) {
      setTracks(before);
      setError(reorderMessage(err.message));
      return;
    }
    // L'ordre est enregistré : on relit le live (le disque en cours peut avoir changé de numéro).
    const { data } = await sb.from("lives").select("*").eq("id", live.id).single();
    if (data) onLiveChange(data as Live);
    void loadTracks();
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (index < lockedCount || target < lockedCount || target >= tracks.length) return;
    const copy = [...tracks];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    void applyOrder(copy);
  }

  function onDragStart(e: DragEvent<HTMLDivElement>, id: string) {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }
  function onDragOver(e: DragEvent<HTMLDivElement>, index: number) {
    if (!dragId || index < lockedCount) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIndex(index);
  }
  function onDrop(e: DragEvent<HTMLDivElement>, index: number) {
    e.preventDefault();
    const from = tracks.findIndex((t) => t.id === dragId);
    setDragId(null);
    setOverIndex(null);
    if (from < lockedCount || index < lockedCount || from === index) return;
    const copy = [...tracks];
    const [moved] = copy.splice(from, 1);
    copy.splice(index, 0, moved);
    void applyOrder(copy);
  }

  return (
    <>
      <div className="panel">
        <div className="control-now">
          <p className="panel-label">{STATUS_LABEL[live.status]} · disque en cours</p>
          <p className="big">{current ? `${current.title} — ${current.artist}` : "Aucun disque lancé"}</p>
          {next && <p className="muted">Ensuite : {next.title} — {next.artist}</p>}
        </div>

        <div className="control-buttons">
          <button className="btn-ghost" onClick={goPrev} disabled={busy || live.current_index === 0 || live.status === "termine"}>
            ← Précédent
          </button>
          <button className="btn btn-next" onClick={goNext} disabled={busy || !next || live.status === "termine"}>
            {next ? "NEXT →" : "Fin de la tracklist"}
          </button>
        </div>

        <div className="control-meta">
          {live.status === "a_venir" && (
            <button className="btn-ghost" onClick={() => patchLive({ status: "en_cours" })} disabled={busy}>
              Démarrer le live
            </button>
          )}
          {live.status === "en_cours" && (
            <button
              className="btn-ghost"
              onClick={() => {
                if (window.confirm("Terminer le live ? C'est définitif : un live terminé ne peut pas être rouvert.")) {
                  void patchLive({ status: "termine" });
                }
              }}
              disabled={busy}
            >
              Terminer le live
            </button>
          )}
          {live.status === "termine" && <span className="muted">Live terminé</span>}
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      {!compact && (
        <>
          <h2 className="display">Tracklist</h2>
          <div className="panel">
            {tracks.length === 0 ? (
              <p className="muted">Ajoute les disques de ton set, dans l&apos;ordre de passage.</p>
            ) : (
              <>
                <p className="hint" style={{ marginBottom: 12 }}>
                  Glisse un disque par la poignée ⋮⋮ (ou utilise ▲ ▼) pour changer l&apos;ordre.
                  {lockedCount > 0 && live.status !== "termine" && " Les disques déjà passés sont verrouillés."}
                </p>
                {tracks.map((t, i) => {
                  const locked = i < lockedCount;
                  return (
                    <div
                      key={t.id}
                      className={`edit-row sortable${t.position === live.current_index ? " is-current" : ""}${
                        dragId === t.id ? " is-dragging" : ""
                      }${overIndex === i && dragId !== t.id ? " is-over" : ""}${locked ? " is-locked" : ""}`}
                      draggable={!locked}
                      onDragStart={(e) => onDragStart(e, t.id)}
                      onDragOver={(e) => onDragOver(e, i)}
                      onDrop={(e) => onDrop(e, i)}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverIndex(null);
                      }}
                    >
                      <span className="drag-handle" aria-hidden title={locked ? "Déjà passé" : "Glisser pour déplacer"}>
                        {locked ? "▪" : "⋮⋮"}
                      </span>
                      <span className="track-pos">{i + 1}</span>
                      <div>
                        <div>{t.title}</div>
                        <div className="track-artist">
                          {t.artist}
                          {t.price != null ? ` · ${formatPrice(t.price)}` : ""}
                        </div>
                      </div>
                      <div className="row-actions">
                        <button
                          className={`chip${t.sold ? " is-selected" : ""}`}
                          onClick={() => toggleSold(t)}
                          aria-pressed={t.sold}
                          title="Indique si ce disque est vendu"
                        >
                          {t.sold ? "Vendu" : "Disponible"}
                        </button>
                        <button className="btn-ghost btn-icon" onClick={() => move(i, -1)} disabled={locked || i - 1 < lockedCount} aria-label={`Monter ${t.title}`}>
                          ▲
                        </button>
                        <button className="btn-ghost btn-icon" onClick={() => move(i, 1)} disabled={locked || i === tracks.length - 1} aria-label={`Descendre ${t.title}`}>
                          ▼
                        </button>
                        {!locked && (
                          <button className="btn-ghost" onClick={() => removeTrack(t.id)} aria-label={`Supprimer ${t.title}`}>
                            Supprimer
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {live.status !== "termine" && (
              <form className="form-grid" onSubmit={addTrack} style={{ marginTop: 22 }}>
                <div className="field">
                  <label htmlFor="t-title">Titre</label>
                  <input id="t-title" name="title" required maxLength={160} />
                </div>
                <div className="field">
                  <label htmlFor="t-artist">Artiste</label>
                  <input id="t-artist" name="artist" required maxLength={160} />
                </div>
                <div className="field">
                  <label htmlFor="t-discogs">Lien Discogs</label>
                  <input id="t-discogs" name="discogs_url" type="url" placeholder="https://www.discogs.com/sell/item/…" />
                </div>
                <div className="field">
                  <label htmlFor="t-price">Prix (€)</label>
                  <input id="t-price" name="price" type="number" min="0" step="0.01" />
                </div>
                <button className="btn" type="submit">
                  Ajouter le disque
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </>
  );
}
