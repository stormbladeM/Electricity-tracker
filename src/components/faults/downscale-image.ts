/**
 * Shrink a chosen photo in the browser before upload.
 *
 * People report faults during outages, often on a bad connection
 * (CLAUDE.md quality floor). A 6 MB phone photo is a failed upload waiting to
 * happen, and the fault feed only ever shows the image a few hundred pixels
 * wide. This caps the longest edge and re-encodes as JPEG.
 *
 * Returns the re-encoded Blob, or the original File untouched if the browser
 * can't decode it (the storage bucket's mime/size limits are the backstop).
 */
export async function downscaleImage(
  file: File,
  maxEdge = 1600,
  quality = 0.8,
): Promise<Blob> {
  if (typeof document === "undefined") return file;

  const dataUrl = await readAsDataUrl(file);
  const image = await loadImage(dataUrl);

  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  return blob ?? file;
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode the image"));
    image.src = src;
  });
}
