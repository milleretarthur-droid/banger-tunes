import { cookies, headers } from "next/headers";
import { LANG_COOKIE, isLang, makeT, type Lang } from "./lang";

/** Langue du visiteur : cookie choisi via le sélecteur, sinon langue du navigateur (anglais si « en »), sinon français. */
export async function getLang(): Promise<Lang> {
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  if (isLang(c)) return c;
  const accept = (await headers()).get("accept-language") ?? "";
  return accept.toLowerCase().startsWith("en") ? "en" : "fr";
}

export async function getT() {
  const lang = await getLang();
  return { lang, t: makeT(lang) };
}
