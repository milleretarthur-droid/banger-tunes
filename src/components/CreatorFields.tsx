"use client";

import { useState } from "react";
import CityPicker, { type CityValue } from "@/components/CityPicker";
import { useT } from "@/lib/i18n";

type Props = {
  idPrefix: string;
  onCityChange: (value: CityValue, typed: string) => void;
};

/**
 * Champs de profil créateur. Le type de compte (DJ ou magasin) change les questions :
 * un DJ donne son nom et sa ville, un magasin son nom, son adresse et sa ville.
 */
export default function CreatorFields({ idPrefix, onCityChange }: Props) {
  const t = useT();
  const [kind, setKind] = useState<"dj" | "store">("dj");
  const store = kind === "store";

  return (
    <>
      <fieldset className="kind-pick">
        <legend>{t("Tu es…", "You are…")}</legend>
        <label className="kind-option">
          <input type="radio" name="kind" value="dj" checked={!store} onChange={() => setKind("dj")} /> DJ
        </label>
        <label className="kind-option">
          <input type="radio" name="kind" value="store" checked={store} onChange={() => setKind("store")} /> {t("Magasin de vinyles", "Record shop")}
        </label>
      </fieldset>
      <div className="field">
        <label htmlFor={`${idPrefix}-name`}>{store ? t("Nom du magasin", "Shop name") : t("Nom de DJ", "DJ name")}</label>
        <input id={`${idPrefix}-name`} name="name" required maxLength={80} autoComplete="organization" />
      </div>
      {store && (
        <div className="field">
          <label htmlFor={`${idPrefix}-address`}>{t("Adresse du magasin", "Shop address")}</label>
          <input id={`${idPrefix}-address`} name="address" required maxLength={200} autoComplete="street-address" placeholder="12 rue des Disques, 44000" />
          <span className="hint">{t("Elle sera affichée sur la page publique de ton magasin.", "It will be shown on your shop's public page.")}</span>
        </div>
      )}
      <div className="field">
        <label htmlFor={`${idPrefix}-city`}>{t("Ville", "City")}</label>
        <CityPicker id={`${idPrefix}-city`} onChange={onCityChange} />
        <span className="hint">{t("Elle place tes lives sur la carte.", "It places your lives on the map.")}</span>
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-genre`}>{store ? t("Styles en rayon (facultatif)", "Styles in store (optional)") : t("Style musical (facultatif)", "Music style (optional)")}</label>
        <input id={`${idPrefix}-genre`} name="genre" maxLength={80} placeholder="Disco · Boogie" />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-discogs`}>{t("Lien de ta boutique en ligne (facultatif)", "Link to your online shop (optional)")}</label>
        <input id={`${idPrefix}-discogs`} name="discogs_url" type="url" placeholder="https://…" />
      </div>
    </>
  );
}
