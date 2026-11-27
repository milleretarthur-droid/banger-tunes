import type { ReactNode } from "react";
import { getLang } from "@/lib/i18n-server";
import { isTodo } from "@/lib/legal";

/** Valeur légale : surlignée en jaune tant qu'elle n'a pas été complétée (voir src/lib/legal.ts). */
export function V({ children }: { children: string }) {
  return isTodo(children) ? <mark className="legal-todo">{children}</mark> : <>{children}</>;
}

/** Mise en page commune des pages juridiques (textes en français). */
export default async function LegalPage({ title, updatedAt, children }: { title: string; updatedAt: string; children: ReactNode }) {
  const en = (await getLang()) === "en";
  return (
    <article className="legal">
      <h1 className="display">{title}</h1>
      <p className="muted legal-date">Dernière mise à jour : {updatedAt}</p>
      {en && (
        <p className="legal-note">
          This page is currently only available in French. The French version is the reference text.
        </p>
      )}
      {children}
    </article>
  );
}
