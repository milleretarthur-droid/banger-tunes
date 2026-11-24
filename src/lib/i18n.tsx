"use client";

import { createContext, useContext, type ReactNode } from "react";
import { makeT, type Lang, type T } from "./lang";

const LangContext = createContext<Lang>("fr");

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

/** Hook client : const t = useT(); t("Bonjour", "Hello"). */
export function useT(): T {
  return makeT(useLang());
}
