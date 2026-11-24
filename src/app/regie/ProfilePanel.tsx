"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import CityPicker, { type CityValue } from "@/components/CityPicker";
import ImageUpload from "@/components/ImageUpload";
import { removeOldImage } from "@/lib/images";
import { getSupabase } from "@/lib/supabase";
import { safeHttpsUrl } from "@/lib/urls";
import { useT } from "@/lib/i18n";
import type { Dj } from "@/lib/types";

type Props = { dj: Dj; onSaved: (dj: Dj) => void };

/** Modification du profil public : nom, style, ville (placée sur la carte), biographie, boutique en ligne. */
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

  const t = useT();

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const sb = getSupabase();
    if (!sb) return;
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const { value: cityValue, typed: cityTyped } = cityRef.current;
    const discogsRaw = String(form.get("discogs_url") ?? "").trim();
    if (discogsRaw && !safeHttpsUrl(discogsRaw)) {
      setMsg({ ok: false, text: t("Le lien doit être une adresse web en https://…", "The link must be a web address starting with https://…") });
      return;
    }

    if (cityTyped.trim() && !cityValue) {
      setMsg({ ok: false, text: t("Choisis ta ville dans la liste déroulante pour qu'elle apparaisse sur la carte.", "Choose your city from the dropdown so it appears on the map.") });
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
    if (error) return setMsg({ ok: false, text: `${t("Enregistrement impossible", "Could not save")} : ${error.message}` });
    if (photo !== dj.photo_url) void removeOldImage(sb, dj.photo_url);
    onSaved(data as Dj);
    setMsg({ ok: true, text: `${t("Profil enregistré.", "Profile saved.")}${cityValue ? t(" Ta ville apparaît sur la carte.", " Your city appears on the map.") : ""}` });
  }

  return (
    <div className="panel">
      <div className="control-meta" style={{ marginTop: 0, justifyContent: "space-between", alignItems: "center" }}>
        <span>
          <strong>{dj.name}</strong>
          <span className="muted"> · {[dj.genre, dj.city].filter(Boolean).join(" · ") || t("profil à compléter", "profile to complete")}</span>
        </span>
        <span className="control-meta" style={{ marginTop: 0 }}>
          <Link href={`/dj/${dj.slug}`} className="btn-ghost">{t("Ma page publique", "My public page")} ↗</Link>
          <button className="btn-ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? t("Fermer", "Close") : t("Modifier mon profil", "Edit my profile")}
          </button>
        </span>
      </div>
      {open && (
        <form className="form-grid" onSubmit={save} style={{ marginTop: 18 }}>
          <div className="field">
            <label htmlFor="p-name">{t("Nom", "Name")}</label>
            <input id="p-name" name="name" required maxLength={80} defaultValue={dj.name} />
          </div>
          {dj.kind === "store" && (
            <div className="field">
              <label htmlFor="p-address">{t("Adresse du magasin", "Shop address")}</label>
              <input id="p-address" name="address" maxLength={200} defaultValue={dj.address ?? ""} />
            </div>
          )}
          <div className="field">
            <label htmlFor="p-genre">{t("Style(s)", "Style(s)")}</label>
            <input id="p-genre" name="genre" maxLength={80} defaultValue={dj.genre ?? ""} placeholder="House · Disco" />
          </div>
          <div className="field">
            <label htmlFor="p-city">{t("Ville", "City")}</label>
            <CityPicker id="p-city" initial={dj} onChange={(value, typed) => { cityRef.current = { value, typed }; }} />
          </div>
          <div className="field">
            <label htmlFor="p-discogs">{t("Boutique en ligne (lien)", "Online shop (link)")}</label>
            <input id="p-discogs" name="discogs_url" type="url" defaultValue={dj.discogs_url ?? ""} placeholder="https://…" />
          </div>
          <ImageUpload
            userId={dj.user_id ?? ""}
            kind="profile"
            label={t("Visuel (photo du DJ ou logo du magasin)", "Picture (DJ photo or shop logo)")}
            hint={t("JPEG, PNG ou WebP. Affiché sur ta page publique, à côté de ta présentation.", "JPEG, PNG or WebP. Shown on your public page, next to your introduction.")}
            value={photo}
            onChange={setPhoto}
            ratio="4 / 5"
          />
          <div className="field field-wide">
            <label htmlFor="p-bio">{t("Présentation", "Introduction")}</label>
            <textarea id="p-bio" name="bio" rows={3} maxLength={500} defaultValue={dj.bio ?? ""} />
          </div>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? t("Enregistrement…", "Saving…") : t("Enregistrer", "Save")}
          </button>
          {msg && <p className={`${msg.ok ? "info" : "error"} field-wide`}>{msg.text}</p>}
        </form>
      )}
    </div>
  );
}
