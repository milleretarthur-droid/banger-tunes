"use client";

import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n";
import { LANG_COOKIE, type Lang } from "@/lib/lang";

/** Bascule FR / EN : mémorise le choix dans un cookie d'un an puis recharge la page. */
export default function LangSwitch() {
  const lang = useLang();
  const router = useRouter();
  function choose(l: Lang) {
    if (l === lang) return;
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }
  return (
    <span className="lang-switch" role="group" aria-label="Language">
      {(["fr", "en"] as const).map((l, i) => (
        <span key={l}>
          {i > 0 && <i aria-hidden="true">/</i>}
          <button type="button" className={l === lang ? "on" : ""} aria-pressed={l === lang} onClick={() => choose(l)}>
            {l.toUpperCase()}
          </button>
        </span>
      ))}
    </span>
  );
}
