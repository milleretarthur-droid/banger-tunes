"use client";

import { use, useState, type FormEvent } from "react";
import Link from "next/link";
import DateTimePicker from "@/components/DateTimePicker";
import { formatDate } from "@/lib/format";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { youtubeEmbedUrl } from "@/lib/youtube";
import type { Live } from "@/lib/types";
import LiveControl from "../LiveControl";
import { useOwnedLive } from "../useOwnedLive";

type Props = { params: Promise<{ slug: string }> };

const STATUS_LABEL = { a_venir: "À venir", en_cours: "En direct", termine: "Terminé" } as const;

export default function RegieLivePage({ params }: Props) {
  const { slug } = use(params);
  const { session, ready, live, setLive, dj, state } = useOwnedLive(slug);
  const [when, setWhen] = useState<Date | null | undefined>(undefined);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const sb = getSupabase();
    if (!sb || !live) return;
    const form = new FormData(e.currentTarget);
    const youtube = String(form.get("youtube_url") ?? "").trim();
    if (youtube && !youtubeEmbedUrl(youtube)) {
      setMsg({ ok: false, text: "Ce lien YouTube n'est pas reconnu (youtube.com/watch…, youtube.com/live/… ou youtu.be/…)." });
      return;
    }
    const offset = Number(String(form.get("replay_offset") ?? "0")) || 0;
    const patch: Partial<Live> = {
      title: String(form.get("title") ?? "").trim(),
      youtube_url: youtube || null,
      replay_offset: Math.max(-3600, Math.min(86400, Math.round(offset))),
    };
    if (when !== undefined) patch.scheduled_at = when ? when.toISOString() : null;

    const { data, error } = await sb.from("lives").update(patch).eq("id", live.id).select().single();
    if (error) return setMsg({ ok: false, text: `Enregistrement impossible : ${error.message}` });
    setLive(data as Live);
    setWhen(undefined);
    setMsg({ ok: true, text: "Modifications enregistrées." });
  }

  if (!isSupabaseConfigured) return <div className="regie muted">Supabase n&apos;est pas connecté.</div>;
  if (!ready) return <div className="regie muted">Chargement…</div>;
  if (!session) {
    return (
      <div className="regie">
        <h1 className="display">Régie</h1>
        <p className="muted" style={{ marginBottom: 20 }}>Connecte-toi pour piloter ton live.</p>
        <Link href={`/connexion?next=/regie/${slug}`} className="btn">Se connecter</Link>
      </div>
    );
  }
  if (state === "loading") return <div className="regie muted">Chargement…</div>;
  if (state === "missing" || state === "forbidden" || !live || !dj) {
    return (
      <div className="regie">
        <h1 className="display">Live introuvable</h1>
        <p className="muted" style={{ marginBottom: 20 }}>
          {state === "forbidden" ? "Ce live n'appartient pas à ton compte." : "Cette adresse ne correspond à aucun live."}
        </p>
        <Link href="/regie" className="btn-ghost">← Mes lives</Link>
      </div>
    );
  }

  return (
    <div className="regie">
      <Link href="/regie" className="link">← Mes lives</Link>
      <div className="regie-head">
        <div>
          <h1 className="display">{live.title}</h1>
          <p className="muted">
            <span className={`status-tag status-${live.status}`}>{STATUS_LABEL[live.status]}</span>{" "}
            {live.scheduled_at ? formatDate(live.scheduled_at) : "Date à définir"}
          </p>
        </div>
        <div className="control-meta">
          <Link href={`/regie/${live.slug}/studio`} className="btn">Ouvrir le studio</Link>
          <Link href={`/live/${live.id}`} className="btn-ghost" target="_blank">Page publique ↗</Link>
        </div>
      </div>

      <LiveControl live={live} onLiveChange={setLive} />

      <h2 className="display">Réglages du live</h2>
      <form className="panel form-grid" onSubmit={save} key={live.id + live.title}>
        <div className="field">
          <label htmlFor="e-title">Titre</label>
          <input id="e-title" name="title" required maxLength={120} defaultValue={live.title} />
        </div>
        <div className="field">
          <label htmlFor="e-yt">Lien YouTube (live ou replay)</label>
          <input id="e-yt" name="youtube_url" type="url" defaultValue={live.youtube_url ?? ""} placeholder="https://www.youtube.com/live/…" />
        </div>
        <div className="field field-wide">
          <label htmlFor="e-when">Date et heure {live.scheduled_at && `(actuelle : ${formatDate(live.scheduled_at)})`}</label>
          <DateTimePicker id="e-when" onChange={setWhen} />
        </div>
        <div className="field">
          <label htmlFor="e-offset">Décalage du replay (secondes)</label>
          <input id="e-offset" name="replay_offset" type="number" step="1" defaultValue={live.replay_offset} />
        </div>
        <button className="btn" type="submit">Enregistrer</button>
        <p className="hint field-wide">
          Décalage du replay : si la vidéo YouTube démarre 30 s avant ton clic « Démarrer le live », mets 30.
          Chaque disque du replay sera calé sur le bon moment de la vidéo.
        </p>
        {msg && <p className={msg.ok ? "info" : "error"}>{msg.text}</p>}
      </form>
    </div>
  );
}
