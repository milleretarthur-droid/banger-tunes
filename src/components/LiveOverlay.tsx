"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";

/**
 * Fenêtre par-dessus la page : fond noir semi-transparent (on devine la page dessous),
 * fermeture par la croix, la touche Échap ou un clic à côté.
 */
export default function LiveOverlay({ liveId, children }: { liveId: string; children: ReactNode }) {
  const router = useRouter();
  const t = useT();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.back();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [router]);

  return (
    <div className="overlay-backdrop" onClick={(e) => e.target === e.currentTarget && router.back()}>
      <div className="overlay-panel" role="dialog" aria-modal="true" aria-label={t("Live", "Live")}>
        <div className="overlay-bar">
          {/* Lien classique (rechargement) pour ouvrir la vraie page, sans repasser par l'overlay. */}
          <a className="overlay-full" href={`/live/${liveId}`}>{t("Ouvrir en pleine page ↗", "Open full page ↗")}</a>
          <button ref={closeRef} type="button" className="overlay-close" onClick={() => router.back()} aria-label={t("Fermer", "Close")}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
