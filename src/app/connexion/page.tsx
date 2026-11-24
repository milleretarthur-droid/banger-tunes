"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { safeNext, useSession } from "@/lib/useSession";
import CreatorFields from "@/components/CreatorFields";
import type { CityValue } from "@/components/CityPicker";
import { parseCreatorForm } from "@/lib/creator-profile";

type Mode = "login" | "signup";

export default function ConnexionPage() {
  const router = useRouter();
  const { session, ready } = useSession();
  const [mode, setMode] = useState<Mode>("login");
  const [next, setNext] = useState("/regie");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cityRef = useRef<{ value: CityValue; typed: string }>({ value: null, typed: "" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNext(safeNext(params.get("next")) ?? "/regie");
    if (params.get("mode") === "inscription") setMode("signup");
  }, []);

  useEffect(() => {
    if (ready && session) router.replace(next);
  }, [ready, session, next, router]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const sb = getSupabase();
    if (!sb) return;

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    // Inscription : on valide d'abord le profil (DJ ou magasin) avant de créer le compte.
    let profile = null;
    if (mode === "signup") {
      const parsed = parseCreatorForm(form, cityRef.current);
      if ("error" in parsed) return setError(parsed.error);
      profile = parsed.profile;
    }
    setBusy(true);

    if (mode === "login") {
      const { error: err } = await sb.auth.signInWithPassword({ email, password });
      if (err) setError("Email ou mot de passe incorrect.");
    } else {
      if (password.length < 8) {
        setError("Le mot de passe doit contenir au moins 8 caractères.");
        setBusy(false);
        return;
      }
      const { data, error: err } = await sb.auth.signUp({
        email,
        password,
        // Le profil est enregistré dans le compte, puis créé automatiquement à la première connexion.
        options: { emailRedirectTo: `${window.location.origin}${next}`, data: { signup_profile: profile } },
      });
      if (err) {
        setError("Inscription impossible. Vérifie ton email et réessaie.");
      } else if (!data.session) {
        setInfo("Un email de confirmation vient de t'être envoyé. Clique sur le lien qu'il contient pour activer ton compte.");
      }
    }
    setBusy(false);
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="regie">
        <h1 className="display">Connexion</h1>
        <div className="panel">Supabase n&apos;est pas encore connecté (variables d&apos;environnement manquantes).</div>
      </div>
    );
  }

  return (
    <div className="regie auth-box">
      <h1 className="display">{mode === "login" ? "Connexion" : "Créer un compte"}</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        Écouter les lives reste gratuit, sans compte. Un compte est réservé aux DJ et aux magasins qui veulent publier leurs lives.
      </p>

      <div className="tabs" role="tablist">
        <button
          role="tab"
          aria-selected={mode === "login"}
          className={mode === "login" ? "tab is-active" : "tab"}
          onClick={() => setMode("login")}
          type="button"
        >
          Se connecter
        </button>
        <button
          role="tab"
          aria-selected={mode === "signup"}
          className={mode === "signup" ? "tab is-active" : "tab"}
          onClick={() => setMode("signup")}
          type="button"
        >
          Créer un compte
        </button>
      </div>

      <form className="panel form-stack" onSubmit={submit}>
        {mode === "signup" && (
          <CreatorFields idPrefix="s" onCityChange={(value, typed) => { cityRef.current = { value, typed }; }} />
        )}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={mode === "signup" ? 8 : undefined}
            required
          />
          {mode === "signup" && <span className="hint">8 caractères minimum.</span>}
        </div>
        <button className="btn" type="submit" disabled={busy}>
          {mode === "login" ? "Se connecter" : "Créer mon compte"}
        </button>
        {error && <p className="error">{error}</p>}
        {info && <p className="info">{info}</p>}
      </form>
    </div>
  );
}
