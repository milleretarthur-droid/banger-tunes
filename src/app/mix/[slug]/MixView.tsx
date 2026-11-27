"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import CartIcon from "@/components/CartIcon";
import FollowButton from "@/components/FollowButton";
import { formatPrice } from "@/lib/format";
import { formatTimestamp, mixEmbedUrl, PLATFORM_LABEL } from "@/lib/mixes";
import { safeHttpsUrl } from "@/lib/urls";
import { useLang } from "@/lib/i18n";
import { makeT } from "@/lib/lang";
import type { Dj, Mix, MixTrack } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const loaded = new Map<string, Promise<void>>();
function loadScript(src: string): Promise<void> {
  let p = loaded.get(src);
  if (!p) {
    p = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("script"));
      document.head.appendChild(s);
    });
    loaded.set(src, p);
  }
  return p;
}

export default function MixView({ mix, dj, tracks }: { mix: Mix; dj: Dj | null; tracks: MixTrack[] }) {
  const lang = useLang();
  const t = makeT(lang);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const playerBox = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const [ytStart, setYtStart] = useState<number | null>(null);

  const src = mixEmbedUrl(mix.platform, mix.url, mix.platform === "youtube" && ytStart != null ? { start: ytStart, autoplay: true } : {});

  async function jump(seconds: number) {
    playerBox.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (mix.platform === "youtube") return setYtStart(seconds);
    const frame = frameRef.current;
    if (!frame) return;
    try {
      if (mix.platform === "mixcloud") {
        await loadScript("https://widget.mixcloud.com/media/js/widgetApi.js");
        widgetRef.current ??= (window as any).Mixcloud.PlayerWidget(frame);
        await widgetRef.current.ready;
        await widgetRef.current.seek(seconds);
        await widgetRef.current.play();
      } else {
        await loadScript("https://w.soundcloud.com/player/api.js");
        const SC = (window as any).SC;
        if (!widgetRef.current) {
          const w = SC.Widget(frame);
          widgetRef.current = w;
          await new Promise<void>((resolve) => {
            let done = false;
            const finish = () => { if (!done) { done = true; resolve(); } };
            w.bind(SC.Widget.Events.READY, finish);
            setTimeout(finish, 1500);
          });
        }
        widgetRef.current.seekTo(seconds * 1000);
        widgetRef.current.play();
      }
    } catch {
      /* lecteur indisponible : l'auditeur peut toujours se placer à la main */
    }
  }

  function saleTag(tk: MixTrack, link: string | null) {
    if (tk.sale_mode === "unreleased") return <span className="unrel-tag">Unreleased</span>;
    if (tk.sold) return <span className="sold-tag">{t("Vendu", "Sold")}</span>;
    if (tk.sale_mode === "store")
      return dj ? <Link className="store-tag" href={`/dj/${dj.slug}`}>{t("En magasin", "In store")}</Link> : <span className="store-tag">{t("En magasin", "In store")}</span>;
    if (link)
      return (
        <a className="buy-tag" href={link} target="_blank" rel="noopener noreferrer" aria-label={t("Acheter ce disque", "Buy this record")} title={t("Acheter ce disque", "Buy this record")}>
          <CartIcon />
        </a>
      );
    return null;
  }

  return (
    <>
      <header className="live-head">
        <span className="status-pill">Mix · {PLATFORM_LABEL[mix.platform]}</span>
        <h1 className="display live-title">{mix.title}</h1>
        {dj && (
          <p className="live-dj">
            {t("par", "by")} <Link href={`/dj/${dj.slug}`}><strong>{dj.name}</strong></Link>
            {dj.genre ? ` · ${dj.genre}` : ""}
            {dj.city ? ` · ${dj.city}` : ""}
          </p>
        )}
        {dj && (
          <div className="live-follow">
            <FollowButton djId={dj.id} djName={dj.name} className="pill-btn" />
          </div>
        )}
      </header>

      <div className="mix-layout">
        <div ref={playerBox} className={`mix-player mix-${mix.platform}`}>
          {src ? (
            <iframe
              key={ytStart ?? "start"}
              ref={frameRef}
              src={src}
              title={`${PLATFORM_LABEL[mix.platform]} — ${mix.title}`}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : (
            <div className="player-empty">{t("Le lien de ce mix n'est plus valide.", "This mix's link is no longer valid.")}</div>
          )}
        </div>
      </div>

      <section className="history">
        <h2 className="display">{t("Les disques du mix", "Records in the mix")}</h2>
        {tracks.length === 0 ? (
          <p className="muted">{t("Le créateur n'a pas encore ajouté la liste des disques.", "The creator has not added the list of records yet.")}</p>
        ) : (
          tracks.map((tk) => {
            const link = safeHttpsUrl(tk.discogs_url);
            const p = formatPrice(tk.price, lang);
            return (
              <div key={tk.id} className={`track-row${tk.sold ? " is-sold" : ""}`}>
                <span className="track-pos">{tk.position}</span>
                <div>
                  <div>{tk.title}</div>
                  <div className="track-artist">
                    {tk.artist}
                    {tk.start_seconds != null && (
                      <button className="replay-btn" onClick={() => void jump(tk.start_seconds as number)}>
                        ▶ {formatTimestamp(tk.start_seconds)}
                      </button>
                    )}
                  </div>
                </div>
                <div className="track-right">
                  {!tk.sold && tk.sale_mode !== "unreleased" && p && <span className="track-price">{p}</span>}
                  {saleTag(tk, link)}
                </div>
              </div>
            );
          })
        )}
        {dj?.address && tracks.some((x) => x.sale_mode === "store" && !x.sold) && (
          <p className="muted" style={{ marginTop: 16 }}>📍 {t("Disques « en magasin » :", "“In store” records:")} {dj.address}{dj.city && !dj.address.includes(dj.city) ? `, ${dj.city}` : ""}</p>
        )}
      </section>
    </>
  );
}
