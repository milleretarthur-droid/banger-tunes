"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Live, Track } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { safeDiscogsUrl } from "@/lib/urls";

type Props = {
  live: Live;
  onLiveChange: (live: Live) => void;
};

const STATUS_LABEL = {
  a_venir: "À venir",
  en_cours: "En direct",
  termine: "Terminé",
} as const;

export default function LiveControl({ live, onLiveChange }: Props) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let cancelled = false;
    sb.from("tracklist")
      .select("*")
      .eq("live_id", live.id)
      .order("position")
      .then(({ data }) => {
        if (!cancelled) setTracks((data as Track[] | null) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [live.id]);

  const current = tracks.find((t) => t.position === live.current_index) ?? null;
  const next = tracks.find((t) => t.position > live.current_index) ?? null;
  const prev = [...tracks].reverse().find((t) => t.position < live.current_index) ?? null;

  async function patchLive(patch: Partial<Pick<Live, "status" | "current_index">>) {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    setError(null);
    const { data, error: err } = await sb.from("lives").update(patch).eq("id", live.id).select().single();
    setBusy(false);
    if (err) {
      setError(`Mise à jour impossible : ${err.message}`);
      return;
    }
    onLiveChange(data as Live);
  }

  // "Next" lance aussi le live s'il n'était pas encore démarré.
  const goNext = () => next && patchLive({ current_index: next.position, status: "en_cours" });
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
    setTracks((prevTracks) => [...prevTracks, data as Track]);
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
    setTracks((prevTracks) => prevTracks.filter((t) => t.id !== id));
  }

  return (
    <>
      <h2 className="display">Régie · {live.title}</h2>
      <div className="panel">
        <div className="control-now">
          <p className="panel-label">
            {STATUS_LABEL[live.status]} · disque en cours
          </p>
          <p className="big">{current ? `${current.title} — ${current.artist}` : "Aucun disque lancé"}</p>
          {next && <p className="muted">Ensuite : {next.title} — {next.artist}</p>}
        </div>

        <div className="control-buttons">
          <button className="btn-ghost" onClick={goPrev} disabled={busy || live.current_index === 0}>
            ← Précédent
          </button>
          <button className="btn btn-next" onClick={goNext} disabled={busy || !next}>
            {next ? "NEXT →" : "Fin de la tracklist"}
          </button>
        </div>

        <div className="control-meta">
          {live.status !== "en_cours" && live.status !== "termine" && (
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

      <h2 className="display">Tracklist</h2>
      <div className="panel">
        {tracks.length === 0 ? (
          <p className="muted">Ajoute les disques de ton set, dans l&apos;ordre de passage.</p>
        ) : (
          tracks.map((t) => (
            <div key={t.id} className={`edit-row${t.position === live.current_index ? " is-current" : ""}`}>
              <span className="track-pos">{t.position}</span>
              <div>
                <div>{t.title}</div>
                <div className="track-artist">
                  {t.artist}
                  {t.price != null ? ` · ${formatPrice(t.price)}` : ""}
                </div>
              </div>
              <button className="btn-ghost" onClick={() => removeTrack(t.id)} aria-label={`Supprimer ${t.title}`}>
                Supprimer
              </button>
            </div>
          ))
        )}

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
      </div>
    </>
  );
}
