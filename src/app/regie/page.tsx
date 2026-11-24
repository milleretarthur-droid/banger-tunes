"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DateTimePicker from "@/components/DateTimePicker";
import { formatDate } from "@/lib/format";
import { randomSuffix, slugify } from "@/lib/slug";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { youtubeEmbedUrl } from "@/lib/youtube";
import { useSession } from "@/lib/useSession";
import type { Dj, Live } from "@/lib/types";
import BillingPanel from "./BillingPanel";
import CreatorSetup from "./CreatorSetup";
import ProfilePanel from "./ProfilePanel";

export default function RegiePage() {
  const { session, ready } = useSession();
  const [dj, setDj] = useState<Dj | null>(null);
  const [djLoaded, setDjLoaded] = useState(false);
  const [lives, setLives] = useState<Live[]>([]);
  const [when, setWhen] = useState<Date | null>(null);
  const router = useRouter();
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
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const youtube = String(form.get("youtube_url") ?? "").trim();
    if (youtube && !youtubeEmbedUrl(youtube)) {
      setError("Ce lien YouTube n'est pas reconnu. Colle l'adresse de ton live (youtube.com/watch…, youtube.com/live/… ou youtu.be/…).");
      return;
    }

    // Adresse lisible : /regie/deep-house-sunset-mix ; un suffixe est ajouté si elle existe déjà.
    let created: Live | null = null;
    for (let attempt = 0; attempt < 4 && !created; attempt++) {
      const base = slugify(title);
      const slug = attempt === 0 ? base : `${base}-${randomSuffix()}`;
      const { data, error: err } = await sb
        .from("lives")
        .insert({
          dj_id: dj.id,
          title,
          slug,
          youtube_url: youtube || null,
          scheduled_at: when ? when.toISOString() : null,
        })
        .select()
        .single();

      if (!err) {
        created = data as Live;
        break;
      }
      if (err.message.includes("NO_ENTITLEMENT")) {
        setNeedsOffer(true);
        setError("Tu n'as plus de live disponible. Choisis une offre pour en publier un nouveau.");
        return;
      }
      if (err.code !== "23505") {
        setError(`Création impossible : ${err.message}`);
        return;
      }
    }
    if (!created) {
      setError("Création impossible : cette adresse est déjà prise, change légèrement le titre.");
      return;
    }
    setBillingKey((k) => k + 1);
    router.push(`/regie/${created.slug}`);
  }

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
            {dj ? dj.name : session.user.email}
          </p>
        </div>
        <button className="btn-ghost" onClick={logout}>
          Se déconnecter
        </button>
      </div>

      {djLoaded && !dj && <CreatorSetup userId={session.user.id} onCreated={setDj} />}

      {dj && (
        <>
          <h2 className="display">Mon profil</h2>
          <ProfilePanel dj={dj} onSaved={setDj} />

          <h2 className="display">Mon offre</h2>
          <BillingPanel userId={session.user.id} refreshKey={billingKey} onCanPublish={setCanPublish} />

          <h2 className="display">Mes lives</h2>
          {lives.length === 0 ? (
            <p className="muted">Aucun live pour l&apos;instant. Crée le premier ci-dessous.</p>
          ) : (
            <div className="live-list">
              {lives.map((l) => (
                <Link key={l.id} href={`/regie/${l.slug}`} className="live-item">
                  <span className="live-item-title">{l.title}</span>
                  <span className="live-item-meta">
                    <span className={`status-tag status-${l.status}`}>
                      {l.status === "en_cours" ? "En direct" : l.status === "termine" ? "Terminé" : "À venir"}
                    </span>
                    {l.scheduled_at ? formatDate(l.scheduled_at) : "Date à définir"}
                  </span>
                  <span className="live-item-go">Ouvrir la régie →</span>
                </Link>
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
              <input id="youtube_url" name="youtube_url" type="url" placeholder="https://www.youtube.com/live/… (facultatif, modifiable plus tard)" />
            </div>
            <div className="field field-wide">
              <label htmlFor="scheduled_at">Date et heure</label>
              <DateTimePicker id="scheduled_at" onChange={setWhen} />
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

          <p className="hint" style={{ marginTop: 28 }}>
            Première fois ? Suis le <Link href="/guide" className="link">guide pas à pas</Link>.
          </p>
        </>
      )}
    </div>
  );
}
