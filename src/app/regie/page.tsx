"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import type { Dj, Live } from "@/lib/types";
import BillingPanel from "./BillingPanel";
import CreatorSetup from "./CreatorSetup";
import LiveControl from "./LiveControl";

export default function RegiePage() {
  const { session, ready } = useSession();
  const [dj, setDj] = useState<Dj | null>(null);
  const [djLoaded, setDjLoaded] = useState(false);
  const [lives, setLives] = useState<Live[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsOffer, setNeedsOffer] = useState(false);
  const [canPublish, setCanPublish] = useState<boolean | null>(null);
  const [billingKey, setBillingKey] = useState(0);

  const userId = session?.user.id ?? null;

  // --- Profil créateur et lives du compte connecté ---
  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !userId) {
      setDj(null);
      setDjLoaded(false);
      setLives([]);
      setSelectedId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: d } = await sb.from("djs").select("*").eq("user_id", userId).maybeSingle();
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
  }, [userId]);

  async function logout() {
    await getSupabase()?.auth.signOut();
  }

  async function createLive(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNeedsOffer(false);
    const sb = getSupabase();
    if (!sb || !dj) return;
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
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
      if (err.message.includes("NO_ENTITLEMENT")) {
        setNeedsOffer(true);
        setError("Tu n'as plus de live disponible. Choisis une offre pour en publier un nouveau.");
      } else {
        setError(`Création impossible : ${err.message}`);
      }
      return;
    }
    formEl.reset();
    setLives((prev) => [data as Live, ...prev]);
    setSelectedId((data as Live).id);
    setBillingKey((k) => k + 1);
  }

  function updateLive(updated: Live) {
    setLives((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }

  const selected = lives.find((l) => l.id === selectedId) ?? null;

  if (!isSupabaseConfigured) {
    return (
      <div className="regie">
        <h1 className="display">Espace créateur</h1>
        <div className="panel">
          Supabase n&apos;est pas encore connecté (variables d&apos;environnement manquantes).
        </div>
      </div>
    );
  }

  if (!ready) return <div className="regie muted">Chargement…</div>;

  if (!session) {
    return (
      <div className="regie">
        <h1 className="display">Espace créateur</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Écouter les lives est gratuit et sans compte. Pour publier les tiens, connecte-toi ou crée un compte.
        </p>
        <div className="control-meta">
          <Link href="/connexion?next=/regie" className="btn">
            Se connecter
          </Link>
          <Link href="/connexion?mode=inscription&next=/regie" className="btn-ghost">
            Créer un compte
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="regie">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16 }}>
        <div>
          <h1 className="display">Espace créateur</h1>
          <p className="muted">
            {dj ? `${dj.name} · ${dj.kind === "store" ? "Magasin de vinyles" : "DJ"}` : session.user.email}
          </p>
        </div>
        <button className="btn-ghost" onClick={logout}>
          Se déconnecter
        </button>
      </div>

      {djLoaded && !dj && <CreatorSetup userId={session.user.id} onCreated={setDj} />}

      {dj && (
        <>
          <h2 className="display">Mon offre</h2>
          <BillingPanel userId={session.user.id} refreshKey={billingKey} onCanPublish={setCanPublish} />

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
            <button className="btn" type="submit" disabled={canPublish === false}>
              Créer le live
            </button>
          </form>
          {canPublish === false && !error && (
            <p className="error">
              Aucun live disponible. <Link href="/tarifs" className="link">Choisis une offre</Link> pour en publier un.
            </p>
          )}
          {error && (
            <p className="error">
              {error}{" "}
              {needsOffer && (
                <Link href="/tarifs" className="link">
                  Voir les offres
                </Link>
              )}
            </p>
          )}

          {selected && <LiveControl key={selected.id} live={selected} onLiveChange={updateLive} />}
        </>
      )}
    </div>
  );
}
