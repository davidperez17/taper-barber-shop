import { createClient } from "@/lib/supabase/client";

/** Downscale + compresión a JPEG en el cliente antes de subir. */
async function compressImage(file: File, max = 600, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("compress"))), "image/jpeg", quality),
  );
}

/** Sube una imagen al bucket `catalogo` y devuelve la URL pública. */
export async function uploadCatalogoImage(file: File): Promise<string> {
  const blob = await compressImage(file);
  const sb = createClient();
  const name = `${crypto.randomUUID()}.jpg`;
  const { error } = await sb.storage.from("catalogo").upload(name, blob, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return sb.storage.from("catalogo").getPublicUrl(name).data.publicUrl;
}
