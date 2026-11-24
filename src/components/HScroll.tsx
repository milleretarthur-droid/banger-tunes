"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useT } from "@/lib/i18n";

/** Rangée à défilement horizontal façon Spotify : flèches au survol, glissement au doigt sur mobile. */
export default function HScroll({ children }: { children: ReactNode }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update, children]);

  function scrollBy(dir: -1 | 1) {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  }

  return (
    <div className="hrow-wrap">
      {canLeft && (
        <button type="button" className="hrow-arrow hrow-left" onClick={() => scrollBy(-1)} aria-label={t("Précédent", "Previous")}>
          ‹
        </button>
      )}
      <div className="hrow" ref={ref} onScroll={update}>
        {children}
      </div>
      {canRight && (
        <button type="button" className="hrow-arrow hrow-right" onClick={() => scrollBy(1)} aria-label={t("Suivant", "Next")}>
          ›
        </button>
      )}
    </div>
  );
}
