/** Envoi d'un email via Resend (https://resend.com). Renvoie false si l'envoi échoue. */
export async function sendEmail(opts: { to: string; subject: string; html: string; text: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_FROM_EMAIL;
  if (!key || !from) return false;
  try {
    const res = await fetch(process.env.RESEND_API_URL ?? "https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html, text: opts.text }),
    });
    if (!res.ok) console.error("sendEmail", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (err) {
    console.error("sendEmail", err instanceof Error ? err.message : err);
    return false;
  }
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

export function siteUrl(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}
