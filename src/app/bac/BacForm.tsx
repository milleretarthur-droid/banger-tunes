"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { parseSellerUsername } from "@/lib/discogs-url";
import { useT } from "@/lib/i18n";

export default function BacForm() {
  const t = useT();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  function go(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const u = parseSellerUsername(String(new FormData(e.currentTarget).get("seller") ?? ""));
    if (!u) return setError(t("Entre un nom de vendeur Discogs ou le lien de son profil.", "Enter a Discogs seller name or the link to their profile."));
    router.push(`/bac/${encodeURIComponent(u)}`);
  }

  return (
    <div className="record-page">
      <h1 className="display" style={{ fontSize: "clamp(34px, 6vw, 64px)" }}>{t("Digger", "Digger")}</h1>
      <p className="muted" style={{ fontSize: 17, margin: "8px 0 22px", maxWidth: 560 }}>
        {t(
          "Écoute les disques en vente d'un vendeur Discogs, un par un, sans quitter la page. On enchaîne les extraits, tu achètes quand ça te parle.",
          "Listen to a Discogs seller's records for sale, one by one, without leaving the page. Previews chain on their own, you buy when something hits.",
        )}
      </p>
      <form className="panel form-grid" onSubmit={go} style={{ maxWidth: 560 }}>
        <div className="field">
          <label htmlFor="seller">{t("Vendeur Discogs", "Discogs seller")}</label>
          <input id="seller" name="seller" required placeholder="zipomax · https://www.discogs.com/seller/zipomax/profile" />
        </div>
        <button className="btn" type="submit">{t("Ouvrir le bac", "Open the crate")}</button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}
