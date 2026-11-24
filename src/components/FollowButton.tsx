"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { getSupabase } from "@/lib/supabase";

type Props = { djId: string; djSlug?: string; djName?: string; className?: string; label?: string };

/**
 * « Être prévenu » : fenêtre contextuelle où l'on saisit son email, sans créer de compte.
 * Un lien de confirmation est envoyé par email ; chaque alerte contient un lien de désinscription.
 */
export default function FollowButton({ djId, djName, className = "btn-ghost", label = "🔔 Être prévenu" }: Props) {
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
      if (!res.ok) throw new Error(json.error ?? "Inscription impossible pour le moment.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inscription impossible pour le moment.");
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
        {label}
      </button>
      <dialog ref={dialogRef} className="modal" onClose={close} onClick={(e) => e.target === dialogRef.current && close()}>
        <div className="modal-body">
          {done ? (
            <>
              <h2 className="display">Vérifie ta boîte mail</h2>
              <p className="muted" style={{ margin: "12px 0 20px" }}>
                On t&apos;a envoyé un lien de confirmation à <strong>{email}</strong>. Clique dessus pour activer les alertes (pense à regarder dans les courriers indésirables).
              </p>
              <button type="button" className="btn" onClick={close}>Fermer</button>
            </>
          ) : (
            <form onSubmit={submit} className="form-stack">
              <h2 className="display">Être prévenu</h2>
              <p className="muted">
                Reçois un email quand {djName ? <strong>{djName}</strong> : "ce créateur"} va passer en live. Pas de compte à créer.
              </p>
              <div className="field">
                <label htmlFor={`sub-${djId}`}>Ton email</label>
                <input id={`sub-${djId}`} type="email" required maxLength={254} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@exemple.fr" />
              </div>
              {/* Champ piège pour les robots : invisible pour les humains. */}
              <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hp" />
              <p className="hint">Ton adresse sert uniquement à t&apos;envoyer ces alertes. Désinscription en un clic dans chaque email.</p>
              <div className="control-meta">
                <button className="btn" type="submit" disabled={busy}>{busy ? "Envoi…" : "Me prévenir"}</button>
                <button type="button" className="btn-ghost" onClick={close}>Annuler</button>
              </div>
              {error && <p className="error">{error}</p>}
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
