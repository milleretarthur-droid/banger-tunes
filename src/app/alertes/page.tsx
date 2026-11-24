"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import type { Dj, Live } from "@/lib/types";

type Followed = { dj: Dj; lives: Live[] };

export default function AlertesPage() {
  const { session, ready } = useSession();
  const [items, setItems] = useState<Followed[] | null>(null);
  const [emailOn, setEmailOn] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const userId = session?.user.id ?? null;

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !userId) return;
    const { data: follows } = await sb.from("follows").select("dj_id").eq("user_id", userId);
    const ids = (follows ?? []).map((f) => f.dj_id as string);
    const { data: prefs } = await sb.from("alert_prefs").select("email_enabled").eq("user_id", userId).maybeSingle();
    setEmailOn(prefs ? Boolean(prefs.email_enabled) : true);
    if (ids.length === 0) return setItems([]);
    const [{ data: djs }, { data: lives }] = await Promise.all([
      sb.from("djs").select("*").in("id", ids),
      sb.from("lives").select("*").in("dj_id", ids).in("status", ["a_venir", "en_cours"]).order("scheduled_at", { ascending: true }),
    ]);
    setItems(
      ((djs ?? []) as Dj[])
        .filter((d) => !d.suspended)
        .map((dj) => ({ dj, lives: ((lives ?? []) as Live[]).filter((l) => l.dj_id === dj.id) })),
    );
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function unfollow(djId: string) {
    const sb = getSupabase();
    if (!sb || !userId) return;
    await sb.from("follows").delete().eq("user_id", userId).eq("dj_id", djId);
    setItems((list) => (list ?? []).filter((i) => i.dj.id !== djId));
  }

  async function toggleEmail() {
    const sb = getSupabase();
    if (!sb || !userId) return;
    const next = !emailOn;
    setMsg(null);
    const { error } = await sb.from("alert_prefs").upsert({ user_id: userId, email_enabled: next, updated_at: new Date().toISOString() });
    if (error) return setMsg("Enregistrement impossible.");
    setEmailOn(next);
    setMsg(next ? "Alertes par email activées." : "Alertes par email désactivées.");
  }

  if (!isSupabaseConfigured) return <div className="regie muted">Supabase n&apos;est pas connecté.</div>;
  if (!ready) return <div className="regie muted">Chargement…</div>;
  if (!session) {
    return (
      <div className="regie">
        <h1 className="display">Mes alertes</h1>
        <p className="muted" style={{ marginBottom: 20 }}>
          Connecte-toi pour suivre des DJ et des magasins et être prévenu de leurs prochains lives.
        </p>
        <Link href="/connexion?mode=inscription&next=/alertes" className="btn">Créer un compte ou se connecter</Link>
      </div>
    );
  }

  const upcoming = (items ?? []).flatMap((i) => i.lives.map((l) => ({ live: l, dj: i.dj }))).sort((a, b) => (a.live.scheduled_at ?? "9999").localeCompare(b.live.scheduled_at ?? "9999"));

  return (
    <div className="regie">
      <h1 className="display">Mes alertes</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        Tu es prévenu par email le matin d&apos;un live (ou la veille au soir) des DJ et magasins que tu suis.
      </p>

      <div className="panel" style={{ marginBottom: 8 }}>
        <label className="check" style={{ marginTop: 0 }}>
          <input type="checkbox" checked={emailOn} onChange={toggleEmail} />
          Recevoir les alertes par email ({session.user.email})
        </label>
        {msg && <p className="info">{msg}</p>}
      </div>

      <h2 className="display">Prochains lives de mes suivis</h2>
      {items === null ? (
        <p className="muted">Chargement…</p>
      ) : upcoming.length === 0 ? (
        <p className="muted">Aucun live programmé chez les créateurs que tu suis.</p>
      ) : (
        <div className="live-list">
          {upcoming.map(({ live, dj }) => (
            <Link key={live.id} href={`/live/${live.id}`} className="live-item">
              <span className="live-item-title">{dj.name} · {live.title}</span>
              <span className="live-item-meta">
                <span className={`status-tag status-${live.status}`}>{live.status === "en_cours" ? "En direct" : "À venir"}</span>
                {live.scheduled_at ? formatDate(live.scheduled_at) : "Date à venir"}
              </span>
              <span className="live-item-go">Voir →</span>
            </Link>
          ))}
        </div>
      )}

      <h2 className="display">Mes suivis ({items?.length ?? 0})</h2>
      {items && items.length === 0 ? (
        <p className="muted">
          Tu ne suis personne pour l&apos;instant. Trouve des DJ et des magasins dans <Link href="/explorer" className="link">Explorer</Link>.
        </p>
      ) : (
        <div className="live-list">
          {(items ?? []).map(({ dj }) => (
            <div key={dj.id} className="live-item">
              <Link href={`/dj/${dj.slug}`} className="live-item-title">{dj.name}</Link>
              <span className="live-item-meta">{[dj.kind === "store" ? "Magasin" : "DJ", dj.genre, dj.city].filter(Boolean).join(" · ")}</span>
              <button className="btn-ghost" onClick={() => unfollow(dj.id)}>Ne plus suivre</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
