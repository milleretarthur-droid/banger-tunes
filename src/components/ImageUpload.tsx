"use client";

import { useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { safeImageUrl, uploadImage } from "@/lib/images";
import { useT } from "@/lib/i18n";

type Props = {
  userId: string;
  kind: "cover" | "profile";
  label: string;
  hint?: string;
  value: string | null;
  onChange: (url: string | null) => void;
  /** Rapport de l'image (largeur / hauteur) de l'aperçu. */
  ratio?: string;
};

/** Choix d'une image depuis l'appareil : redimensionnée dans le navigateur puis envoyée dans Supabase Storage. */
export default function ImageUpload({ userId, kind, label, hint, value, onChange, ratio = "16 / 9" }: Props) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const src = safeImageUrl(value);

  async function onFile(file: File | undefined) {
    if (!file) return;
    const sb = getSupabase();
    if (!sb) return;
    setError(null);
    setBusy(true);
    try {
      onChange(await uploadImage(sb, userId, kind, file, t));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Envoi impossible.", "Upload failed."));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="field field-wide image-upload">
      <label>{label}</label>
      <div className="image-upload-row">
        <div className="image-upload-preview" style={{ aspectRatio: ratio }}>
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" />
          ) : (
            <span>{t("Aucune image", "No image")}</span>
          )}
        </div>
        <div className="image-upload-actions">
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? t("Envoi…", "Uploading…") : src ? t("Changer l'image", "Change image") : t("Choisir une image", "Choose an image")}
          </button>
          {src && !busy && (
            <button type="button" className="btn-ghost" onClick={() => onChange(null)}>
              {t("Retirer", "Remove")}
            </button>
          )}
          {hint && <p className="hint">{hint}</p>}
          {error && <p className="error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
