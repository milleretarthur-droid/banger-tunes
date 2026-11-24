"use client";

import { useCallback, useEffect, useState, type DragEvent, type FormEvent } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Live, Track } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { safeHttpsUrl } from "@/lib/urls";
import { useLang } from "@/lib/i18n";
import { makeT, type T } from "@/lib/lang";

type Props = {
  live: Live;
  onLiveChange: (live: Live) => void;
  /** Mode réduit (studio) : seulement le bouton NEXT, sans l'édition de la tracklist. */
  compact?: boolean;
  /** Type du créateur : seuls les magasins proposent « en magasin uniquement ». */
  djKind?: "dj" | "store";
};

function reorderMessage(message: string, tt: T): string {
  if (message.includes("REORDER_PLAYED")) return tt("Les disques déjà passés ne peuvent pas être déplacés.", "Records already played cannot be moved.");
  if (message.includes("REORDER_LOCKED")) return tt("Un live terminé ne peut plus être modifié.", "An ended live can no longer be edited.");
  if (message.includes("REORDER_FORBIDDEN")) return tt("Tu n'as pas le droit de modifier cette tracklist.", "You are not allowed to edit this tracklist.");
  return `${tt("Changement d'ordre impossible", "Could not change the order")} : ${message}`;
}

export default function LiveControl({ live, onLiveChange, compact = false, djKind = "dj" }: Props) {
  const lang = useLang();
  const tt = makeT(lang);
  const STATUS_LABEL = { a_venir: tt("À venir", "Coming up"), en_cours: tt("En direct", "Live"), termine: tt("Terminé", "Ended") } as const;
  const [tracks, setTracks] = useState<Track[]>([]);
  const [newMode, setNewMode] = useState<Track["sale_mode"]>("online");
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
      setError(`${tt("Mise à jour impossible", "Could not update")} : ${err.message}`);
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
    const mode = newMode;
    const discogsRaw = mode === "online" ? String(form.get("discogs_url") ?? "").trim() : "";
    if (discogsRaw && !safeHttpsUrl(discogsRaw)) {
      setError(tt("Le lien doit être une adresse web en https://…", "The link must be a web address starting with https://…"));
      return;
    }
    const priceRaw = mode === "unreleased" ? "" : String(form.get("price") ?? "").trim();
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
        sale_mode: mode,
      })
      .select()
      .single();
    if (err) {
      setError(`${tt("Ajout impossible", "Could not add")} : ${err.message}`);
      return;
    }
    formEl.reset();
    setNewMode("online");
    setTracks((list) => [...list, data as Track]);
  }

  async function removeTrack(id: string) {
    const sb = getSupabase();
    if (!sb) return;
    setError(null);
    const { error: err } = await sb.from("tracklist").delete().eq("id", id);
    if (err) {
      setError(`${tt("Suppression impossible", "Could not delete")} : ${err.message}`);
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
      setError(`${tt("Mise à jour impossible", "Could not update")} : ${err.message}`);
    }
  }

  async function changeMode(track: Track, mode: Track["sale_mode"]) {
    const sb = getSupabase();
    if (!sb || mode === track.sale_mode) return;
    setError(null);
    const patch: Partial<Track> = mode === "unreleased" ? { sale_mode: mode, discogs_url: null, price: null } : { sale_mode: mode };
    const { error: err } = await sb.from("tracklist").update(patch).eq("id", track.id);
    if (err) {
      setError(`${tt("Mise à jour impossible", "Could not update")} : ${err.message}`);
      return;
    }
    setTracks((list) => list.map((x) => (x.id === track.id ? { ...x, ...patch } : x)));
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
      setError(reorderMessage(err.message, tt));
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
          <p className="panel-label">{STATUS_LABEL[live.status]} · {tt("disque en cours", "current record")}</p>
          <p className="big">{current ? `${current.title} — ${current.artist}` : tt("Aucun disque lancé", "No record playing")}</p>
          {next && <p className="muted">{tt("Ensuite", "Next")} : {next.title} — {next.artist}</p>}
        </div>

        <div className="control-buttons">
          <button className="btn-ghost" onClick={goPrev} disabled={busy || live.current_index === 0 || live.status === "termine"}>
            ← {tt("Précédent", "Previous")}
          </button>
          <button className="btn btn-next" onClick={goNext} disabled={busy || !next || live.status === "termine"}>
            {next ? "NEXT →" : tt("Fin de la tracklist", "End of tracklist")}
          </button>
        </div>

        <div className="control-meta">
          {live.status === "a_venir" && (
            <button className="btn-ghost" onClick={() => patchLive({ status: "en_cours" })} disabled={busy}>
              {tt("Démarrer le live", "Start the live")}
            </button>
          )}
          {live.status === "en_cours" && (
            <button
              className="btn-ghost"
              onClick={() => {
                if (window.confirm(tt("Terminer le live ? C'est définitif : un live terminé ne peut pas être rouvert.", "End the live? This is final: an ended live cannot be reopened."))) {
                  void patchLive({ status: "termine" });
                }
              }}
              disabled={busy}
            >
              {tt("Terminer le live", "End the live")}
            </button>
          )}
          {live.status === "termine" && <span className="muted">{tt("Live terminé", "Live ended")}</span>}
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      {!compact && (
        <>
          <h2 className="display">Tracklist</h2>
          <div className="panel">
            {tracks.length === 0 ? (
              <p className="muted">{tt("Ajoute les disques de ton set, dans l'ordre de passage.", "Add the records of your set, in playing order.")}</p>
            ) : (
              <>
                <p className="hint" style={{ marginBottom: 12 }}>
                  {tt("Glisse un disque par la poignée ⋮⋮ (ou utilise ▲ ▼) pour changer l'ordre.", "Drag a record by the ⋮⋮ handle (or use ▲ ▼) to change the order.")}
                  {lockedCount > 0 && live.status !== "termine" && " " + tt("Les disques déjà passés sont verrouillés.", "Records already played are locked.")}
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
                      <span className="drag-handle" aria-hidden title={locked ? tt("Déjà passé", "Already played") : tt("Glisser pour déplacer", "Drag to move")}>
                        {locked ? "▪" : "⋮⋮"}
                      </span>
                      <span className="track-pos">{i + 1}</span>
                      <div>
                        <div>{t.title}</div>
                        <div className="track-artist">
                          {t.artist}
                          {t.price != null ? ` · ${formatPrice(t.price, lang)}` : ""}
                        </div>
                      </div>
                      <div className="row-actions">
                        {t.sale_mode !== "unreleased" || !locked ? (
                          <select
                            className="mode-select"
                            value={t.sale_mode}
                            onChange={(e) => void changeMode(t, e.target.value as Track["sale_mode"])}
                            aria-label={tt("Mode de vente", "Sale mode")}
                            disabled={live.status === "termine"}
                          >
                            <option value="online">{tt("En ligne", "Online")}</option>
                            {(djKind === "store" || t.sale_mode === "store") && <option value="store">{tt("En magasin", "In store")}</option>}
                            <option value="unreleased">Unreleased</option>
                          </select>
                        ) : null}
                        <button
                          className={`chip${t.sold ? " is-selected" : ""}`}
                          onClick={() => toggleSold(t)}
                          aria-pressed={t.sold}
                          title={tt("Indique si ce disque est vendu", "Shows whether this record is sold")}
                        >
                          {t.sold ? tt("Vendu", "Sold") : tt("Disponible", "Available")}
                        </button>
                        <button className="btn-ghost btn-icon" onClick={() => move(i, -1)} disabled={locked || i - 1 < lockedCount} aria-label={`${tt("Monter", "Move up")} ${t.title}`}>
                          ▲
                        </button>
                        <button className="btn-ghost btn-icon" onClick={() => move(i, 1)} disabled={locked || i === tracks.length - 1} aria-label={`${tt("Descendre", "Move down")} ${t.title}`}>
                          ▼
                        </button>
                        {!locked && (
                          <button className="btn-ghost" onClick={() => removeTrack(t.id)} aria-label={`${tt("Supprimer", "Delete")} ${t.title}`}>
                            {tt("Supprimer", "Delete")}
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
                  <label htmlFor="t-title">{tt("Titre", "Title")}</label>
                  <input id="t-title" name="title" required maxLength={160} />
                </div>
                <div className="field">
                  <label htmlFor="t-artist">{tt("Artiste", "Artist")}</label>
                  <input id="t-artist" name="artist" required maxLength={160} />
                </div>
                <div className="field">
                  <label htmlFor="t-mode">{tt("Mode de vente", "Sale mode")}</label>
                  <select id="t-mode" value={newMode} onChange={(e) => setNewMode(e.target.value as Track["sale_mode"])}>
                    <option value="online">{tt("En ligne (lien d'achat)", "Online (purchase link)")}</option>
                    {djKind === "store" && <option value="store">{tt("En magasin uniquement", "In store only")}</option>}
                    <option value="unreleased">{tt("Unreleased (inédit, ni lien ni achat)", "Unreleased (no link, not for sale)")}</option>
                  </select>
                </div>
                {newMode === "online" && (
                  <div className="field">
                    <label htmlFor="t-discogs">{tt("Lien d'achat", "Purchase link")}</label>
                    <input id="t-discogs" name="discogs_url" type="url" placeholder={tt("https://… (annonce du disque)", "https://… (record listing)")} />
                  </div>
                )}
                {newMode !== "unreleased" && (
                  <div className="field">
                    <label htmlFor="t-price">{tt("Prix (€)", "Price (€)")}</label>
                    <input id="t-price" name="price" type="number" min="0" step="0.01" />
                  </div>
                )}
                {newMode === "store" && (
                  <p className="hint field-wide">{tt("Les spectateurs verront « Disponible uniquement en magasin » avec l'adresse de ton magasin : de quoi les faire venir en boutique.", "Viewers will see “Available in store only” with your shop address: a way to bring them through the door.")}</p>
                )}
                {newMode === "unreleased" && (
                  <p className="hint field-wide">{tt("Le disque s'affiche avec la mention Unreleased, sans lien ni prix : idéal pour créer du buzz avant une sortie.", "The record shows an Unreleased badge, with no link or price: ideal to build buzz before a release.")}</p>
                )}
                <button className="btn" type="submit">
                  {tt("Ajouter le disque", "Add the record")}
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </>
  );
}
