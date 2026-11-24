/** Langues du site : français (par défaut) et anglais britannique. */
export type Lang = "fr" | "en";
export const LANG_COOKIE = "bt_lang";
export const isLang = (v: unknown): v is Lang => v === "fr" || v === "en";
/** Traducteur : t("texte français", "English text"). */
export type T = (fr: string, en: string) => string;
export const makeT = (lang: Lang): T => (fr, en) => (lang === "en" ? en : fr);
