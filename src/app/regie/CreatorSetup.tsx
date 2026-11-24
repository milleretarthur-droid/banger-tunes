"use client";

import { useRef, useState, type FormEvent } from "react";
import { getSupabase } from "@/lib/supabase";
import CreatorFields from "@/components/CreatorFields";
import type { CityValue } from "@/components/CityPicker";
import { createCreatorProfile, parseCreatorForm } from "@/lib/creator-profile";
import type { Dj } from "@/lib/types";

type Props = {
  userId: string;
  /** Message affiché si la création automatique à l'inscription a échoué. */
  notice?: string | null;
  onCreated: (dj: Dj) => void;
};

/** Affiché seulement si un compte n'a pas de profil (cas rare : la création se fait normalement à l'inscription). */
export default function CreatorSetup({ userId, notice, onCreated }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cityRef = useRef<{ value: CityValue; typed: string }>({ value: null, typed: "" });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const sb = getSupabase();
    if (!sb) return;
    const parsed = parseCreatorForm(new FormData(e.currentTarget), cityRef.current);
    if ("error" in parsed) return setError(parsed.error);

    setBusy(true);
    const res = await createCreatorProfile(sb, userId, parsed.profile);
    setBusy(false);
    if ("error" in res) return setError(res.error);
    onCreated(res.dj);
  }

  return (
    <>
      <h2 className="display">Crée ton profil</h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        Ton premier live est offert dès que ton profil est créé.
      </p>
      {notice && <p className="error">{notice}</p>}
      <form className="panel form-stack" onSubmit={submit}>
        <CreatorFields idPrefix="c" onCityChange={(value, typed) => { cityRef.current = { value, typed }; }} />
        <button className="btn" type="submit" disabled={busy}>
          Créer mon profil
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </>
  );
}
