import { useMemo, useRef, useState } from 'react';
import { FileUp } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/components/ui/Toast';
import { useLibrary } from '@/state/LibraryContext';
import { library } from '@/data/libraryService';
import { booksToCsv, csvToBookRows, downloadFile, type CsvImportResult } from '@/lib/csv';
import { findDuplicates } from '@/lib/duplicates';

/**
 * CSV import: parse → preview (row errors, unknown headers, duplicates) →
 * import. Bad rows never block good ones, and duplicates against the
 * existing library are skippable with one switch.
 */
export function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const { books } = useLibrary();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importing, setImporting] = useState(false);

  const duplicateRows = useMemo(() => {
    if (!result) return new Set<number>();
    const set = new Set<number>();
    for (const row of result.rows) {
      if (row.errors.length > 0) continue;
      if (findDuplicates(row.input, books).length > 0) set.add(row.rowNumber);
    }
    return set;
  }, [result, books]);

  const importable = useMemo(() => {
    if (!result) return [];
    return result.rows.filter(
      (row) =>
        row.errors.length === 0 &&
        (!skipDuplicates || !duplicateRows.has(row.rowNumber)),
    );
  }, [result, skipDuplicates, duplicateRows]);

  const reset = () => {
    setFileName('');
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      setFileName(file.name);
      setResult(csvToBookRows(text));
    } catch {
      toast('Could not read that file.', { kind: 'error' });
    }
  };

  const runImport = async () => {
    setImporting(true);
    try {
      const count = await library.importBooks(importable.map((row) => row.input));
      toast(`Imported ${count} book${count === 1 ? '' : 's'}.`, { kind: 'success' });
      reset();
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Import failed', { kind: 'error' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Import from CSV"
      footer={
        result ? (
          <>
            <Button onClick={reset}>Choose another file</Button>
            <Button
              variant="primary"
              loading={importing}
              disabled={importable.length === 0}
              onClick={() => void runImport()}
            >
              Import {importable.length} book{importable.length === 1 ? '' : 's'}
            </Button>
          </>
        ) : undefined
      }
    >
      {!result && (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <FileUp size={32} className="text-faint" aria-hidden="true" />
          <p className="text-sm text-muted">
            Use a CSV exported from this app, or any file with a{' '}
            <span className="font-medium text-ink">Title</span> column. Column names are
            matched flexibly.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="primary" onClick={() => fileRef.current?.click()}>
              Choose CSV file
            </Button>
            <Button
              onClick={() =>
                downloadFile('library-template.csv', booksToCsv([]), 'text/csv;charset=utf-8')
              }
            >
              Download template
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            aria-label="Choose CSV file"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink">
            <span className="font-semibold">{fileName}</span> — {result.rows.length} row
            {result.rows.length === 1 ? '' : 's'} found.
          </p>

          {result.rows.length === 0 && (
            <p className="text-sm text-danger">
              No importable rows. Make sure the file has a header row including a Title
              column.
            </p>
          )}

          {result.unknownHeaders.length > 0 && (
            <p className="text-xs text-muted">
              Ignored columns: {result.unknownHeaders.join(', ')}
            </p>
          )}

          {result.errorCount > 0 && (
            <div className="rounded-lg border border-danger/40 bg-danger-soft/50 px-3 py-2 text-xs text-ink">
              <p className="font-semibold text-danger">
                {result.errorCount} row{result.errorCount === 1 ? '' : 's'} will be
                skipped:
              </p>
              <ul className="mt-1 list-inside list-disc">
                {result.rows
                  .filter((row) => row.errors.length > 0)
                  .slice(0, 5)
                  .map((row) => (
                    <li key={row.rowNumber}>
                      Row {row.rowNumber}: {row.errors.join('; ')}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {duplicateRows.size > 0 && (
            <Switch
              checked={skipDuplicates}
              onChange={setSkipDuplicates}
              label={`Skip ${duplicateRows.size} likely duplicate${duplicateRows.size === 1 ? '' : 's'}`}
              description="Matched against your library by ISBN or title + author."
            />
          )}
        </div>
      )}
    </Modal>
  );
}
