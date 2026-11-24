"use client";

import { use, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DateTimePicker from "@/components/DateTimePicker";
import ImageUpload from "@/components/ImageUpload";
import { removeOldImage } from "@/lib/images";
import { formatDate } from "@/lib/format";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { youtubeEmbedUrl } from "@/lib/youtube";
import type { Live } from "@/lib/types";
import LiveControl from "../LiveControl";
import { useOwnedLive } from "../useOwnedLive";
import { useLang, useT } from "@/lib/i18n";

type Props = { params: Promise<{ slug: string }> };

const STATUS_LABEL = {
  fr: { a_venir: "À venir", en_cours: "En direct", termine: "Terminé" },
  en: { a_venir: "Coming up", en_cours: "Live", termine: "Ended" },
} as const;

export default function RegieLivePage({ params }: Props) {
  const { slug } = use(params);
  const lang = useLang();
  const t = useT();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const { session, ready, live, setLive, dj, state } = useOwnedLive(slug);
  const [when, setWhen] = useState<Date | null | undefined>(undefined);
  const [cover, setCover] = useState<string | null | undefined>(undefined);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const sb = getSupabase();
    if (!sb || !live) return;
    const form = new FormData(e.currentTarget);
    const youtube = String(form.get("youtube_url") ?? "").trim();
    if (youtube && !youtubeEmbedUrl(youtube)) {
      setMsg({ ok: false, text: t("Ce lien YouTube n'est pas reconnu (youtube.com/watch…, youtube.com/live/… ou youtu.be/…).", "This YouTube link is not recognised (youtube.com/watch…, youtube.com/live/… or youtu.be/…).") });
      return;
    }
    const offset = Number(String(form.get("replay_offset") ?? "0")) || 0;
    const patch: Partial<Live> = {
      title: String(form.get("title") ?? "").trim(),
      youtube_url: youtube || null,
      replay_offset: Math.max(-3600, Math.min(86400, Math.round(offset))),
    };
    if (cover !== undefined) patch.cover_url = cover;
    if (when !== undefined) patch.scheduled_at = when ? when.toISOString() : null;

    const { data, error } = await sb.from("lives").update(patch).eq("id", live.id).select().single();
    if (error) return setMsg({ ok: false, text: `${t("Enregistrement impossible", "Could not save")} : ${error.message}` });
    if (cover !== undefined && cover !== live.cover_url) void removeOldImage(sb, live.cover_url);
    setLive(data as Live);
    setWhen(undefined);
    setCover(undefined);
    setMsg({ ok: true, text: t("Modifications enregistrées.", "Changes saved.") });
  }

  async function deleteLive() {
    const sb = getSupabase();
    if (!sb || !live || live.status !== "termine") return;
    if (!window.confirm(t(`Supprimer définitivement « ${live.title} » ? Le replay et sa tracklist disparaîtront. Cette action est irréversible.`, `Permanently delete “${live.title}”? The replay and its tracklist will disappear. This cannot be undone.`))) return;
    setDeleting(true);
    setMsg(null);
    const { error } = await sb.from("lives").delete().eq("id", live.id);
    if (error) {
      setDeleting(false);
      setMsg({ ok: false, text: `${t("Suppression impossible", "Could not delete")} : ${error.message}` });
      return;
    }
    void removeOldImage(sb, live.cover_url);
    router.push("/regie");
  }

  if (!isSupabaseConfigured) return <div className="regie muted">{t("Supabase n'est pas connecté.", "Supabase is not connected.")}</div>;
  if (!ready) return <div className="regie muted">{t("Chargement…", "Loading…")}</div>;
  if (!session) {
    return (
      <div className="regie">
        <h1 className="display">{t("Régie", "Control room")}</h1>
        <p className="muted" style={{ marginBottom: 20 }}>{t("Connecte-toi pour piloter ton live.", "Log in to run your live.")}</p>
        <Link href={`/connexion?next=/regie/${slug}`} className="btn">{t("Se connecter", "Log in")}</Link>
      </div>
    );
  }
  if (state === "loading") return <div className="regie muted">{t("Chargement…", "Loading…")}</div>;
  if (state === "missing" || state === "forbidden" || !live || !dj) {
    return (
      <div className="regie">
        <h1 className="display">{t("Live introuvable", "Live not found")}</h1>
        <p className="muted" style={{ marginBottom: 20 }}>
          {state === "forbidden" ? t("Ce live n'appartient pas à ton compte.", "This live does not belong to your account.") : t("Cette adresse ne correspond à aucun live.", "This address does not match any live.")}
        </p>
        <Link href="/regie" className="btn-ghost">← {t("Mes lives", "My lives")}</Link>
      </div>
    );
  }

  return (
    <div className="regie">
      <Link href="/regie" className="link">← {t("Mes lives", "My lives")}</Link>
      <div className="regie-head">
        <div>
          <h1 className="display">{live.title}</h1>
          <p className="muted">
            <span className={`status-tag status-${live.status}`}>{STATUS_LABEL[lang][live.status]}</span>{" "}
            {live.scheduled_at ? formatDate(live.scheduled_at, lang) : t("Date à définir", "Date to be set")}
          </p>
        </div>
        <div className="control-meta">
          <Link href={`/regie/${live.slug}/studio`} className="btn">{t("Lancer mon live", "Start my live")}</Link>
          <Link href={`/live/${live.id}`} className="btn-ghost" target="_blank">{t("Page publique", "Public page")} ↗</Link>
        </div>
      </div>

      <LiveControl live={live} onLiveChange={setLive} djKind={dj.kind} />

      <h2 className="display">{t("Réglages du live", "Live settings")}</h2>
      <form className="panel form-grid" onSubmit={save} key={live.id + live.title}>
        <div className="field">
          <label htmlFor="e-title">{t("Titre", "Title")}</label>
          <input id="e-title" name="title" required maxLength={120} defaultValue={live.title} />
        </div>
        <div className="field">
          <label htmlFor="e-yt">{t("Lien YouTube (live ou replay)", "YouTube link (live or replay)")}</label>
          <input id="e-yt" name="youtube_url" type="url" defaultValue={live.youtube_url ?? ""} placeholder="https://www.youtube.com/live/…" />
        </div>
        <div className="field field-wide">
          <label htmlFor="e-when">{t("Date et heure", "Date and time")} {live.scheduled_at && `(${t("actuelle", "current")} : ${formatDate(live.scheduled_at, lang)})`}</label>
          <DateTimePicker id="e-when" onChange={setWhen} />
        </div>
        <ImageUpload
          userId={session.user.id}
          kind="cover"
          label={t("Cover du live", "Live cover")}
          hint={t("Affichée sur les cartes du site et en grand sur l'accueil si ton live est mis à la une.", "Shown on the site's cards and large on the home page if your live is featured.")}
          value={cover === undefined ? live.cover_url : cover}
          onChange={setCover}
        />
        <div className="field">
          <label htmlFor="e-offset">{t("Décalage du replay (secondes)", "Replay offset (seconds)")}</label>
          <input id="e-offset" name="replay_offset" type="number" step="1" defaultValue={live.replay_offset} />
        </div>
        <button className="btn" type="submit">{t("Enregistrer", "Save")}</button>
        <p className="hint field-wide">
          {t("Décalage du replay : si la vidéo YouTube démarre 30 s avant ton clic « Démarrer le live », mets 30. Chaque disque du replay sera calé sur le bon moment de la vidéo.", "Replay offset: if the YouTube video starts 30 s before you click “Start the live”, enter 30. Each record in the replay will be synced to the right moment of the video.")}
        </p>
        {msg && <p className={msg.ok ? "info" : "error"}>{msg.text}</p>}
      </form>

      {live.status === "termine" && (
        <>
          <h2 className="display">{t("Supprimer ce live", "Delete this live")}</h2>
          <div className="panel">
            <p className="muted" style={{ marginBottom: 14 }}>
              {t("Ce live est terminé : tu peux le supprimer, avec son replay et sa tracklist. C'est définitif.", "This live has ended: you can delete it, along with its replay and tracklist. This is final.")}
            </p>
            <button className="btn-ghost btn-danger" onClick={() => void deleteLive()} disabled={deleting}>
              {deleting ? t("Suppression…", "Deleting…") : t("Supprimer ce live", "Delete this live")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
