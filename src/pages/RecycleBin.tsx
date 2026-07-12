import { Trash2, Undo2 } from 'lucide-react';
import { useLibrary } from '@/state/LibraryContext';
import { library } from '@/data/libraryService';
import { daysSince, fmtDate } from '@/lib/format';
import { SpineMark } from '@/components/books/SpineMark';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

const RETENTION_DAYS = 30;

export default function RecycleBin() {
  const { deletedBooks } = useLibrary();
  const { confirm, confirmDialog } = useConfirm();
  const toast = useToast();

  const purgeOne = async (id: string, title: string) => {
    const ok = await confirm({
      title: 'Delete forever?',
      message: `“${title}” will be removed permanently from this device and, on next sync, from your Google Sheet. This cannot be undone.`,
      confirmLabel: 'Delete forever',
      tone: 'danger',
    });
    if (!ok) return;
    await library.purge(id);
    toast('Deleted permanently.', { kind: 'info' });
  };

  const emptyBin = async () => {
    const ok = await confirm({
      title: `Empty the bin (${deletedBooks.length})?`,
      message:
        'All books in the bin will be removed permanently. Your Drive backups still hold older copies.',
      confirmLabel: 'Empty bin',
      tone: 'danger',
    });
    if (!ok) return;
    const count = await library.emptyBin();
    toast(`Removed ${count} book${count === 1 ? '' : 's'} permanently.`, { kind: 'info' });
  };

  return (
    <div className="flex animate-fade-in flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">Recycle bin</h1>
          <p className="mt-1 text-sm text-muted">
            Deleted books stay here for {RETENTION_DAYS} days before being removed for
            good.
          </p>
        </div>
        {deletedBooks.length > 0 && (
          <Button
            variant="danger"
            icon={<Trash2 size={15} />}
            onClick={() => void emptyBin()}
          >
            Empty bin
          </Button>
        )}
      </header>

      {deletedBooks.length === 0 ? (
        <EmptyState
          icon={<Trash2 size={36} strokeWidth={1.5} />}
          title="The bin is empty"
          description="Deleted books will wait here for 30 days in case you change your mind."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {deletedBooks.map((book) => {
            const daysLeft = Math.max(
              0,
              RETENTION_DAYS - daysSince(book.deletedAt ?? ''),
            );
            return (
              <li
                key={book.id}
                className="card flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <SpineMark title={book.title} className="h-9" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{book.title}</p>
                  <p className="truncate text-xs text-muted">
                    {book.author && `${book.author} · `}deleted{' '}
                    {fmtDate(book.deletedAt)} · purges in {daysLeft} day
                    {daysLeft === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    icon={<Undo2 size={14} />}
                    onClick={() => void library.restore(book.id)}
                  >
                    Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger hover:bg-danger-soft"
                    onClick={() => void purgeOne(book.id, book.title)}
                  >
                    Delete forever
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {confirmDialog}
    </div>
  );
}
