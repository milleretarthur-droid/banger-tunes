import type { SupabaseClient } from "@supabase/supabase-js";

export const IMAGE_BUCKET = "covers";

/** N'accepte que les images en https (jamais de javascript:, data:, etc.). */
export function safeImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Redimensionne l'image (côté le plus long : max px) et la convertit en WebP. Retire aussi les métadonnées (GPS…). */
export async function resizeToWebp(file: File, max = 1600): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Format accepté : JPEG, PNG ou WebP.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Image trop lourde (15 Mo maximum).");
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  if (!blob) throw new Error("Conversion de l'image impossible.");
  return blob;
}

/** Envoie l'image dans le dossier du compte et renvoie son adresse publique https. */
export async function uploadImage(sb: SupabaseClient, userId: string, kind: "cover" | "profile", file: File): Promise<string> {
  const blob = await resizeToWebp(file);
  const path = `${userId}/${kind}-${Date.now()}.webp`;
  const { error } = await sb.storage.from(IMAGE_BUCKET).upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
  if (error) throw new Error(error.message);
  return sb.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Supprime (sans bloquer) l'ancienne image si elle est hébergée dans notre bucket. */
export async function removeOldImage(sb: SupabaseClient, oldUrl: string | null | undefined): Promise<void> {
  if (!oldUrl) return;
  const marker = `/object/public/${IMAGE_BUCKET}/`;
  const i = oldUrl.indexOf(marker);
  if (i < 0) return;
  await sb.storage.from(IMAGE_BUCKET).remove([decodeURIComponent(oldUrl.slice(i + marker.length))]).catch(() => undefined);
}
