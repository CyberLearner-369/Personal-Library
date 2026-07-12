import { z } from 'zod';
import {
  BOOK_STATUSES,
  CONDITIONS,
  READING_STATUSES,
  type BookInput,
} from '@/types/book';
import { isValidIsbn10, isValidIsbn13, normalizeIsbn } from './isbn';

const CURRENT_YEAR = new Date().getFullYear();

const trimmed = z.string().transform((v) => v.trim());
const isoDate = trimmed.refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), {
  message: 'Use the date picker (yyyy-mm-dd)',
});

/** Cover images may be https URLs or small data URLs from the in-app
 *  resizer. Anything else (javascript:, http:, blob:) is rejected — this is
 *  the XSS guard for the one user-controlled URL we render. */
export const safeImageUrl = trimmed.refine(
  (v) => v === '' || /^https:\/\//i.test(v) || /^data:image\/(png|jpeg|webp);base64,/i.test(v),
  { message: 'Must be an https:// link or an uploaded image' },
);

export const bookInputSchema = z.object({
  serialNumber: trimmed.pipe(z.string().max(20, 'Keep serials under 20 characters')),
  title: trimmed.pipe(z.string().min(1, 'Title is required').max(300)),
  subtitle: trimmed.pipe(z.string().max(300)),
  author: trimmed.pipe(z.string().max(200)),
  coAuthors: trimmed.pipe(z.string().max(300)),
  translator: trimmed.pipe(z.string().max(200)),
  editor: trimmed.pipe(z.string().max(200)),
  publisher: trimmed.pipe(z.string().max(200)),
  edition: trimmed.pipe(z.string().max(100)),
  printedDate: trimmed.pipe(z.string().max(100)),
  publicationYear: z
    .number()
    .int('Year must be a whole number')
    .min(800, 'That year looks wrong')
    .max(CURRENT_YEAR + 1, 'Year is in the future')
    .nullable(),
  isbn10: trimmed
    .transform(normalizeIsbn)
    .refine((v) => v === '' || isValidIsbn10(v), { message: 'Not a valid ISBN-10' }),
  isbn13: trimmed
    .transform(normalizeIsbn)
    .refine((v) => v === '' || isValidIsbn13(v), { message: 'Not a valid ISBN-13' }),
  language: trimmed.pipe(z.string().max(60)),
  category: trimmed.pipe(z.string().max(100)),
  subcategory: trimmed.pipe(z.string().max(100)),
  priceNpr: z.number().min(0, 'Price cannot be negative').max(10_000_000).nullable(),
  purchaseDate: isoDate,
  purchaseSource: trimmed.pipe(z.string().max(200)),
  room: trimmed.pipe(z.string().max(100)),
  shelf: trimmed.pipe(z.string().max(100)),
  condition: z.enum(CONDITIONS).or(z.literal('')),
  status: z.enum(BOOK_STATUSES),
  readingStatus: z.enum(READING_STATUSES),
  pages: z.number().int().min(1, 'Pages must be positive').max(50_000).nullable(),
  notes: trimmed.pipe(z.string().max(5000, 'Notes are limited to 5,000 characters')),
  tags: z.array(trimmed.pipe(z.string().min(1).max(50))).max(30, 'Up to 30 tags'),
  coverImageUrl: safeImageUrl.pipe(
    z.string().max(48_000, 'Image is too large — upload it again so it can be resized'),
  ),
  qrCode: trimmed.pipe(z.string().max(500)),
  barcode: trimmed.pipe(z.string().max(50)),
  borrowedTo: trimmed.pipe(z.string().max(200)),
  borrowDate: isoDate,
  returnDate: isoDate,
  favorite: z.boolean(),
}) satisfies z.ZodType<BookInput, z.ZodTypeDef, unknown>;

export type BookValidationIssues = Partial<Record<keyof BookInput, string>>;

export function validateBookInput(
  input: BookInput,
): { ok: true; value: BookInput } | { ok: false; issues: BookValidationIssues } {
  const parsed = bookInputSchema.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data };
  const issues: BookValidationIssues = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as keyof BookInput;
    if (!issues[key]) issues[key] = issue.message;
  }
  return { ok: false, issues };
}
