"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { safeNext, useSession } from "@/lib/useSession";
import CreatorFields from "@/components/CreatorFields";
import type { CityValue } from "@/components/CityPicker";
import { parseCreatorForm } from "@/lib/creator-profile";
import { useT } from "@/lib/i18n";

type Mode = "login" | "signup";

export default function ConnexionPage() {
  const router = useRouter();
  const t = useT();
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
      const parsed = parseCreatorForm(form, cityRef.current, t);
      if ("error" in parsed) return setError(parsed.error);
      profile = parsed.profile;
    }
    setBusy(true);

    if (mode === "login") {
      const { error: err } = await sb.auth.signInWithPassword({ email, password });
      if (err) setError(t("Email ou mot de passe incorrect.", "Incorrect email or password."));
    } else {
      if (password.length < 8) {
        setError(t("Le mot de passe doit contenir au moins 8 caractères.", "The password must be at least 8 characters long."));
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
        setError(t("Inscription impossible. Vérifie ton email et réessaie.", "Sign-up failed. Check your email address and try again."));
      } else if (!data.session) {
        setInfo(t("Un email de confirmation vient de t'être envoyé. Clique sur le lien qu'il contient pour activer ton compte.", "A confirmation email has just been sent to you. Click the link inside to activate your account."));
      }
    }
    setBusy(false);
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="regie">
        <h1 className="display">{t("Connexion", "Log in")}</h1>
        <div className="panel">{t("Supabase n'est pas encore connecté (variables d'environnement manquantes).", "Supabase is not connected yet (missing environment variables).")}</div>
      </div>
    );
  }

  return (
    <div className="regie auth-box">
      <h1 className="display">{mode === "login" ? t("Connexion", "Log in") : t("Créer un compte", "Create an account")}</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        {t("Écouter les lives reste gratuit, sans compte. Un compte est réservé aux DJ et aux magasins qui veulent publier leurs lives.", "Listening to lives is free, no account needed. An account is for DJs and record shops who want to publish lives.")}
      </p>

      <div className="tabs" role="tablist">
        <button
          role="tab"
          aria-selected={mode === "login"}
          className={mode === "login" ? "tab is-active" : "tab"}
          onClick={() => setMode("login")}
          type="button"
        >
          {t("Se connecter", "Log in")}
        </button>
        <button
          role="tab"
          aria-selected={mode === "signup"}
          className={mode === "signup" ? "tab is-active" : "tab"}
          onClick={() => setMode("signup")}
          type="button"
        >
          {t("Créer un compte", "Create an account")}
        </button>
      </div>

      <form className="panel form-stack" onSubmit={submit}>
        {mode === "signup" && (
          <CreatorFields idPrefix="s" onCityChange={(value, typed) => { cityRef.current = { value, typed }; }} />
        )}
        <div className="field">
          <label htmlFor="email">{t("Email", "Email")}</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">{t("Mot de passe", "Password")}</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={mode === "signup" ? 8 : undefined}
            required
          />
          {mode === "signup" && <span className="hint">{t("8 caractères minimum.", "Minimum 8 characters.")}</span>}
        </div>
        <button className="btn" type="submit" disabled={busy}>
          {mode === "login" ? t("Se connecter", "Log in") : t("Créer mon compte", "Create my account")}
        </button>
        {mode === "signup" && (
          <p className="hint">
            {t("En créant un compte, tu acceptes les ", "By creating an account, you accept the ")}
            <a className="legal-link" href="/cgu">{t("conditions générales", "terms")}</a>
            {t(" et la ", " and the ")}
            <a className="legal-link" href="/confidentialite">{t("politique de confidentialité", "privacy policy")}</a>.
          </p>
        )}
        {error && <p className="error">{error}</p>}
        {info && <p className="info">{info}</p>}
      </form>
    </div>
  );
}
