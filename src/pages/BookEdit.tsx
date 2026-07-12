import { useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useBook, useLibrary } from '@/state/LibraryContext';
import { library } from '@/data/libraryService';
import { bookToInput, type Book, type BookInput } from '@/types/book';
import { BookForm } from '@/components/books/BookForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

function nextSerial(books: Book[]): string {
  let max = 0;
  for (const book of books) {
    const n = parseInt(book.serialNumber, 10);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return String(max + 1).padStart(4, '0');
}

export default function BookEdit() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { allBooks, ready } = useLibrary();

  const editing = useBook(id);
  const copySource = useBook(params.get('copyOf') ?? undefined);
  const serial = useMemo(() => nextSerial(allBooks), [allBooks]);

  const template = useMemo<BookInput | undefined>(() => {
    if (!copySource) return undefined;
    return {
      ...bookToInput(copySource),
      serialNumber: '',
      status: 'owned',
      borrowedTo: '',
      borrowDate: '',
      returnDate: '',
      qrCode: '',
    };
  }, [copySource]);

  if (id && !ready) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (id && ready && !editing) {
    return (
      <EmptyState
        title="Book not found"
        description="It may have been permanently removed."
        action={<Button onClick={() => navigate('/books')}>Back to books</Button>}
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl animate-fade-in flex-col gap-5">
      <div>
        <Link
          to={editing ? `/books/${editing.id}` : '/books'}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
        >
          <ArrowLeft size={15} aria-hidden="true" /> {editing ? editing.title : 'Books'}
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
          {editing ? 'Edit book' : copySource ? 'Add another copy' : 'Add a book'}
        </h1>
        {!editing && (
          <p className="mt-1 text-sm text-muted">
            Scan the barcode or type an ISBN and let the catalogue fill itself in.
          </p>
        )}
      </div>

      <BookForm
        key={editing?.id ?? (copySource ? `copy-${copySource.id}` : 'new')}
        initial={editing}
        template={template}
        nextSerial={serial}
        openScannerOnMount={params.get('scan') === '1'}
        onSubmit={(input) => library.save(input, editing)}
        onSaved={(book) => {
          toast(editing ? 'Changes saved.' : `“${book.title}” added to your library.`, {
            kind: 'success',
          });
          navigate(`/books/${book.id}`, { replace: true });
        }}
      />
    </div>
  );
}
