"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CityPicker, { type CityValue } from "@/components/CityPicker";
import { createCreatorProfile, sanitizeStoredProfile } from "@/lib/creator-profile";
import DateTimePicker from "@/components/DateTimePicker";
import ImageUpload from "@/components/ImageUpload";
import { formatDate } from "@/lib/format";
import { randomSuffix, slugify } from "@/lib/slug";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { youtubeEmbedUrl } from "@/lib/youtube";
import { useSession } from "@/lib/useSession";
import { useLang, useT } from "@/lib/i18n";
import type { Dj, Live } from "@/lib/types";
import BillingPanel from "./BillingPanel";
import CreatorSetup from "./CreatorSetup";
import ProfilePanel from "./ProfilePanel";

export default function RegiePage() {
  const lang = useLang();
  const t = useT();
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
  const [cover, setCover] = useState<string | null>(null);
  const cityRef = useRef<{ value: CityValue; typed: string }>({ value: null, typed: "" });
  const autoTried = useRef(false);
  const [autoNotice, setAutoNotice] = useState<string | null>(null);

  const userId = session?.user.id ?? null;

  // --- Création automatique du profil saisi à l'inscription (une seule tentative) ---
  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !session || !djLoaded || dj || autoTried.current) return;
    const stored = sanitizeStoredProfile(session.user.user_metadata?.signup_profile);
    if (!stored) return;
    autoTried.current = true;
    (async () => {
      const res = await createCreatorProfile(sb, session.user.id, stored, t);
      if ("error" in res) {
        setAutoNotice(t("Ton profil n'a pas pu être créé automatiquement. Vérifie les informations ci-dessous.", "Your profile could not be created automatically. Please check the details below."));
        return;
      }
      setDj(res.dj);
      void sb.auth.updateUser({ data: { signup_profile: null } });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, djLoaded, dj]);

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
      setError(t("Ce lien YouTube n'est pas reconnu. Colle l'adresse de ton live (youtube.com/watch…, youtube.com/live/… ou youtu.be/…).", "This YouTube link is not recognised. Paste your live's address (youtube.com/watch…, youtube.com/live/… or youtu.be/…)."));
      return;
    }

    // Ville (si le profil n'en a pas encore) : choisie dans la liste pour apparaître sur la carte.
    const needsCity = dj.lat == null || dj.lng == null;
    const { value: cityValue, typed: cityTyped } = cityRef.current;
    if (needsCity && cityTyped.trim() && !cityValue) {
      setError(t("Choisis ta ville dans la liste déroulante pour que ton live apparaisse sur la carte.", "Choose your city from the dropdown so your live appears on the map."));
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
          cover_url: cover,
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
        setError(t("Tu n'as plus de live disponible. Choisis une offre pour en publier un nouveau.", "You have no live left. Choose a plan to publish a new one."));
        return;
      }
      if (err.code !== "23505") {
        setError(`${t("Création impossible", "Could not create the live")} : ${err.message}`);
        return;
      }
    }
    if (!created) {
      setError(t("Création impossible : cette adresse est déjà prise, change légèrement le titre.", "Could not create the live: this address is already taken, change the title slightly."));
      return;
    }
    if (needsCity && cityValue) {
      const { data: updated } = await sb
        .from("djs")
        .update({ city: cityValue.city, lat: cityValue.lat, lng: cityValue.lng })
        .eq("id", dj.id)
        .select()
        .single();
      if (updated) setDj(updated as Dj);
    }
    setBillingKey((k) => k + 1);
    router.push(`/regie/${created.slug}`);
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="regie">
        <h1 className="display">{t("Espace créateur", "Creator space")}</h1>
        <div className="panel">
          {t("Supabase n'est pas encore connecté (variables d'environnement manquantes).", "Supabase is not connected yet (missing environment variables).")}
        </div>
      </div>
    );
  }

  if (!ready) return <div className="regie muted">{t("Chargement…", "Loading…")}</div>;

  if (!session) {
    return (
      <div className="regie">
        <h1 className="display">{t("Espace créateur", "Creator space")}</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          {t("Écouter les lives est gratuit et sans compte. Pour publier les tiens, connecte-toi ou crée un compte.", "Listening to lives is free, no account needed. To publish your own, log in or create an account.")}
        </p>
        <div className="control-meta">
          <Link href="/connexion?next=/regie" className="btn">
            {t("Se connecter", "Log in")}
          </Link>
          <Link href="/connexion?mode=inscription&next=/regie" className="btn-ghost">
            {t("Créer un compte", "Create an account")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="regie">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16 }}>
        <div>
          <h1 className="display">{t("Espace créateur", "Creator space")}</h1>
          <p className="muted">
            {dj ? dj.name : session.user.email}
          </p>
        </div>
        <div className="control-meta">
          {dj && (
            <Link href="/guide" className="btn-ghost">
              {t("📖 Guide du créateur", "📖 Creator guide")}
            </Link>
          )}
          {dj && (
            <Link href="/tarifs" className="btn-ghost">
              {t("💳 Offres et tarifs", "💳 Plans and pricing")}
            </Link>
          )}
          <button className="btn-ghost" onClick={logout}>
            {t("Se déconnecter", "Log out")}
          </button>
        </div>
      </div>

      {djLoaded && !dj && <CreatorSetup userId={session.user.id} notice={autoNotice} onCreated={setDj} />}

      {dj && (
        <>
          <h2 className="display">{t("Mon profil", "My profile")}</h2>
          <ProfilePanel dj={dj} onSaved={setDj} />

          <h2 className="display">{t("Mon offre", "My plan")}</h2>
          <BillingPanel userId={session.user.id} refreshKey={billingKey} onCanPublish={setCanPublish} />

          <h2 className="display">{t("Mes lives", "My lives")}</h2>
          {lives.length === 0 ? (
            <p className="muted">{t("Aucun live pour l'instant. Crée le premier ci-dessous.", "No live yet. Create your first one below.")}</p>
          ) : (
            <div className="live-list">
              {lives.map((l) => (
                <Link key={l.id} href={`/regie/${l.slug}`} className="live-item">
                  <span className="live-item-title">{l.title}</span>
                  <span className="live-item-meta">
                    <span className={`status-tag status-${l.status}`}>
                      {l.status === "en_cours" ? t("En direct", "Live") : l.status === "termine" ? t("Terminé", "Ended") : t("À venir", "Coming up")}
                    </span>
                    {l.scheduled_at ? formatDate(l.scheduled_at, lang) : t("Date à définir", "Date to be set")}
                  </span>
                  <span className="live-item-go">{t("Ouvrir la régie", "Open control room")} →</span>
                </Link>
              ))}
            </div>
          )}

          <h2 className="display">{t("Nouveau live", "New live")}</h2>
          <form className="panel form-grid" onSubmit={createLive}>
            <div className="field">
              <label htmlFor="title">{t("Titre du live", "Live title")}</label>
              <input id="title" name="title" required maxLength={120} />
            </div>
            <div className="field">
              <label htmlFor="youtube_url">{t("Lien YouTube du live", "YouTube link of the live")}</label>
              <input id="youtube_url" name="youtube_url" type="url" placeholder={t("https://www.youtube.com/live/… (facultatif, modifiable plus tard)", "https://www.youtube.com/live/… (optional, can be changed later)")} />
            </div>
            <div className="field field-wide">
              <label htmlFor="scheduled_at">{t("Date et heure", "Date and time")}</label>
              <DateTimePicker id="scheduled_at" onChange={setWhen} />
            </div>
            {userId && (
              <ImageUpload
                userId={userId}
                kind="cover"
                label={t("Cover du live (facultatif)", "Live cover (optional)")}
                hint={t("Une belle image donne envie de cliquer. Format paysage conseillé (JPEG, PNG ou WebP).", "A nice picture makes people want to click. Landscape format recommended (JPEG, PNG or WebP).")}
                value={cover}
                onChange={setCover}
              />
            )}
            {dj && (dj.lat == null || dj.lng == null) && (
              <div className="field field-wide">
                <label htmlFor="live-city">{t("Ta ville (pour apparaître sur la carte)", "Your city (to appear on the map)")}</label>
                <CityPicker id="live-city" onChange={(value, typed) => { cityRef.current = { value, typed }; }} />
              </div>
            )}
            <button className="btn" type="submit" disabled={canPublish === false}>
              {t("Créer le live", "Create the live")}
            </button>
          </form>
          {canPublish === false && !error && (
            <p className="error">
              {t("Aucun live disponible.", "No live available.")} <Link href="/tarifs" className="link">{t("Choisis une offre", "Choose a plan")}</Link> {t("pour en publier un.", "to publish one.")}
            </p>
          )}
          {error && (
            <p className="error">
              {error}{" "}
              {needsOffer && (
                <Link href="/tarifs" className="link">
                  {t("Voir les offres", "See plans")}
                </Link>
              )}
            </p>
          )}

          <p className="hint" style={{ marginTop: 28 }}>
            {t("Première fois ? Suis le", "First time? Follow the")} <Link href="/guide" className="link">{t("guide pas à pas", "step-by-step guide")}</Link>.
          </p>
        </>
      )}
    </div>
  );
}
