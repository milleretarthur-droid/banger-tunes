/** Les liens saisis par les DJ ne sont affichés que s'ils sont en https. */
export function safeHttpsUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const u = new URL(value.trim());
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}
