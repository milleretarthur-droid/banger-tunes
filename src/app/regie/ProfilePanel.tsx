"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { geocodeCity } from "@/lib/geocode";
import { getSupabase } from "@/lib/supabase";
import { safeDiscogsUrl } from "@/lib/urls";
import type { Dj } from "@/lib/types";

type Props = { dj: Dj; onSaved: (dj: Dj) => void };

/** Modification du profil public : nom, style, ville (placée sur la carte), biographie, boutique Discogs. */
export default function ProfilePanel({ dj, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const sb = getSupabase();
    if (!sb) return;
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const city = String(form.get("city") ?? "").trim();
    const discogsRaw = String(form.get("discogs_url") ?? "").trim();
    if (discogsRaw && !safeDiscogsUrl(discogsRaw)) {
      setMsg({ ok: false, text: "Le lien doit être une adresse https://www.discogs.com/…" });
      return;
    }

    setBusy(true);
    const patch: Partial<Dj> = {
      name,
      genre: String(form.get("genre") ?? "").trim() || null,
      bio: String(form.get("bio") ?? "").trim() || null,
      discogs_url: discogsRaw || null,
      city: city || null,
    };
    let note = "";
    if (city !== (dj.city ?? "") || (city && dj.lat == null)) {
      if (!city) {
        patch.lat = null;
        patch.lng = null;
      } else {
        const place = await geocodeCity(city);
        patch.lat = place?.lat ?? null;
        patch.lng = place?.lng ?? null;
        note = place ? " Ta ville apparaît sur la carte." : " Ville introuvable : essaie « Ville, Pays » pour apparaître sur la carte.";
      }
    }
    const { data, error } = await sb.from("djs").update(patch).eq("id", dj.id).select().single();
    setBusy(false);
    if (error) return setMsg({ ok: false, text: `Enregistrement impossible : ${error.message}` });
    onSaved(data as Dj);
    setMsg({ ok: true, text: `Profil enregistré.${note}` });
  }

  return (
    <div className="panel">
      <div className="control-meta" style={{ marginTop: 0, justifyContent: "space-between", alignItems: "center" }}>
        <span>
          <strong>{dj.name}</strong>
          <span className="muted"> · {[dj.genre, dj.city].filter(Boolean).join(" · ") || "profil à compléter"}</span>
        </span>
        <span className="control-meta" style={{ marginTop: 0 }}>
          <Link href={`/dj/${dj.slug}`} className="btn-ghost">Ma page publique ↗</Link>
          <button className="btn-ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? "Fermer" : "Modifier mon profil"}
          </button>
        </span>
      </div>
      {open && (
        <form className="form-grid" onSubmit={save} style={{ marginTop: 18 }}>
          <div className="field">
            <label htmlFor="p-name">Nom</label>
            <input id="p-name" name="name" required maxLength={80} defaultValue={dj.name} />
          </div>
          <div className="field">
            <label htmlFor="p-genre">Style(s)</label>
            <input id="p-genre" name="genre" maxLength={80} defaultValue={dj.genre ?? ""} placeholder="House · Disco" />
          </div>
          <div className="field">
            <label htmlFor="p-city">Ville</label>
            <input id="p-city" name="city" maxLength={80} defaultValue={dj.city ?? ""} placeholder="Nantes, France" />
          </div>
          <div className="field">
            <label htmlFor="p-discogs">Boutique Discogs</label>
            <input id="p-discogs" name="discogs_url" type="url" defaultValue={dj.discogs_url ?? ""} placeholder="https://www.discogs.com/seller/…" />
          </div>
          <div className="field field-wide">
            <label htmlFor="p-bio">Présentation</label>
            <textarea id="p-bio" name="bio" rows={3} maxLength={500} defaultValue={dj.bio ?? ""} />
          </div>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Enregistrement…" : "Enregistrer"}
          </button>
          {msg && <p className={`${msg.ok ? "info" : "error"} field-wide`}>{msg.text}</p>}
        </form>
      )}
    </div>
  );
}
