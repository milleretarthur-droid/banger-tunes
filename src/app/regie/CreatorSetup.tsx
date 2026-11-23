"use client";

import { useState, type FormEvent } from "react";
import { getSupabase } from "@/lib/supabase";
import { safeDiscogsUrl } from "@/lib/urls";
import { slugify } from "@/lib/slug";
import type { Dj } from "@/lib/types";

type Props = {
  userId: string;
  onCreated: (dj: Dj) => void;
};

export default function CreatorSetup({ userId, onCreated }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const sb = getSupabase();
    if (!sb) return;

    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const kind = form.get("kind") === "store" ? "store" : "dj";
    const genre = String(form.get("genre") ?? "").trim() || null;
    const discogsRaw = String(form.get("discogs_url") ?? "").trim();
    if (discogsRaw && !safeDiscogsUrl(discogsRaw)) {
      setError("Le lien doit être une adresse https://www.discogs.com/…");
      return;
    }

    setBusy(true);
    // Le suffixe aléatoire évite les collisions entre deux profils du même nom.
    for (let attempt = 0; attempt < 3; attempt++) {
      const slug = `${slugify(name, "profil")}-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error: err } = await sb
        .from("djs")
        .insert({ user_id: userId, kind, name, slug, genre, discogs_url: discogsRaw || null })
        .select()
        .single();
      if (!err) {
        setBusy(false);
        onCreated(data as Dj);
        return;
      }
      if (err.code !== "23505" || err.message.includes("user_id")) {
        setError(`Création impossible : ${err.message}`);
        setBusy(false);
        return;
      }
    }
    setError("Création impossible, réessaie dans un instant.");
    setBusy(false);
  }

  return (
    <>
      <h2 className="display">Crée ton profil</h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        Ton premier live est offert dès que ton profil est créé.
      </p>
      <form className="panel form-stack" onSubmit={submit}>
        <fieldset className="kind-pick">
          <legend>Tu es…</legend>
          <label className="kind-option">
            <input type="radio" name="kind" value="dj" defaultChecked /> DJ
          </label>
          <label className="kind-option">
            <input type="radio" name="kind" value="store" /> Magasin de vinyles
          </label>
        </fieldset>
        <div className="field">
          <label htmlFor="c-name">Nom affiché</label>
          <input id="c-name" name="name" required maxLength={80} />
        </div>
        <div className="field">
          <label htmlFor="c-genre">Style musical (facultatif)</label>
          <input id="c-genre" name="genre" maxLength={80} placeholder="Disco · Boogie" />
        </div>
        <div className="field">
          <label htmlFor="c-discogs">Ta page vendeur Discogs (facultatif)</label>
          <input id="c-discogs" name="discogs_url" type="url" placeholder="https://www.discogs.com/seller/…" />
        </div>
        <button className="btn" type="submit" disabled={busy}>
          Créer mon profil
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </>
  );
}
