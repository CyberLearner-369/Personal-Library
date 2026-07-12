/** ISBN helpers: normalization, checksum validation, and conversion. */

export function normalizeIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, '').toUpperCase();
}

export function isValidIsbn10(raw: string): boolean {
  const isbn = normalizeIsbn(raw);
  if (!/^\d{9}[\dX]$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const value = isbn[i] === 'X' ? 10 : Number(isbn[i]);
    sum += value * (10 - i);
  }
  return sum % 11 === 0;
}

export function isValidIsbn13(raw: string): boolean {
  const isbn = normalizeIsbn(raw);
  if (!/^\d{13}$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += Number(isbn[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return sum % 10 === 0;
}

export function isbn10To13(raw: string): string | null {
  const isbn = normalizeIsbn(raw);
  if (!isValidIsbn10(isbn)) return null;
  const core = `978${isbn.slice(0, 9)}`;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(core[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return core + check;
}

/** Classify a scanned or typed code into the right ISBN field(s). */
export function parseIsbnInput(raw: string): { isbn10: string; isbn13: string } | null {
  const code = normalizeIsbn(raw);
  if (isValidIsbn13(code)) {
    return { isbn10: '', isbn13: code };
  }
  if (isValidIsbn10(code)) {
    return { isbn10: code, isbn13: isbn10To13(code) ?? '' };
  }
  return null;
}

/** True for EAN-13 codes that are book ISBNs (Bookland prefixes). */
export function looksLikeBookBarcode(raw: string): boolean {
  const code = normalizeIsbn(raw);
  return /^97[89]\d{10}$/.test(code) && isValidIsbn13(code);
}
