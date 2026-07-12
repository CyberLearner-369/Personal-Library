import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useBook, useLibrary } from '@/state/LibraryContext';
import { Button } from '@/components/ui/Button';

/** Printable spine/shelf label (~62×29 mm) with a QR code of the book id. */
export default function BookLabel() {
  const { id } = useParams();
  const { ready } = useLibrary();
  const book = useBook(id);
  const [qrUrl, setQrUrl] = useState('');
  const printedRef = useRef(false);

  useEffect(() => {
    if (!book) return;
    let cancelled = false;
    void (async () => {
      try {
        const { toDataURL } = await import('qrcode');
        const url = await toDataURL(book.qrCode || book.id, {
          margin: 0,
          width: 240,
          errorCorrectionLevel: 'M',
        });
        if (!cancelled) setQrUrl(url);
      } catch {
        if (!cancelled) setQrUrl('');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [book]);

  useEffect(() => {
    if (!qrUrl || printedRef.current) return;
    printedRef.current = true;
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [qrUrl]);

  if (!ready) return <p className="p-6 text-sm text-muted">Preparing label…</p>;
  if (!book) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted">Book not found.</p>
        <Link to="/books" className="text-sm text-accent-ink underline">
          Back to books
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-white p-8 text-black">
      <div className="no-print flex gap-2">
        <Link to={`/books/${book.id}`}>
          <Button>← Back to book</Button>
        </Link>
        <Button variant="primary" onClick={() => window.print()}>
          Print label
        </Button>
      </div>

      <div
        className="flex items-center gap-3 border border-black p-2"
        style={{ width: '62mm', height: '29mm' }}
      >
        {qrUrl ? (
          <img
            src={qrUrl}
            alt={`QR code for ${book.title}`}
            style={{ width: '22mm', height: '22mm' }}
          />
        ) : (
          <div
            aria-hidden="true"
            style={{ width: '22mm', height: '22mm' }}
            className="bg-black/10"
          />
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <p className="font-mono text-base font-bold">{book.serialNumber || '—'}</p>
          <p className="line-clamp-2 text-[10px] font-semibold">{book.title}</p>
          <p className="line-clamp-1 text-[9px]">{book.author}</p>
          <p className="line-clamp-1 text-[9px]">
            {[book.room, book.shelf].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
      <p className="no-print max-w-sm text-center text-xs text-black/60">
        Sized for 62×29 mm label rolls; in the print dialog choose the label paper size or
        scale to fit.
      </p>
    </div>
  );
}
