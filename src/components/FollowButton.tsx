"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { getSupabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";

type Props = { djId: string; djSlug?: string; djName?: string; className?: string; label?: string };

/**
 * « Être prévenu » : fenêtre contextuelle où l'on saisit son email, sans créer de compte.
 * Un lien de confirmation est envoyé par email ; chaque alerte contient un lien de désinscription.
 */
export default function FollowButton({ djId, djName, className = "btn-ghost", label }: Props) {
  const t = useT();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si la personne est déjà connectée, on pré-remplit son adresse (elle peut la changer).
  useEffect(() => {
    const sb = getSupabase();
    sb?.auth.getSession().then(({ data }) => {
      const mail = data.session?.user.email;
      if (mail) setEmail((cur) => cur || mail);
    });
  }, []);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const website = String(new FormData(e.currentTarget).get("website") ?? "");
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ djId, email, website }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? t("Inscription impossible pour le moment.", "Sign-up is not possible right now."));
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Inscription impossible pour le moment.", "Sign-up is not possible right now."));
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
    setDone(false);
    setError(null);
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label ?? t("🔔 Être prévenu", "🔔 Get notified")}
      </button>
      <dialog ref={dialogRef} className="modal" onClose={close} onClick={(e) => e.target === dialogRef.current && close()}>
        <div className="modal-body">
          {done ? (
            <>
              <h2 className="display">{t("Vérifie ta boîte mail", "Check your inbox")}</h2>
              <p className="muted" style={{ margin: "12px 0 20px" }}>
                {t("On t'a envoyé un lien de confirmation à", "We have sent a confirmation link to")} <strong>{email}</strong>. {t("Clique dessus pour activer les alertes (pense à regarder dans les courriers indésirables).", "Click it to activate alerts (check your spam folder too).")}
              </p>
              <button type="button" className="btn" onClick={close}>{t("Fermer", "Close")}</button>
            </>
          ) : (
            <form onSubmit={submit} className="form-stack">
              <h2 className="display">{t("Être prévenu", "Get notified")}</h2>
              <p className="muted">
                {t("Reçois un email quand", "Get an email when")} {djName ? <strong>{djName}</strong> : t("ce créateur", "this creator")} {t("va passer en live. Pas de compte à créer.", "goes live. No account needed.")}
              </p>
              <div className="field">
                <label htmlFor={`sub-${djId}`}>{t("Ton email", "Your email")}</label>
                <input id={`sub-${djId}`} type="email" required maxLength={254} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("toi@exemple.fr", "you@example.com")} />
              </div>
              {/* Champ piège pour les robots : invisible pour les humains. */}
              <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hp" />
              <p className="hint">{t("Ton adresse sert uniquement à t'envoyer ces alertes. Désinscription en un clic dans chaque email.", "Your address is only used to send you these alerts. Unsubscribe in one click from every email.")} <a className="legal-link" href="/confidentialite">{t("Confidentialité", "Privacy")}</a></p>
              <div className="control-meta">
                <button className="btn" type="submit" disabled={busy}>{busy ? t("Envoi…", "Sending…") : t("Me prévenir", "Notify me")}</button>
                <button type="button" className="btn-ghost" onClick={close}>{t("Annuler", "Cancel")}</button>
              </div>
              {error && <p className="error">{error}</p>}
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
