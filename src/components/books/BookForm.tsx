import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { Link, useBlocker } from 'react-router-dom';
import { ImagePlus, Plus, ScanLine, Search, Sparkles, X } from 'lucide-react';
import {
  BOOK_STATUSES,
  CONDITIONS,
  READING_STATUSES,
  emptyBookInput,
  type Book,
  type BookInput,
} from '@/types/book';
import { useLibrary } from '@/state/LibraryContext';
import { validateBookInput, type BookValidationIssues } from '@/lib/validate';
import { findDuplicates } from '@/lib/duplicates';
import { lookupIsbn } from '@/lib/metadata';
import { parseIsbnInput } from '@/lib/isbn';
import { fileToCoverDataUrl, openLibraryCoverUrl } from '@/lib/image';
import { distinctValues } from '@/lib/search';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Switch } from '@/components/ui/Switch';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { BarcodeScanner } from './BarcodeScanner';
import { CoverImage } from './CoverImage';

/** Numeric fields are edited as strings so partial input never fights the
 *  cursor; conversion happens once, on submit. */
interface Draft extends Omit<BookInput, 'publicationYear' | 'priceNpr' | 'pages'> {
  publicationYear: string;
  priceNpr: string;
  pages: string;
}

function toDraft(input: BookInput): Draft {
  return {
    ...input,
    publicationYear: input.publicationYear === null ? '' : String(input.publicationYear),
    priceNpr: input.priceNpr === null ? '' : String(input.priceNpr),
    pages: input.pages === null ? '' : String(input.pages),
  };
}

function toInput(draft: Draft): BookInput {
  const num = (value: string) => {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  };
  return {
    ...draft,
    publicationYear: num(draft.publicationYear),
    priceNpr: num(draft.priceNpr),
    pages: num(draft.pages),
  };
}

export function BookForm({
  initial,
  template,
  nextSerial,
  openScannerOnMount = false,
  onSubmit,
  onSaved,
}: {
  /** Existing record when editing. */
  initial?: Book;
  /** Prefilled values (e.g. “add another copy”). */
  template?: BookInput;
  nextSerial: string;
  openScannerOnMount?: boolean;
  onSubmit: (input: BookInput) => Promise<Book>;
  onSaved: (book: Book) => void;
}) {
  const toast = useToast();
  const { books } = useLibrary();

  const initialDraft = useMemo<Draft>(() => {
    if (initial) {
      const { id: _i, createdAt: _c, updatedAt: _u, deletedAt: _d, ...rest } = initial;
      return toDraft(rest);
    }
    const base = template ?? emptyBookInput();
    return toDraft({ ...base, serialNumber: base.serialNumber || nextSerial });
  }, [initial, template, nextSerial]);

  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [errors, setErrors] = useState<BookValidationIssues>({});
  const [saving, setSaving] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(openScannerOnMount);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupNote, setLookupNote] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [tagText, setTagText] = useState('');
  const cleanRef = useRef(JSON.stringify(initialDraft));
  const fileRef = useRef<HTMLInputElement>(null);

  const set = useCallback(<K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  }, []);

  // ----- unsaved changes guard ---------------------------------------------
  const dirty = JSON.stringify(draft) !== cleanRef.current;
  const blocker = useBlocker(dirty && !saving);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // ----- duplicate detection -----------------------------------------------
  const duplicateKey = useDebouncedValue(
    `${draft.title}|${draft.author}|${draft.isbn10}|${draft.isbn13}`,
    400,
  );
  const duplicates = useMemo(() => {
    const [title, author, isbn10, isbn13] = duplicateKey.split('|');
    if (!title && !isbn10 && !isbn13) return [];
    return findDuplicates({ title, author, isbn10, isbn13 }, books, initial?.id).slice(0, 3);
  }, [duplicateKey, books, initial?.id]);

  // ----- ISBN lookup & scanning --------------------------------------------
  const runLookup = useCallback(
    async (code?: string) => {
      const isbn = (code ?? draft.isbn13 ?? draft.isbn10).trim() || draft.isbn10.trim();
      if (!isbn) {
        setLookupNote('Enter an ISBN first.');
        return;
      }
      setLookupBusy(true);
      setLookupNote('');
      try {
        const result = await lookupIsbn(isbn);
        if (!result) {
          setLookupNote('That is not a valid ISBN.');
          return;
        }
        setDraft((current) => {
          const next = { ...current };
          const fields = toDraft({ ...emptyBookInput(), ...result.fields });
          for (const key of Object.keys(result.fields) as Array<keyof BookInput>) {
            const incoming = fields[key as keyof Draft];
            const existing = next[key as keyof Draft];
            const isEmpty =
              existing === '' ||
              existing === null ||
              (Array.isArray(existing) && existing.length === 0);
            if (isEmpty && incoming !== undefined) {
              (next as Record<string, unknown>)[key] = incoming;
            }
          }
          return next;
        });
        setSuggestedTags(result.suggestedTags);
        setLookupNote(
          Object.keys(result.fields).length > 2
            ? `Details filled from ${result.source === 'google-books' ? 'Google Books' : 'Open Library'} — empty fields only.`
            : 'ISBN recognised, but no catalogue data was found for it.',
        );
      } catch {
        setLookupNote('Lookup failed — check your connection and try again.');
      } finally {
        setLookupBusy(false);
      }
    },
    [draft.isbn10, draft.isbn13],
  );

  const handleScan = useCallback(
    (code: string) => {
      setScannerOpen(false);
      const parsed = parseIsbnInput(code);
      setDraft((current) => ({
        ...current,
        barcode: code,
        isbn10: parsed?.isbn10 || current.isbn10,
        isbn13: parsed?.isbn13 || current.isbn13,
      }));
      if (parsed) {
        void runLookup(parsed.isbn13 || parsed.isbn10);
      } else {
        toast('Scanned a barcode, but it is not an ISBN.', { kind: 'info' });
      }
    },
    [runLookup, toast],
  );

  // ----- tags ----------------------------------------------------------------
  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    setDraft((current) =>
      current.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
        ? current
        : { ...current, tags: [...current.tags, tag] },
    );
    setTagText('');
  };

  // ----- cover ----------------------------------------------------------------
  const handleCoverFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      set('coverImageUrl', await fileToCoverDataUrl(file));
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not process image', {
        kind: 'error',
      });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // ----- autocomplete sources -------------------------------------------------
  const lists = useMemo(
    () => ({
      authors: distinctValues(books, (b) => b.author).slice(0, 60),
      publishers: distinctValues(books, (b) => b.publisher).slice(0, 60),
      languages: distinctValues(books, (b) => b.language).slice(0, 30),
      categories: distinctValues(books, (b) => b.category).slice(0, 60),
      subcategories: distinctValues(books, (b) => b.subcategory).slice(0, 60),
      rooms: distinctValues(books, (b) => b.room).slice(0, 30),
      shelves: distinctValues(books, (b) => b.shelf).slice(0, 60),
      sources: distinctValues(books, (b) => b.purchaseSource).slice(0, 60),
    }),
    [books],
  );

  // ----- submit ----------------------------------------------------------------
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const input = toInput(draft);
    const result = validateBookInput(input);
    if (!result.ok) {
      setErrors(result.issues);
      toast('Please fix the highlighted fields.', { kind: 'error' });
      window.setTimeout(() => {
        document
          .querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus({ preventScroll: false });
      }, 30);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const saved = await onSubmit(result.value);
      cleanRef.current = JSON.stringify(draft);
      onSaved(saved);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not save the book', {
        kind: 'error',
      });
      setSaving(false);
    }
  };

  const fieldset = 'card grid gap-4 px-5 pb-5 pt-3 sm:grid-cols-2';
  const legend = 'mb-1 font-display text-base font-semibold text-ink';

  return (
    <form onSubmit={(event) => void handleSubmit(event)} noValidate className="flex flex-col gap-5">
      {duplicates.length > 0 && (
        <div
          role="alert"
          className="rounded-card border border-gilt/40 bg-gilt/10 px-4 py-3 text-sm"
        >
          <p className="font-semibold text-ink">
            This might already be in your library:
          </p>
          <ul className="mt-1 space-y-0.5">
            {duplicates.map(({ book, reason }) => (
              <li key={book.id}>
                <Link to={`/books/${book.id}`} className="text-accent-ink underline">
                  {book.title}
                </Link>{' '}
                <span className="text-muted">
                  ({reason === 'title-author' ? 'same title & author' : `same ${reason.toUpperCase()}`})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <fieldset className={fieldset}>
        <legend className={legend}>Identify by ISBN</legend>
        <Input
          label="ISBN-13"
          value={draft.isbn13}
          onChange={(event) => set('isbn13', event.target.value)}
          error={errors.isbn13}
          placeholder="9780…"
          inputMode="numeric"
          autoComplete="off"
          className="font-mono"
        />
        <Input
          label="ISBN-10"
          value={draft.isbn10}
          onChange={(event) => set('isbn10', event.target.value)}
          error={errors.isbn10}
          inputMode="text"
          autoComplete="off"
          className="font-mono"
        />
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <Button icon={<ScanLine size={15} />} onClick={() => setScannerOpen(true)}>
            Scan barcode
          </Button>
          <Button
            icon={<Search size={15} />}
            loading={lookupBusy}
            onClick={() => void runLookup()}
          >
            Look up details
          </Button>
          {lookupNote && (
            <p className="flex items-center gap-1.5 text-xs text-muted" role="status">
              <Sparkles size={13} aria-hidden="true" className="text-accent" />
              {lookupNote}
            </p>
          )}
        </div>
      </fieldset>

      <fieldset className={fieldset}>
        <legend className={legend}>Title & people</legend>
        <Input
          label="Title *"
          value={draft.title}
          onChange={(event) => set('title', event.target.value)}
          error={errors.title}
          className="sm:col-span-2"
          autoComplete="off"
        />
        <Input
          label="Subtitle"
          value={draft.subtitle}
          onChange={(event) => set('subtitle', event.target.value)}
          error={errors.subtitle}
          className="sm:col-span-2"
        />
        <Input
          label="Author"
          value={draft.author}
          onChange={(event) => set('author', event.target.value)}
          error={errors.author}
          list="plm-authors"
        />
        <Input
          label="Co-authors"
          value={draft.coAuthors}
          onChange={(event) => set('coAuthors', event.target.value)}
          error={errors.coAuthors}
          hint="Separate several names with commas"
        />
        <Input
          label="Translator"
          value={draft.translator}
          onChange={(event) => set('translator', event.target.value)}
        />
        <Input
          label="Editor"
          value={draft.editor}
          onChange={(event) => set('editor', event.target.value)}
        />
      </fieldset>

      <fieldset className={fieldset}>
        <legend className={legend}>Publication</legend>
        <Input
          label="Publisher"
          value={draft.publisher}
          onChange={(event) => set('publisher', event.target.value)}
          list="plm-publishers"
        />
        <Input
          label="Edition"
          value={draft.edition}
          onChange={(event) => set('edition', event.target.value)}
          placeholder="e.g. 2nd edition"
        />
        <Input
          label="Publication year"
          value={draft.publicationYear}
          onChange={(event) => set('publicationYear', event.target.value)}
          error={errors.publicationYear}
          inputMode="numeric"
          placeholder="2021"
        />
        <Input
          label="Printed date"
          value={draft.printedDate}
          onChange={(event) => set('printedDate', event.target.value)}
          hint="As printed in the book, e.g. “3rd printing 2019”"
        />
        <Input
          label="Language"
          value={draft.language}
          onChange={(event) => set('language', event.target.value)}
          list="plm-languages"
        />
        <Input
          label="Pages"
          value={draft.pages}
          onChange={(event) => set('pages', event.target.value)}
          error={errors.pages}
          inputMode="numeric"
        />
      </fieldset>

      <fieldset className={fieldset}>
        <legend className={legend}>Classification</legend>
        <Input
          label="Category"
          value={draft.category}
          onChange={(event) => set('category', event.target.value)}
          list="plm-categories"
        />
        <Input
          label="Subcategory"
          value={draft.subcategory}
          onChange={(event) => set('subcategory', event.target.value)}
          list="plm-subcategories"
        />
        <div className="sm:col-span-2">
          <Input
            label="Tags"
            value={tagText}
            onChange={(event) => setTagText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                addTag(tagText);
              }
            }}
            onBlur={() => addTag(tagText)}
            error={errors.tags}
            hint="Press Enter to add each tag"
            placeholder="poetry, gift, signed copy…"
            trailing={
              <Button
                size="sm"
                variant="ghost"
                aria-label="Add tag"
                icon={<Plus size={14} />}
                onClick={() => addTag(tagText)}
              />
            }
          />
          {(draft.tags.length > 0 || suggestedTags.length > 0) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {draft.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-ink"
                >
                  {tag}
                  <button
                    type="button"
                    aria-label={`Remove tag ${tag}`}
                    className="rounded-full hover:text-ink"
                    onClick={() =>
                      set('tags', draft.tags.filter((t) => t !== tag))
                    }
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              {suggestedTags
                .filter((tag) => !draft.tags.some((t) => t.toLowerCase() === tag))
                .map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent-ink"
                  >
                    <Plus size={11} aria-hidden="true" /> {tag}
                  </button>
                ))}
            </div>
          )}
        </div>
      </fieldset>

      <fieldset className={fieldset}>
        <legend className={legend}>Purchase & status</legend>
        <Input
          label="Price (NPR)"
          value={draft.priceNpr}
          onChange={(event) => set('priceNpr', event.target.value)}
          error={errors.priceNpr}
          inputMode="numeric"
          placeholder="450"
        />
        <Input
          label="Purchase date"
          type="date"
          value={draft.purchaseDate}
          onChange={(event) => set('purchaseDate', event.target.value)}
          error={errors.purchaseDate}
        />
        <Input
          label="Purchase source"
          value={draft.purchaseSource}
          onChange={(event) => set('purchaseSource', event.target.value)}
          list="plm-sources"
          placeholder="Shop, website, gift…"
        />
        <Select
          label="Status"
          value={draft.status}
          onChange={(event) => set('status', event.target.value as Draft['status'])}
        >
          {BOOK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
        <Select
          label="Reading status"
          value={draft.readingStatus}
          onChange={(event) =>
            set('readingStatus', event.target.value as Draft['readingStatus'])
          }
        >
          {READING_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
        <Select
          label="Condition"
          value={draft.condition}
          onChange={(event) => set('condition', event.target.value as Draft['condition'])}
        >
          <option value="">Not noted</option>
          {CONDITIONS.map((condition) => (
            <option key={condition} value={condition}>
              {condition}
            </option>
          ))}
        </Select>
      </fieldset>

      <fieldset className={fieldset}>
        <legend className={legend}>Location & record</legend>
        <Input
          label="Room"
          value={draft.room}
          onChange={(event) => set('room', event.target.value)}
          list="plm-rooms"
          placeholder="Study"
        />
        <Input
          label="Shelf"
          value={draft.shelf}
          onChange={(event) => set('shelf', event.target.value)}
          list="plm-shelves"
          placeholder="A3"
        />
        <Input
          label="Serial number"
          value={draft.serialNumber}
          onChange={(event) => set('serialNumber', event.target.value)}
          error={errors.serialNumber}
          hint={initial ? undefined : 'Suggested automatically — edit freely'}
          className="font-mono"
        />
        <div className="flex items-end pb-1">
          <Switch
            checked={draft.favorite}
            onChange={(value) => set('favorite', value)}
            label="Favorite"
          />
        </div>
      </fieldset>

      <fieldset className={fieldset}>
        <legend className={legend}>Cover & notes</legend>
        <div className="flex gap-4 sm:col-span-2">
          <div className="h-40 w-28 shrink-0 overflow-hidden rounded-md border border-line bg-sunken">
            <CoverImage
              book={{
                title: draft.title,
                author: draft.author,
                coverImageUrl: draft.coverImageUrl,
              }}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <Input
              label="Cover image URL"
              value={draft.coverImageUrl}
              onChange={(event) => set('coverImageUrl', event.target.value)}
              error={errors.coverImageUrl}
              placeholder="https://…"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                icon={<ImagePlus size={14} />}
                onClick={() => fileRef.current?.click()}
              >
                Upload photo
              </Button>
              <Button
                size="sm"
                disabled={!draft.isbn13.trim()}
                onClick={() => set('coverImageUrl', openLibraryCoverUrl(draft.isbn13.trim()))}
              >
                Fetch by ISBN
              </Button>
              {draft.coverImageUrl && (
                <Button size="sm" variant="ghost" onClick={() => set('coverImageUrl', '')}>
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-faint">
              Uploads are resized on your device and stored inside the record, so covers
              work offline.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="Upload cover photo"
              onChange={(event) => void handleCoverFile(event.target.files?.[0])}
            />
          </div>
        </div>
        <Textarea
          label="Notes"
          value={draft.notes}
          onChange={(event) => set('notes', event.target.value)}
          error={errors.notes}
          className="sm:col-span-2"
          placeholder="Inscriptions, provenance, thoughts…"
        />
        <Input
          label="Barcode (as scanned)"
          value={draft.barcode}
          onChange={(event) => set('barcode', event.target.value)}
          className="font-mono"
        />
        <Input
          label="QR label payload"
          value={draft.qrCode}
          onChange={(event) => set('qrCode', event.target.value)}
          hint="Left empty, the book’s ID is used on printed labels"
          className="font-mono"
        />
      </fieldset>

      <fieldset className={fieldset}>
        <legend className={legend}>Lending</legend>
        <Input
          label="Borrowed to"
          value={draft.borrowedTo}
          onChange={(event) => set('borrowedTo', event.target.value)}
        />
        <Input
          label="Borrow date"
          type="date"
          value={draft.borrowDate}
          onChange={(event) => set('borrowDate', event.target.value)}
          error={errors.borrowDate}
        />
        <Input
          label="Return date"
          type="date"
          value={draft.returnDate}
          onChange={(event) => set('returnDate', event.target.value)}
          error={errors.returnDate}
        />
      </fieldset>

      <div className="sticky bottom-0 -mx-1 flex justify-end gap-2 border-t border-line bg-page/95 px-1 py-3 backdrop-blur">
        <Button onClick={() => history.back()}>Cancel</Button>
        <Button type="submit" variant="primary" loading={saving}>
          {initial ? 'Save changes' : 'Add to library'}
        </Button>
      </div>

      <datalist id="plm-authors">{lists.authors.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="plm-publishers">{lists.publishers.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="plm-languages">{lists.languages.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="plm-categories">{lists.categories.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="plm-subcategories">{lists.subcategories.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="plm-rooms">{lists.rooms.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="plm-shelves">{lists.shelves.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="plm-sources">{lists.sources.map((v) => <option key={v} value={v} />)}</datalist>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetect={handleScan}
      />

      {blocker.state === 'blocked' && (
        <Modal
          open
          onClose={() => blocker.reset?.()}
          title="Discard changes?"
          size="sm"
          footer={
            <>
              <Button onClick={() => blocker.reset?.()}>Keep editing</Button>
              <Button variant="danger" onClick={() => blocker.proceed?.()}>
                Discard
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted">
            You have unsaved changes on this book. Leaving now will discard them.
          </p>
        </Modal>
      )}
    </form>
  );
}
