import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Copy,
  Handshake,
  MoreHorizontal,
  Pencil,
  Printer,
  Star,
  Trash2,
  Undo2,
} from 'lucide-react';
import { useBook, useLibrary } from '@/state/LibraryContext';
import { library } from '@/data/libraryService';
import { bookToInput, isDeleted, type BookStatus } from '@/types/book';
import { daysSince, fmtDate, fmtNpr, todayIso } from '@/lib/format';
import { CoverImage } from '@/components/books/CoverImage';
import { SpineMark } from '@/components/books/SpineMark';
import { LendDialog } from '@/components/books/LendDialog';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Menu } from '@/components/ui/Menu';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';

const statusTone: Record<BookStatus, BadgeTone> = {
  owned: 'neutral',
  wishlist: 'accent',
  lent: 'gilt',
  lost: 'danger',
  donated: 'neutral',
};

function Row({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  if (value === null || value === undefined || value === '' || value === '—') return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className={mono ? 'font-mono text-[13px] text-ink' : 'text-right text-ink'}>
        {value}
      </dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card px-5 py-4">
      <h2 className="mb-2 font-display text-base font-semibold text-ink">{title}</h2>
      <dl className="divide-y divide-line/70">{children}</dl>
    </section>
  );
}

export default function BookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { ready } = useLibrary();
  const book = useBook(id);
  const [lendOpen, setLendOpen] = useState(false);
  const { confirm, confirmDialog } = useConfirm();

  if (!ready) {
    return (
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]" aria-busy="true">
        <Skeleton className="aspect-[2/3]" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <EmptyState
        title="Book not found"
        description="It may have been permanently removed, or the link is out of date."
        action={<Button onClick={() => navigate('/books')}>Back to books</Button>}
      />
    );
  }

  const save = async (patch: Partial<ReturnType<typeof bookToInput>>, message: string) => {
    try {
      await library.save({ ...bookToInput(book), ...patch }, book);
      if (message) toast(message, { kind: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not save', { kind: 'error' });
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Move to recycle bin?',
      message: `“${book.title}” will be kept in the bin for 30 days, then removed permanently. You can restore it any time before that.`,
      confirmLabel: 'Move to bin',
      tone: 'danger',
    });
    if (!confirmed) return;
    await library.softDelete(book.id);
    toast('Moved to the recycle bin.', {
      kind: 'info',
      action: { label: 'Undo', onClick: () => void library.restore(book.id) },
    });
    navigate('/books');
  };

  const overdue =
    book.status === 'lent' && book.borrowDate && daysSince(book.borrowDate) > 30;

  return (
    <div className="flex animate-fade-in flex-col gap-5">
      <div className="no-print">
        <Link
          to="/books"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
        >
          <ArrowLeft size={15} aria-hidden="true" /> Books
        </Link>
      </div>

      {isDeleted(book) && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-danger/40 bg-danger-soft/60 px-4 py-3 text-sm"
        >
          <p className="text-ink">
            This book is in the recycle bin (deleted {fmtDate(book.deletedAt)}).
          </p>
          <Button
            size="sm"
            icon={<Undo2 size={14} />}
            onClick={() => void library.restore(book.id)}
          >
            Restore
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="mx-auto w-48 lg:w-full">
          <div className="aspect-[2/3] overflow-hidden rounded-lg border border-line bg-sunken shadow-card">
            <CoverImage book={book} />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <header className="flex items-start gap-3">
            <SpineMark title={book.title} className="mt-1.5 h-14" />
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl font-semibold leading-tight text-ink sm:text-3xl">
                {book.title}
              </h1>
              {book.subtitle && <p className="mt-1 text-muted">{book.subtitle}</p>}
              <p className="mt-1.5 text-sm text-muted">
                {book.author && <>by <span className="text-ink">{book.author}</span></>}
                {book.coAuthors && <> · with {book.coAuthors}</>}
                {book.translator && <> · translated by {book.translator}</>}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <Badge tone={statusTone[book.status]}>{book.status}</Badge>
                <Badge tone={book.readingStatus === 'finished' ? 'ok' : 'neutral'}>
                  {book.readingStatus}
                </Badge>
                {book.condition && <Badge>{book.condition}</Badge>}
                {overdue && <Badge tone="danger">overdue loan</Badge>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void save({ favorite: !book.favorite }, '')}
              aria-pressed={book.favorite}
              aria-label={book.favorite ? 'Remove from favorites' : 'Add to favorites'}
              className="rounded-full p-2 text-muted transition-colors hover:bg-sunken hover:text-gilt"
            >
              <Star
                size={20}
                className={book.favorite ? 'text-gilt' : undefined}
                fill={book.favorite ? 'currentColor' : 'none'}
              />
            </button>
          </header>

          <div className="no-print flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              icon={<Pencil size={15} />}
              onClick={() => navigate(`/books/${book.id}/edit`)}
            >
              Edit
            </Button>
            {book.status === 'lent' ? (
              <Button
                icon={<Undo2 size={15} />}
                onClick={() =>
                  void save(
                    { status: 'owned', returnDate: todayIso() },
                    `Welcome back, “${book.title}”.`,
                  )
                }
              >
                Mark returned
              </Button>
            ) : (
              <Button icon={<Handshake size={15} />} onClick={() => setLendOpen(true)}>
                Lend
              </Button>
            )}
            <Menu
              label="More"
              icon={<MoreHorizontal size={15} />}
              items={[
                {
                  label: 'Add another copy',
                  icon: <Copy size={15} />,
                  onSelect: () => navigate(`/books/new?copyOf=${book.id}`),
                },
                {
                  label: 'Print spine label',
                  icon: <Printer size={15} />,
                  onSelect: () => navigate(`/books/${book.id}/label`),
                },
                {
                  label: 'Move to recycle bin',
                  icon: <Trash2 size={15} />,
                  danger: true,
                  onSelect: () => void handleDelete(),
                },
              ]}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Section title="Publication">
              <Row label="Publisher" value={book.publisher} />
              <Row label="Edition" value={book.edition} />
              <Row label="Published" value={book.publicationYear ?? ''} />
              <Row label="Printed" value={book.printedDate} />
              <Row label="Language" value={book.language} />
              <Row label="Pages" value={book.pages ?? ''} />
              <Row label="ISBN-13" value={book.isbn13} mono />
              <Row label="ISBN-10" value={book.isbn10} mono />
              <Row label="Barcode" value={book.barcode} mono />
              <Row label="Editor" value={book.editor} />
            </Section>

            <Section title="Purchase">
              <Row label="Price" value={book.priceNpr !== null ? fmtNpr(book.priceNpr) : ''} />
              <Row label="Bought" value={book.purchaseDate ? fmtDate(book.purchaseDate) : ''} />
              <Row label="From" value={book.purchaseSource} />
            </Section>

            <Section title="Classification & place">
              <Row label="Category" value={book.category} />
              <Row label="Subcategory" value={book.subcategory} />
              <Row label="Room" value={book.room} />
              <Row label="Shelf" value={book.shelf} />
              <Row
                label="Tags"
                value={
                  book.tags.length > 0 ? (
                    <span className="flex flex-wrap justify-end gap-1">
                      {book.tags.map((tag) => (
                        <Link
                          key={tag}
                          to={`/books?tag=${encodeURIComponent(tag)}`}
                          className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-ink hover:underline"
                        >
                          {tag}
                        </Link>
                      ))}
                    </span>
                  ) : (
                    ''
                  )
                }
              />
            </Section>

            <Section title="Record">
              <Row label="Serial" value={book.serialNumber} mono />
              {book.status === 'lent' && (
                <>
                  <Row label="Borrowed by" value={book.borrowedTo} />
                  <Row
                    label="Since"
                    value={book.borrowDate ? fmtDate(book.borrowDate) : ''}
                  />
                </>
              )}
              {book.returnDate && (
                <Row label="Last returned" value={fmtDate(book.returnDate)} />
              )}
              <Row label="Added" value={fmtDate(book.createdAt)} />
              <Row label="Updated" value={fmtDate(book.updatedAt)} />
            </Section>
          </div>

          {book.notes && (
            <section className="card px-5 py-4">
              <h2 className="mb-2 font-display text-base font-semibold text-ink">Notes</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                {book.notes}
              </p>
            </section>
          )}
        </div>
      </div>

      <LendDialog book={book} open={lendOpen} onClose={() => setLendOpen(false)} />
      {confirmDialog}
    </div>
  );
}
