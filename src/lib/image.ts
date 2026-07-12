/**
 * Cover images are stored inline as small data URLs so they work offline
 * and need no image host. A Google Sheets cell holds 50k characters; the
 * resizer targets well under that.
 */
const MAX_EDGE = 380;
const QUALITY = 0.78;
const MAX_DATA_URL_CHARS = 46_000;

export async function fileToCoverDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file (JPEG, PNG or WebP).');
  }
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process the image in this browser.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  if ('close' in bitmap) bitmap.close();

  for (const quality of [QUALITY, 0.6, 0.45]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length <= MAX_DATA_URL_CHARS) return dataUrl;
  }
  throw new Error('That image is too detailed to store — try a smaller photo.');
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through to <img> decoding */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/** Open Library serves covers by ISBN with no API key. */
export function openLibraryCoverUrl(isbn13: string): string {
  return `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn13)}-M.jpg`;
}
