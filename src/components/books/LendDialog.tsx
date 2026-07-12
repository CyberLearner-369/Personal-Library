import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { bookToInput, type Book } from '@/types/book';
import { library } from '@/data/libraryService';
import { todayIso } from '@/lib/format';

export function LendDialog({
  book,
  open,
  onClose,
}: {
  book: Book;
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [date, setDate] = useState(todayIso());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setDate(todayIso());
    }
  }, [open]);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await library.save(
        {
          ...bookToInput(book),
          status: 'lent',
          borrowedTo: name.trim(),
          borrowDate: date,
          returnDate: '',
        },
        book,
      );
      toast(`Lent “${book.title}” to ${name.trim()}`, { kind: 'success' });
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not save', {
        kind: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Lend this book"
      size="sm"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={saving}
            disabled={!name.trim()}
            onClick={() => void submit()}
          >
            Mark as lent
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Borrowed by"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name of the borrower"
          autoComplete="off"
        />
        <Input
          label="Borrow date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <p className="text-xs text-faint">
          The book stays in your catalogue with a “lent” badge. You’ll see a reminder on
          the dashboard if it’s out for more than 30 days.
        </p>
      </div>
    </Modal>
  );
}
