"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { formatTimestamp, parseMixUrl, parseTimestamp, PLATFORM_LABEL } from "@/lib/mixes";
import { getSupabase } from "@/lib/supabase";
import { safeHttpsUrl } from "@/lib/urls";
import { useSession } from "@/lib/useSession";
import { useLang, useT } from "@/lib/i18n";
import type { Dj, Mix, MixTrack } from "@/lib/types";

/** Édition d'un mix : lien, disques (avec heure de passage), mode de vente, ordre. */
export default function MixEditorPage() {
  const { slug } = useParams<{ slug: string }>();
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const { session, ready } = useSession();
  const userId = session?.user.id ?? null;
  const [dj, setDj] = useState<Dj | null>(null);
  const [mix, setMix] = useState<Mix | null>(null);
  const [tracks, setTracks] = useState<MixTrack[]>([]);
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [newMode, setNewMode] = useState<MixTrack["sale_mode"]>("online");

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !userId) return;
    const { data: d } = await sb.from("djs").select("*").eq("user_id", userId).maybeSingle();
    if (!d) return setState("missing");
    setDj(d as Dj);
    const { data: m } = await sb.from("mixes").select("*").eq("slug", slug).eq("dj_id", (d as Dj).id).maybeSingle();
    if (!m) return setState("missing");
    setMix(m as Mix);
    const { data: tr } = await sb.from("mix_tracks").select("*").eq("mix_id", (m as Mix).id).order("position");
    setTracks((tr as MixTrack[] | null) ?? []);
    setState("ok");
  }, [userId, slug]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!ready) return <div className="regie muted">{t("Chargement…", "Loading…")}</div>;
  if (!session) {
    return (
      <div className="regie">
        <Link href={`/connexion?next=/mes-mixes/${slug}`} className="btn">{t("Se connecter", "Log in")}</Link>
      </div>
    );
  }
  if (state === "loading") return <div className="regie muted">{t("Chargement…", "Loading…")}</div>;
  if (state === "missing" || !mix || !dj) {
    return (
      <div className="regie">
        <p className="muted">{t("Mix introuvable.", "Mix not found.")}</p>
        <Link href="/regie" className="link">← {t("Mon espace", "My space")}</Link>
      </div>
    );
  }

  const sb = getSupabase();
  const fail = (what: string, msg: string) => setError(`${what} : ${msg}`);

  async function saveMix(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!sb || !mix) return;
    setError(null);
    setInfo(null);
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const parsed = parseMixUrl(String(form.get("url") ?? ""));
    if (!title) return setError(t("Le titre est obligatoire.", "The title is required."));
    if (!parsed) return setError(t("Lien non reconnu : colle l'adresse d'un mix Mixcloud, SoundCloud ou YouTube.", "Link not recognised: paste the address of a Mixcloud, SoundCloud or YouTube mix."));
    const { data, error: err } = await sb.from("mixes").update({ title, url: parsed.url, platform: parsed.platform }).eq("id", mix.id).select().single();
    if (err) return fail(t("Enregistrement impossible", "Could not save"), err.message);
    setMix(data as Mix);
    setInfo(t("Enregistré.", "Saved."));
  }

  async function deleteMix() {
    if (!sb || !mix) return;
    if (!window.confirm(t("Supprimer ce mix et sa liste de disques ?", "Delete this mix and its list of records?"))) return;
    const { error: err } = await sb.from("mixes").delete().eq("id", mix.id);
    if (err) return fail(t("Suppression impossible", "Could not delete"), err.message);
    router.push("/regie");
  }

  async function addTrack(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!sb || !mix) return;
    setError(null);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const start = parseTimestamp(String(form.get("start") ?? ""));
    if (start === undefined) return setError(t("Heure invalide : écris par exemple 12:30 ou 1:02:10.", "Invalid time: write for example 12:30 or 1:02:10."));
    const discogsRaw = newMode === "online" ? String(form.get("discogs_url") ?? "").trim() : "";
    if (discogsRaw && !safeHttpsUrl(discogsRaw)) return setError(t("Le lien doit être une adresse web en https://…", "The link must be a web address starting with https://…"));
    const priceRaw = newMode === "unreleased" ? "" : String(form.get("price") ?? "").trim();
    const position = tracks.reduce((max, x) => Math.max(max, x.position), 0) + 1;
    const { data, error: err } = await sb
      .from("mix_tracks")
      .insert({
        mix_id: mix.id,
        position,
        title: String(form.get("title") ?? "").trim(),
        artist: String(form.get("artist") ?? "").trim(),
        discogs_url: discogsRaw || null,
        price: priceRaw ? Number(priceRaw) : null,
        sale_mode: newMode,
        start_seconds: start,
      })
      .select()
      .single();
    if (err) return fail(t("Ajout impossible", "Could not add"), err.message);
    formEl.reset();
    setNewMode("online");
    setTracks((list) => [...list, data as MixTrack]);
  }

  async function removeTrack(id: string) {
    if (!sb) return;
    setError(null);
    const { error: err } = await sb.from("mix_tracks").delete().eq("id", id);
    if (err) return fail(t("Suppression impossible", "Could not delete"), err.message);
    setTracks((list) => list.filter((x) => x.id !== id));
  }

  async function patchTrack(tk: MixTrack, patch: Partial<MixTrack>) {
    if (!sb) return;
    setError(null);
    const { error: err } = await sb.from("mix_tracks").update(patch).eq("id", tk.id);
    if (err) return fail(t("Mise à jour impossible", "Could not update"), err.message);
    setTracks((list) => list.map((x) => (x.id === tk.id ? { ...x, ...patch } : x)));
  }

  async function changeMode(tk: MixTrack, mode: MixTrack["sale_mode"]) {
    if (mode === tk.sale_mode) return;
    await patchTrack(tk, mode === "unreleased" ? { sale_mode: mode, discogs_url: null, price: null } : { sale_mode: mode });
  }

  async function changeStart(tk: MixTrack) {
    const raw = window.prompt(t("Heure de passage (ex. 12:30 ou 1:02:10). Vide = aucune.", "Start time (e.g. 12:30 or 1:02:10). Empty = none."), formatTimestamp(tk.start_seconds));
    if (raw === null) return;
    const v = parseTimestamp(raw);
    if (v === undefined) return setError(t("Heure invalide : écris par exemple 12:30 ou 1:02:10.", "Invalid time: write for example 12:30 or 1:02:10."));
    await patchTrack(tk, { start_seconds: v });
  }

  async function move(index: number, delta: -1 | 1) {
    if (!sb || !mix) return;
    const target = index + delta;
    if (target < 0 || target >= tracks.length) return;
    const ordered = [...tracks];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    const before = tracks;
    setTracks(ordered.map((x, i) => ({ ...x, position: i + 1 })));
    const { error: err } = await sb.rpc("reorder_mix_tracks", { p_mix_id: mix.id, p_ids: ordered.map((x) => x.id) });
    if (err) {
      setTracks(before);
      fail(t("Changement d'ordre impossible", "Could not change the order"), err.message);
    }
  }

  return (
    <div className="regie">
      <Link href="/regie" className="link">← {t("Mon espace", "My space")}</Link>
      <h1 className="display" style={{ marginTop: 10 }}>{mix.title}</h1>
      <p className="muted">
        {PLATFORM_LABEL[mix.platform]} ·{" "}
        <Link href={`/mix/${mix.slug}`} className="link">{t("Voir la page publique", "View the public page")} →</Link>
      </p>

      <h2 className="display">{t("Le mix", "The mix")}</h2>
      <form className="panel form-grid" onSubmit={saveMix}>
        <div className="field">
          <label htmlFor="m-title">{t("Titre", "Title")}</label>
          <input id="m-title" name="title" required maxLength={120} defaultValue={mix.title} />
        </div>
        <div className="field">
          <label htmlFor="m-url">{t("Lien du mix", "Mix link")}</label>
          <input id="m-url" name="url" type="url" required defaultValue={mix.url} />
        </div>
        <div className="control-meta">
          <button className="btn" type="submit">{t("Enregistrer", "Save")}</button>
          <button className="btn-ghost" type="button" onClick={deleteMix}>{t("Supprimer le mix", "Delete the mix")}</button>
        </div>
        {info && <p className="info">{info}</p>}
      </form>

      <h2 className="display">{t("Les disques du mix", "Records in the mix")}</h2>
      <div className="panel">
        {tracks.length === 0 ? (
          <p className="muted">{t("Ajoute les disques dans l'ordre où ils passent. L'heure de passage est facultative, mais elle permet à l'auditeur de sauter directement au disque.", "Add the records in the order they play. The start time is optional, but lets listeners jump straight to the record.")}</p>
        ) : (
          tracks.map((tk, i) => (
            <div key={tk.id} className="edit-row">
              <span className="track-pos">{i + 1}</span>
              <div>
                <div>{tk.title}</div>
                <div className="track-artist">
                  {tk.artist}
                  {tk.price != null ? ` · ${formatPrice(tk.price, lang)}` : ""}
                </div>
              </div>
              <div className="row-actions">
                <button className="chip" onClick={() => void changeStart(tk)} title={t("Modifier l'heure de passage", "Edit the start time")}>
                  ⏱ {tk.start_seconds != null ? formatTimestamp(tk.start_seconds) : t("heure", "time")}
                </button>
                <select className="mode-select" value={tk.sale_mode} onChange={(e) => void changeMode(tk, e.target.value as MixTrack["sale_mode"])} aria-label={t("Mode de vente", "Sale mode")}>
                  <option value="online">{t("En ligne", "Online")}</option>
                  {(dj.kind === "store" || tk.sale_mode === "store") && <option value="store">{t("En magasin", "In store")}</option>}
                  <option value="unreleased">Unreleased</option>
                </select>
                <button className={`chip${tk.sold ? " is-selected" : ""}`} onClick={() => void patchTrack(tk, { sold: !tk.sold })} aria-pressed={tk.sold}>
                  {tk.sold ? t("Vendu", "Sold") : t("Disponible", "Available")}
                </button>
                <button className="btn-ghost btn-icon" onClick={() => void move(i, -1)} disabled={i === 0} aria-label={`${t("Monter", "Move up")} ${tk.title}`}>▲</button>
                <button className="btn-ghost btn-icon" onClick={() => void move(i, 1)} disabled={i === tracks.length - 1} aria-label={`${t("Descendre", "Move down")} ${tk.title}`}>▼</button>
                <button className="btn-ghost" onClick={() => void removeTrack(tk.id)}>{t("Supprimer", "Delete")}</button>
              </div>
            </div>
          ))
        )}

        <form className="form-grid" onSubmit={addTrack} style={{ marginTop: 22 }}>
          <div className="field">
            <label htmlFor="mt-title">{t("Titre", "Title")}</label>
            <input id="mt-title" name="title" required maxLength={160} />
          </div>
          <div className="field">
            <label htmlFor="mt-artist">{t("Artiste", "Artist")}</label>
            <input id="mt-artist" name="artist" required maxLength={160} />
          </div>
          <div className="field">
            <label htmlFor="mt-start">{t("Heure de passage (facultatif)", "Start time (optional)")}</label>
            <input id="mt-start" name="start" placeholder="12:30" inputMode="numeric" maxLength={8} />
          </div>
          <div className="field">
            <label htmlFor="mt-mode">{t("Mode de vente", "Sale mode")}</label>
            <select id="mt-mode" value={newMode} onChange={(e) => setNewMode(e.target.value as MixTrack["sale_mode"])}>
              <option value="online">{t("En ligne (lien d'achat)", "Online (purchase link)")}</option>
              {dj.kind === "store" && <option value="store">{t("En magasin uniquement", "In store only")}</option>}
              <option value="unreleased">{t("Unreleased (inédit, ni lien ni achat)", "Unreleased (no link, not for sale)")}</option>
            </select>
          </div>
          {newMode === "online" && (
            <div className="field">
              <label htmlFor="mt-link">{t("Lien d'achat", "Purchase link")}</label>
              <input id="mt-link" name="discogs_url" type="url" placeholder={t("https://… (annonce du disque)", "https://… (record listing)")} />
            </div>
          )}
          {newMode !== "unreleased" && (
            <div className="field">
              <label htmlFor="mt-price">{t("Prix (€)", "Price (€)")}</label>
              <input id="mt-price" name="price" type="number" min="0" step="0.01" />
            </div>
          )}
          <button className="btn" type="submit">{t("Ajouter le disque", "Add the record")}</button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
