"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import CityPicker, { type CityValue } from "@/components/CityPicker";
import ImageUpload from "@/components/ImageUpload";
import { removeOldImage } from "@/lib/images";
import { getSupabase } from "@/lib/supabase";
import { safeDiscogsUrl } from "@/lib/urls";
import type { Dj } from "@/lib/types";

type Props = { dj: Dj; onSaved: (dj: Dj) => void };

/** Modification du profil public : nom, style, ville (placée sur la carte), biographie, boutique Discogs. */
export default function ProfilePanel({ dj, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [photo, setPhoto] = useState<string | null>(dj.photo_url);
  // Ville : valeur choisie dans la liste, et texte tapé (pour détecter un choix non terminé).
  const cityRef = useRef<{ value: CityValue; typed: string }>({
    value: dj.city && dj.lat != null && dj.lng != null ? { city: dj.city, lat: dj.lat, lng: dj.lng } : null,
    typed: dj.city ?? "",
  });

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const sb = getSupabase();
    if (!sb) return;
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const { value: cityValue, typed: cityTyped } = cityRef.current;
    const discogsRaw = String(form.get("discogs_url") ?? "").trim();
    if (discogsRaw && !safeDiscogsUrl(discogsRaw)) {
      setMsg({ ok: false, text: "Le lien doit être une adresse https://www.discogs.com/…" });
      return;
    }

    if (cityTyped.trim() && !cityValue) {
      setMsg({ ok: false, text: "Choisis ta ville dans la liste déroulante pour qu'elle apparaisse sur la carte." });
      return;
    }

    setBusy(true);
    const patch: Partial<Dj> = {
      name,
      address: dj.kind === "store" ? String(form.get("address") ?? "").trim().slice(0, 200) || null : null,
      genre: String(form.get("genre") ?? "").trim() || null,
      bio: String(form.get("bio") ?? "").trim() || null,
      discogs_url: discogsRaw || null,
      photo_url: photo,
      city: cityValue?.city ?? null,
      lat: cityValue?.lat ?? null,
      lng: cityValue?.lng ?? null,
    };
    const { data, error } = await sb.from("djs").update(patch).eq("id", dj.id).select().single();
    setBusy(false);
    if (error) return setMsg({ ok: false, text: `Enregistrement impossible : ${error.message}` });
    if (photo !== dj.photo_url) void removeOldImage(sb, dj.photo_url);
    onSaved(data as Dj);
    setMsg({ ok: true, text: `Profil enregistré.${cityValue ? " Ta ville apparaît sur la carte." : ""}` });
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
          {dj.kind === "store" && (
            <div className="field">
              <label htmlFor="p-address">Adresse du magasin</label>
              <input id="p-address" name="address" maxLength={200} defaultValue={dj.address ?? ""} />
            </div>
          )}
          <div className="field">
            <label htmlFor="p-genre">Style(s)</label>
            <input id="p-genre" name="genre" maxLength={80} defaultValue={dj.genre ?? ""} placeholder="House · Disco" />
          </div>
          <div className="field">
            <label htmlFor="p-city">Ville</label>
            <CityPicker id="p-city" initial={dj} onChange={(value, typed) => { cityRef.current = { value, typed }; }} />
          </div>
          <div className="field">
            <label htmlFor="p-discogs">Boutique Discogs</label>
            <input id="p-discogs" name="discogs_url" type="url" defaultValue={dj.discogs_url ?? ""} placeholder="https://www.discogs.com/seller/…" />
          </div>
          <ImageUpload
            userId={dj.user_id ?? ""}
            kind="profile"
            label="Visuel (photo du DJ ou logo du magasin)"
            hint="JPEG, PNG ou WebP. Affiché sur ta page publique, à côté de ta présentation."
            value={photo}
            onChange={setPhoto}
            ratio="4 / 5"
          />
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
