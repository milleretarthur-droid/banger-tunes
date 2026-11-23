"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Dj, Live } from "@/lib/types";
import LiveControl from "./LiveControl";

export default function RegiePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [dj, setDj] = useState<Dj | null>(null);
  const [djLoaded, setDjLoaded] = useState(false);
  const [lives, setLives] = useState<Live[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- Session ---
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setAuthReady(true);
      return;
    }
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // --- Profil DJ et lives du compte connecté ---
  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !session) {
      setDj(null);
      setDjLoaded(false);
      setLives([]);
      setSelectedId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: d } = await sb
        .from("djs")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      setDj((d as Dj | null) ?? null);
      setDjLoaded(true);
      if (d) {
        const { data: l } = await sb
          .from("lives")
          .select("*")
          .eq("dj_id", d.id)
          .order("created_at", { ascending: false });
        if (!cancelled) setLives((l as Live[] | null) ?? []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const sb = getSupabase();
    if (!sb) return;
    const form = new FormData(e.currentTarget);
    const { error: err } = await sb.auth.signInWithPassword({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    if (err) setError("Email ou mot de passe incorrect.");
  }

  async function logout() {
    await getSupabase()?.auth.signOut();
  }

  async function createLive(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const sb = getSupabase();
    if (!sb || !dj) return;
    const form = new FormData(e.currentTarget);
    const when = String(form.get("scheduled_at") ?? "");
    const { data, error: err } = await sb
      .from("lives")
      .insert({
        dj_id: dj.id,
        title: String(form.get("title") ?? "").trim(),
        youtube_url: String(form.get("youtube_url") ?? "").trim() || null,
        scheduled_at: when ? new Date(when).toISOString() : null,
      })
      .select()
      .single();
    if (err) {
      setError(`Création impossible : ${err.message}`);
      return;
    }
    e.currentTarget.reset();
    setLives((prev) => [data as Live, ...prev]);
    setSelectedId((data as Live).id);
  }

  function updateLive(updated: Live) {
    setLives((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }

  const selected = lives.find((l) => l.id === selectedId) ?? null;

  if (!isSupabaseConfigured) {
    return (
      <div className="regie">
        <h1 className="display">Régie DJ</h1>
        <div className="panel">
          Supabase n&apos;est pas encore connecté (variables d&apos;environnement manquantes).
        </div>
      </div>
    );
  }

  if (!authReady) return <div className="regie muted">Chargement…</div>;

  if (!session) {
    return (
      <div className="regie">
        <h1 className="display">Espace DJ</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Les comptes sont créés par l&apos;équipe Live Banger.
        </p>
        <form className="panel form-grid" onSubmit={login}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Mot de passe</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <button className="btn" type="submit">
            Se connecter
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="regie">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16 }}>
        <div>
          <h1 className="display">Régie DJ</h1>
          {dj && <p className="muted">Connecté en tant que {dj.name}</p>}
        </div>
        <button className="btn-ghost" onClick={logout}>
          Se déconnecter
        </button>
      </div>

      {djLoaded && !dj && (
        <div className="panel" style={{ marginTop: 24 }}>
          Ton compte n&apos;est pas encore relié à un profil DJ. Contacte l&apos;équipe Live Banger.
        </div>
      )}

      {dj && (
        <>
          <h2 className="display">Mes lives</h2>
          {lives.length === 0 ? (
            <p className="muted">Aucun live pour l&apos;instant. Crée le premier ci-dessous.</p>
          ) : (
            <div className="live-pick">
              {lives.map((l) => (
                <button
                  key={l.id}
                  className={`btn-ghost${l.id === selectedId ? " is-selected" : ""}`}
                  onClick={() => setSelectedId(l.id)}
                >
                  {l.title}
                </button>
              ))}
            </div>
          )}

          <h2 className="display">Nouveau live</h2>
          <form className="panel form-grid" onSubmit={createLive}>
            <div className="field">
              <label htmlFor="title">Titre du live</label>
              <input id="title" name="title" required maxLength={120} />
            </div>
            <div className="field">
              <label htmlFor="youtube_url">Lien YouTube du live</label>
              <input id="youtube_url" name="youtube_url" type="url" placeholder="https://www.youtube.com/live/…" />
            </div>
            <div className="field">
              <label htmlFor="scheduled_at">Date et heure</label>
              <input id="scheduled_at" name="scheduled_at" type="datetime-local" />
            </div>
            <button className="btn" type="submit">
              Créer le live
            </button>
          </form>
          {error && <p className="error">{error}</p>}

          {selected && <LiveControl key={selected.id} live={selected} onLiveChange={updateLive} />}
        </>
      )}
    </div>
  );
}
