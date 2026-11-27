"use client";

import { useCallback, useEffect, useState } from "react";

type Template = { subject: string; subject_multi: string | null; body: string; button_label: string | null };
type Item = {
  key: string; label: string; when: string; vars: [string, string][]; blocks: string[]; hasMulti: boolean; hasButton: boolean;
  current: Template; customized: boolean; defaults: Template;
};
type Preview = { subject: string; html: string };

export default function EmailsTab({ token }: { token: string }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [tableMissing, setTableMissing] = useState(false);
  const [sel, setSel] = useState(0);
  const [form, setForm] = useState<Template | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/email-templates", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return setMsg("Chargement impossible.");
    const d = (await res.json()) as { templates: Item[]; tableMissing: boolean };
    setItems(d.templates);
    setTableMissing(d.tableMissing);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const item = items?.[sel] ?? null;
  useEffect(() => {
    if (item) {
      setForm(item.current);
      setPreview(null);
    }
  }, [item?.key, items]); // eslint-disable-line react-hooks/exhaustive-deps

  async function call(action: "save" | "reset" | "preview" | "test") {
    if (!item || !form) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/email-templates", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ key: item.key, action, ...form }),
    });
    const out = (await res.json().catch(() => ({}))) as { error?: string; to?: string; subject?: string; html?: string };
    setBusy(false);
    if (!res.ok) return setMsg(out.error ?? "Action impossible.");
    if (action === "preview") return setPreview({ subject: out.subject ?? "", html: out.html ?? "" });
    if (action === "test") return setMsg(`Email de test envoyé à ${out.to}.`);
    setMsg(action === "save" ? "Enregistré. Il sera utilisé pour les prochains envois." : "Texte d'origine rétabli.");
    await load();
  }

  if (!items || !item || !form) return <p className="muted">Chargement…</p>;
  const set = (patch: Partial<Template>) => setForm({ ...form, ...patch });

  return (
    <>
      <p className="hint" style={{ marginBottom: 14 }}>
        Ces emails sont envoyés par le site. L&apos;email de confirmation d&apos;inscription (création de compte) et celui de mot de passe oublié se règlent dans Supabase : <em>Authentication → Emails → Templates</em>.
      </p>
      {tableMissing && <p className="error" style={{ marginBottom: 14 }}>La table des emails n&apos;existe pas encore : lance le SQL du lot 16 dans Supabase pour pouvoir enregistrer.</p>}
      <div className="admin-filters">
        {items.map((it, i) => (
          <button key={it.key} className={`chip${sel === i ? " is-selected" : ""}`} onClick={() => setSel(i)}>
            {it.label}{it.customized ? " ✎" : ""}
          </button>
        ))}
      </div>
      <p className="muted" style={{ margin: "6px 0 18px" }}>{item.when}</p>

      <div className="panel" style={{ display: "grid", gap: 14 }}>
        <label>
          <span className="hint">Objet{item.hasMulti ? " (un seul live)" : ""}</span>
          <input className="admin-search" style={{ width: "100%" }} value={form.subject} maxLength={200} onChange={(e) => set({ subject: e.target.value })} />
        </label>
        {item.hasMulti && (
          <label>
            <span className="hint">Objet (plusieurs lives dans le même email)</span>
            <input className="admin-search" style={{ width: "100%" }} value={form.subject_multi ?? ""} maxLength={200} onChange={(e) => set({ subject_multi: e.target.value })} />
          </label>
        )}
        <label>
          <span className="hint">Message : sépare les paragraphes par une ligne vide</span>
          <textarea className="admin-search" style={{ width: "100%", minHeight: 220, fontFamily: "inherit" }} value={form.body} maxLength={5000} onChange={(e) => set({ body: e.target.value })} />
        </label>
        {item.hasButton && (
          <label>
            <span className="hint">Texte du bouton</span>
            <input className="admin-search" style={{ width: "100%" }} value={form.button_label ?? ""} maxLength={60} onChange={(e) => set({ button_label: e.target.value })} />
          </label>
        )}
        <div>
          <p className="hint">Mots à écrire tels quels (remplacés à l&apos;envoi) :</p>
          <ul className="hint" style={{ margin: "6px 0 0 18px" }}>
            {item.vars.map(([name, desc]) => (
              <li key={name}><code>{`{{${name}}}`}</code> : {desc}</li>
            ))}
            {item.blocks.includes("button") && <li><code>{"{{button}}"}</code> : le bouton (seul sur sa ligne ; sinon placé à la fin)</li>}
            {item.blocks.includes("lives") && <li><code>{"{{lives}}"}</code> : la liste des lives avec liens et désinscription (seul sur sa ligne ; sinon placé à la fin)</li>}
          </ul>
        </div>
        <div className="row-actions" style={{ flexWrap: "wrap" }}>
          <button className="btn" disabled={busy} onClick={() => call("save")}>Enregistrer</button>
          <button className="btn-ghost" disabled={busy} onClick={() => call("preview")}>Aperçu</button>
          <button className="btn-ghost" disabled={busy} onClick={() => call("test")}>M&apos;envoyer un test</button>
          <button className="btn-ghost" disabled={busy || !item.customized} onClick={() => { if (window.confirm("Revenir au texte d'origine ?")) void call("reset"); }}>
            Revenir au texte d&apos;origine
          </button>
        </div>
        {msg && <p className="info">{msg}</p>}
      </div>

      {preview && (
        <div style={{ marginTop: 18 }}>
          <p className="hint">Objet : <strong>{preview.subject}</strong> (aperçu avec des valeurs d&apos;exemple)</p>
          <iframe
            title="Aperçu de l'email"
            sandbox=""
            srcDoc={`<body style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#222;padding:16px">${preview.html}</body>`}
            style={{ width: "100%", height: 340, border: "1px solid var(--line)", background: "#fff", borderRadius: 4, marginTop: 8 }}
          />
        </div>
      )}
    </>
  );
}
