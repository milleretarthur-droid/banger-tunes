"use client";

import { useState } from "react";
import CityPicker, { type CityValue } from "@/components/CityPicker";

type Props = {
  idPrefix: string;
  onCityChange: (value: CityValue, typed: string) => void;
};

/**
 * Champs de profil créateur. Le type de compte (DJ ou magasin) change les questions :
 * un DJ donne son nom et sa ville, un magasin son nom, son adresse et sa ville.
 */
export default function CreatorFields({ idPrefix, onCityChange }: Props) {
  const [kind, setKind] = useState<"dj" | "store">("dj");
  const store = kind === "store";

  return (
    <>
      <fieldset className="kind-pick">
        <legend>Tu es…</legend>
        <label className="kind-option">
          <input type="radio" name="kind" value="dj" checked={!store} onChange={() => setKind("dj")} /> DJ
        </label>
        <label className="kind-option">
          <input type="radio" name="kind" value="store" checked={store} onChange={() => setKind("store")} /> Magasin de vinyles
        </label>
      </fieldset>
      <div className="field">
        <label htmlFor={`${idPrefix}-name`}>{store ? "Nom du magasin" : "Nom de DJ"}</label>
        <input id={`${idPrefix}-name`} name="name" required maxLength={80} autoComplete="organization" />
      </div>
      {store && (
        <div className="field">
          <label htmlFor={`${idPrefix}-address`}>Adresse du magasin</label>
          <input id={`${idPrefix}-address`} name="address" required maxLength={200} autoComplete="street-address" placeholder="12 rue des Disques, 44000" />
          <span className="hint">Elle sera affichée sur la page publique de ton magasin.</span>
        </div>
      )}
      <div className="field">
        <label htmlFor={`${idPrefix}-city`}>Ville</label>
        <CityPicker id={`${idPrefix}-city`} onChange={onCityChange} />
        <span className="hint">Elle place tes lives sur la carte.</span>
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-genre`}>{store ? "Styles en rayon (facultatif)" : "Style musical (facultatif)"}</label>
        <input id={`${idPrefix}-genre`} name="genre" maxLength={80} placeholder="Disco · Boogie" />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-discogs`}>{store ? "Ta boutique Discogs (facultatif)" : "Ta page vendeur Discogs (facultatif)"}</label>
        <input id={`${idPrefix}-discogs`} name="discogs_url" type="url" placeholder="https://www.discogs.com/seller/…" />
      </div>
    </>
  );
}
