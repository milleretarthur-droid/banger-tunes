"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";

type Props = {
  plan: "live" | "monthly" | "annual";
  label: string;
  highlight?: boolean;
};

export default function CheckoutButton({ plan, label, highlight }: Props) {
  const router = useRouter();
  const { session, ready } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (!session) {
      router.push(`/connexion?mode=inscription&next=${encodeURIComponent("/tarifs")}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Paiement indisponible.");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Paiement indisponible.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button className={`btn btn-block${highlight ? " btn-gold" : ""}`} onClick={go} disabled={busy || !ready}>
        {busy ? "Redirection vers le paiement…" : session || !ready ? label : "Créer un compte pour commencer"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
